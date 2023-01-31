'use strict';

const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const utils = require('./js-core/utils');
utils.reloadEnv(dotenv, fs, path);
console.log(`load envs MGMT_PASSWORD=${'*'.repeat(process.env.MGMT_PASSWORD?.length)}`);

const Koa = require('koa');
const Router = require('koa-router');
const Cors = require('koa2-cors');
const BodyParser = require('koa-bodyparser');
const token = require('./token');
const pkg = require('./package.json');
const thread = require('./thread');
const system = require('./system');
const platform = require('./platform');
const staticCache = require('koa-static-cache');
const serve = require('koa-static');
const mount = require('koa-mount');
const loadbalance = require('./loadbalance');
const hooks = require('./hooks');
const ffmpeg = require('./ffmpeg');
const tencent = require('./tencent');

const app = new Koa();

app.use(Cors());

const mgmtHome = path.join(__dirname, 'ui/build', process.env.REACT_APP_LOCALE || 'zh');
utils.srsProxy(
    staticCache,
    app,
    mgmtHome,
    '/mgmt/',
    ['/mgmt/index.html'],
    { '/mgmt/': '/mgmt/index.html' },
);
console.log(`serve mgmt at ${mgmtHome}`);

app.use(async (ctx, next) => {
    const isPreviousReactRoutes = [
        '/mgmt/login',
        '/mgmt/dashboard',
        '/mgmt/scenario',
        '/mgmt/config',
        '/mgmt/system',
        '/mgmt/logout',
    ].includes(ctx.request.path);

    if (isPreviousReactRoutes || ctx.request.path?.match(/\/mgmt.*\/routers-/)) {
        ctx.type = 'text/html';
        ctx.set('Cache-Control', 'public, max-age=0');
        ctx.body = fs.readFileSync(path.join(mgmtHome, 'index.html'));
        return;
    }

    await next();
});

if (process.env.SRS_HTTPS !== 'off') {
    app.use(
        mount(
            '/.well-known/acme-challenge/',
            serve('./containers/www/.well-known/acme-challenge/'),
        ),
    );
}

app.use(async (ctx, next) => {
    if (ctx.request.path === '/') return ctx.response.redirect('/mgmt/');
    if (ctx.request.path === '/mgmt') return ctx.response.redirect('/mgmt/');
    if (ctx.request.path === '/index.html') return ctx.response.redirect('/mgmt/');
    await next();
});

app.use(BodyParser());

app.use(async (ctx, next) => {
    try {
        await next();
    } catch (e) {
        ctx.status = e.status || 500;
        ctx.body = utils.asResponse(e.code || 1, {
            message: e.message || e.err?.message || 'unknown error',
        });
        console.error(e);
    }
});

const router = new Router();

loadbalance.handle(token.handle(system.handle(router)));
hooks.handle(router);
ffmpeg.handle(router);
tencent.handle(router);


router.all('/terraform/v1/mgmt/versions', async (ctx) => {
    ctx.body = utils.asResponse(0, { version: pkg.version });
});

app.use(router.routes());

///////////////////////////////////////////////////////////////////////////////////////////
const run = async () => {
    await platform.init();
    console.log(`Run with cwd=${process.cwd()}`);

    thread.run();
    hooks.run();
    ffmpeg.run();
    tencent.run();

    app.listen(8024, () => {
        console.log(`Server start on http://localhost:8024`);
    });
};
run();

