'use strict';

const path = require('path');
const utils = require('./js-core/utils');
console.log(`load envs MGMT_PASSWORD=${'*'.repeat(process.env.MGMT_PASSWORD?.length)}`);

const Koa = require('koa');
const proxy = require('koa-proxies');
const Router = require('koa-router');
const Cors = require('koa2-cors');
const BodyParser = require('koa-bodyparser');
const serve = require('koa-static');
const mount = require('koa-mount');
const system = require('./system');
const pkg = require('./package.json');
const staticCache = require('koa-static-cache');
const platform = require('./platform');
const rewrite = require('./rewrite');
const metadata = require('./metadata');

const app = new Koa();

app.use(Cors());

function withLogs(options) {
    return {
        ...options,
        logs: (ctx, target) => {
            const r = new URL(ctx.req.url, target);
            console.log('%s - %s %s proxy to -> %s', new Date().toISOString(), ctx.req.method, ctx.req.oldPath, r);
        },
    };
}

const SRS_SERVER_HOST = process.env.SRS_SERVER_HOST;
const TERRAFORM_HOST = process.env.TERRAFORM_HOST;
const TERRAFORM_PORT = process.env.TERRAFORM_PORT;
const PROMETHEUS_HOST = process.env.PROMETHEUS_HOST;
const PROMETHEUS_PORT = process.env.PROMETHEUS_PORT;

app.use(proxy('/prometheus', withLogs({ target: `http://${PROMETHEUS_HOST}:${PROMETHEUS_PORT}/` })));

utils.srsProxy(staticCache, app, path.join(__dirname, 'containers/www/console/'), '/console/');
utils.srsProxy(staticCache, app, path.join(__dirname, 'containers/www/players/'), '/players/');
utils.srsProxy(staticCache, app, path.join(__dirname, 'containers/www/tools/'), '/tools/', [
    '/tools/player.html',
    '/tools/xgplayer.html',
]);

app.use(proxy('/terraform/v1/tencent/', withLogs({ target: `http://${TERRAFORM_HOST}:${TERRAFORM_PORT}/` })));

app.use(proxy('/terraform/v1/ffmpeg/', withLogs({ target: `http://${TERRAFORM_HOST}:${TERRAFORM_PORT}/` })));

app.use(proxy('/terraform/v1/mgmt/', withLogs({ target: `http://${TERRAFORM_HOST}:${TERRAFORM_PORT}/` })));
// The UI proxy to platform UI, system mgmt UI.
app.use(proxy('/mgmt/', withLogs({ target: `http://${TERRAFORM_HOST}:${TERRAFORM_PORT}/` })));
// For automatic HTTPS by letsencrypt, for certbot to verify the domain.
app.use(proxy('/.well-known/acme-challenge/', withLogs({ target: `http://${TERRAFORM_HOST}:${TERRAFORM_PORT}/` })));

app.use(proxy('/api/', withLogs({ target: `http://${SRS_SERVER_HOST}:1985/` })));
app.use(proxy('/rtc/', withLogs({ target: `http://${SRS_SERVER_HOST}:1985/` })));
app.use(proxy('/*/*.(flv|m3u8|ts|aac|mp3)', withLogs({ target: `${SRS_SERVER_HOST}:8080/` })));

app.use(mount('/terraform/v1/sources/', serve('./sources')));

rewrite.handle(app);

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

system.handle(router);

router.all('/terraform/v1/host/versions', async (ctx) => {
    ctx.body = utils.asResponse(0, { version: pkg.version });
});

app.use(router.routes());

const run = async () => {
    while (!metadata.market.redis?.container?.ID) {
        await new Promise(resolve => setTimeout(resolve, 300));
    }

    console.log(`Redis is running, id=${metadata.market.redis?.container?.ID}`);

    const { region, registry } = await platform.init();
    console.log(`Run with cwd=${process.cwd()}, region=${region}, registry=${registry}`);

    app.listen(8022, () => {
        console.log(`Server start on http://localhost:8022`);
    });
};
run();

