'use strict';

const MGMT_HOST = '8022';
const config = {
    redis: {
        host: process.env.REDIS_HOST, 
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || '',
    },
};

const fs = require('fs');
const os = require('os');
const path = require('path');
const dotenv = require('dotenv');
const utils = require('./js-core/utils');
const errs = require('./js-core/errs');
const jwt = require('jsonwebtoken');
const util = require('util');
const execFile = util.promisify(require('child_process').execFile);
const ioredis = require('ioredis');
const redis = require('./js-core/redis').create({ config: config.redis, redis: ioredis });
const pkg = require('./package.json');
const { spawn } = require('child_process');
const axios = require('axios');
const platform = require('./platform');
const keys = require('./js-core/keys');

const handlers = {
    reloadEnv: async ({ ctx, action, args }) => {
        utils.reloadEnv(dotenv, fs, path);
        ctx.body = utils.asResponse(0);
    },

    // Query the cached version.
    queryVersion: async ({ ctx, action, args }) => {
        ctx.body = utils.asResponse(0, {
            version: `v${pkg.version}`,
        });
    },

    // Refresh the version from api.
    refreshVersion: async ({ ctx, action, args }) => {
        const params = args[0];
        if (!params) throw utils.asError(errs.sys.empty, errs.status.args, `no params`);

        params.version = `v${pkg.version}`;
        params.ts = new Date().getTime();

        // Request the release service API.
        const releaseServer = process.env.LOCAL_RELEASE === 'true' ? `http://localhost:${MGMT_HOST}` : 'https://api.ossrs.net';
        console.log(`Query ${releaseServer} with ${JSON.stringify(params)}`);

        const { data: releases } = await axios.get(`${releaseServer}/terraform/v1/releases`, { params });

        ctx.body = utils.asResponse(0, {
            version: params.version,
            stable: releases?.stable,
            latest: releases?.latest,
        });
    },

    // Start upgrade.
    execUpgrade: async ({ ctx, action, args }) => {
        const target = args[0];
        if (!target) throw utils.asError(errs.sys.empty, errs.status.args, `no target`);

        await new Promise((resolve, reject) => {
            const child = spawn('bash', ['upgrade', target]);
            child.stdout.on('data', (chunk) => {
                console.log(chunk.toString());
            });
            child.stderr.on('data', (chunk) => {
                console.log(chunk.toString());
            });
            child.on('close', (code) => {
                console.log(`upgrading exited with code ${code}`);
                if (code !== 0) return reject(code);
                resolve();
            });
        });

        ctx.body = utils.asResponse(0);
    },

    // Write SSL cert and key files.
    updateSslFile: async ({ ctx, action, args }) => {
        const [key, crt] = args;

        if (!key) throw utils.asError(errs.sys.empty, errs.status.args, 'no key');
        if (!crt) throw utils.asError(errs.sys.empty, errs.status.args, 'no crt');

        if (!fs.existsSync(`${process.cwd()}/containers/ssl/nginx.key`)) throw utils.asError(errs.sys.ssl, errs.status.sys, 'no key file');
        if (!fs.existsSync(`${process.cwd()}/containers/ssl/nginx.crt`)) throw utils.asError(errs.sys.ssl, errs.status.sys, 'no crt file');

        // Remove the ssl file, because it might link to other file.
        await execFile('rm', [
            '-f',
            `${process.cwd()}/containers/ssl/nginx.key`,
            `${process.cwd()}/containers/ssl/nginx.crt`,
        ]);

        // Write the ssl key and cert, and reload nginx when ready.
        fs.writeFileSync(`${process.cwd()}/containers/ssl/nginx.key`, key);
        fs.writeFileSync(`${process.cwd()}/containers/ssl/nginx.crt`, crt);
        await utils.reloadNginx(fs, execFile);

        ctx.body = utils.asResponse(0);
    },

    // Update SSL by let's encrypt.
    updateLetsEncrypt: async ({ ctx, action, args }) => {
        const [domains] = args;

        if (!domains) throw utils.asError(errs.sys.empty, errs.status.args, 'no domain');

        // Only require the SSL directory exists, because user might remove the key and crt files.
        if (!fs.existsSync(`${process.cwd()}/containers/ssl/`)) {
            throw utils.asError(errs.sys.ssl, errs.status.sys, 'no ssl directory');
        }

        // Support multiple domains like domain.com;www.domain.com
        const domainConfs = domains.split(/[;, ]+/);
        const firstDomain = domainConfs[0];

        // We run always with "-n Run non-interactively"
        // Note that it's started by nodejs, so never use '-it' or failed for 'the input device is not a TTY'.
        //
        // The www root to verify while requesting the SSL file:
        //    /.well-known/acme-challenge/
        // which mount as:
        //    ./containers/www/.well-known/acme-challenge/
        const registry = await platform.registry();
        const dockerArgs = ['run', '--rm', '--name', 'certbot-certonly',
            '-v', `${process.cwd()}/containers/etc/letsencrypt:/etc/letsencrypt`,
            '-v', `${process.cwd()}/containers/var/lib/letsencrypt:/var/lib/letsencrypt`,
            '-v', `${process.cwd()}/containers/var/log/letsencrypt:/var/log/letsencrypt`,
            '-v', `${process.cwd()}/containers/www:/www`,
            `${registry}/ossrs/certbot`,
            'certonly', '--webroot', '-w', '/www',
            ...domainConfs.map(e => ['-d', e]).flat(),
            '--register-unsafely-without-email', '--agree-tos',
            '--preferred-challenges', 'http',
            '-n',
        ];
        await execFile('docker', dockerArgs);
        console.log(`certbot request ssl ok docker ${dockerArgs.join(' ')}`);

        const keyFile = `${process.cwd()}/containers/etc/letsencrypt/live/${firstDomain}/privkey.pem`;
        if (!fs.existsSync(keyFile)) throw utils.asError(errs.sys.ssl, errs.status.sys, `issue key file ${keyFile}`);

        const crtFile = `${process.cwd()}/containers/etc/letsencrypt/live/${firstDomain}/cert.pem`;
        if (!fs.existsSync(crtFile)) throw utils.asError(errs.sys.ssl, errs.status.sys, `issue crt file ${crtFile}`);

        // Remove the ssl file, because it might link to other file.
        await execFile('rm', [
            '-f',
            `${process.cwd()}/containers/ssl/nginx.key`,
            `${process.cwd()}/containers/ssl/nginx.crt`,
        ]);

        // Always use execFile when params contains user inputs, see https://auth0.com/blog/preventing-command-injection-attacks-in-node-js-apps/
        await execFile('ln', ['-sf', keyFile, `${process.cwd()}/containers/ssl/nginx.key`]);
        await execFile('ln', ['-sf', crtFile, `${process.cwd()}/containers/ssl/nginx.crt`]);

        // Restart the nginx service to reload the SSL files.
        await utils.reloadNginx(fs, execFile);

        ctx.body = utils.asResponse(0);
    },

    // Renew the lets encrypt SSL files.
    renewLetsEncrypt: async ({ ctx, action, args }) => {
        // Whether force to renew.
        const [force] = args;

        // Remove the ssl file, because it might link to other file.
        const signalFile = `${process.cwd()}/containers/var/log/letsencrypt/CERTBOT_HOOK_RELOAD_NGINX`;
        await execFile('rm', ['-f', signalFile]);

        // We run always with "-n Run non-interactively"
        // Note that it's started by nodejs, so never use '-it' or failed for 'the input device is not a TTY'.
        const registry = await platform.registry();
        const dockerArgs = ['run', '--rm', '--name', 'certbot-renew',
            '-v', `${process.cwd()}/containers/etc/letsencrypt:/etc/letsencrypt`,
            '-v', `${process.cwd()}/containers/var/lib/letsencrypt:/var/lib/letsencrypt`,
            '-v', `${process.cwd()}/containers/var/log/letsencrypt:/var/log/letsencrypt`,
            `${registry}/ossrs/certbot`,
            'renew', '--post-hook', 'touch /var/log/letsencrypt/CERTBOT_HOOK_RELOAD_NGINX',
            // See https://github.com/ossrs/srs/issues/2864#issuecomment-1027944527
            // Use --force-renewal and --no-random-sleep-on-renew to always renew a cert,
            // see https://community.letsencrypt.org/t/disabling-random-sleep-of-certbot/83201
            ...(force ? ['--force-renewal', '--no-random-sleep-on-renew'] : []),
            '-n',
        ];
        const { stdout } = await execFile('docker', dockerArgs);
        console.log(`certbot renew ssl ok, docker ${dockerArgs.join(' ')}`);

        // Restart the nginx service to reload the SSL files.
        const renewOk = fs.existsSync(signalFile);
        if (renewOk) await utils.reloadNginx(fs, execFile);
        console.log(`certbot renew updated=${renewOk}, args=${args}, message is ${stdout}`);

        ctx.body = utils.asResponse(0, { stdout, renewOk });
    },

    // Update access for ssh keys.
    accessSsh: async ({ ctx, action, args }) => {
        const [enabled] = args;
        const { stdout } = await execFile('bash', ['auto/update_access', enabled]);
        console.log(`Access: SSH enabled=${enabled}, message is ${stdout}`);

        ctx.body = utils.asResponse(0);
    },

    // Current work directory.
    cwd: async ({ ctx, action, args }) => {
        ctx.body = utils.asResponse(0, { cwd: process.cwd() });
    },

    // Current ipv4 internal address.
    ipv4: async ({ ctx, action, args }) => {
        const r0 = await platform.ipv4();
        ctx.body = utils.asResponse(0, r0);
    },

    // Current host platform name.
    hostPlatform: async ({ ctx, action, args }) => {
        ctx.body = utils.asResponse(0, { platform: process.platform });
    },

    // Generate dynamic.conf for NGINX.
    nginxGenerateConfig: async ({ ctx, action, args }) => {
        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        // Build HLS config for NGINX.
        const hls = await redis.hget(keys.redis.SRS_STREAM_NGINX, 'hls');

        const m3u8Conf = hls === 'true' ? [
            // Use NGINX to deliver m3u8 files.
            `root ${process.cwd()}/containers/objs/nginx/html;`,
            // Set the cache control, see http://nginx.org/en/docs/http/ngx_http_headers_module.html
            'add_header Cache-Control "public, max-age=10";',
            // Allow CORS for all domain, see https://ubiq.co/tech-blog/enable-cors-nginx/
            'add_header Access-Control-Allow-Origin *;',
        ] : [
            'proxy_pass http://127.0.0.1:8080$request_uri;',
        ];

        const tsConf = hls === 'true' ? [
            `root ${process.cwd()}/containers/objs/nginx/html;`,
            'add_header Cache-Control "public, max-age=86400";',
            // Allow CORS for all domain, see https://ubiq.co/tech-blog/enable-cors-nginx/
            'add_header Access-Control-Allow-Origin *;',
        ] : [
            'proxy_pass http://127.0.0.1:8080$request_uri;',
        ];

        const hlsConf = [
            '',
            '# For HLS delivery',
            'location ~ ^/.+/.*\\.(m3u8)$ {',
            ...m3u8Conf.map(e => `  ${e}`),
            '}',
            'location ~ ^/.+/.*\\.(ts)$ {',
            ...tsConf.map(e => `  ${e}`),
            '}',
        ];

        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        // Build reverse proxy config for NGINX.
        const reverses = await redis.hgetall(keys.redis.SRS_HTTP_PROXY);
        const reversesConf = [];
        reverses && reversesConf.push(
            '',
            '# For Reverse Proxy',
        );
        reverses && Object.keys(reverses).map(location => {
            const backend = reverses[location];
            const suffix = backend.indexOf('$') === -1 ? '$request_uri' : '';
            reversesConf.push(
                `location ${location} {`,
                [`  proxy_pass ${backend}`, suffix, ';'].join(''),
                '}',
            );
            return null;
        });

        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        // Build the SSL/TLS config.
        const sslConf = [];
        const ssl = await redis.get(keys.redis.SRS_HTTPS);
        if (ssl === 'ssl' || ssl === 'lets') {
            sslConf.push(
                '',
                '# For SSL/TLS config.',
                'listen       443 ssl http2 default_server;',
                'listen       [::]:443 ssl http2 default_server;',
                'ssl_session_cache shared:SSL:1m;',
                'ssl_session_timeout  10m;',
                'ssl_ciphers HIGH:!aNULL:!MD5;',
                'ssl_prefer_server_ciphers on;',
                `ssl_certificate "${process.cwd()}/containers/ssl/nginx.crt";`,
                `ssl_certificate_key "${process.cwd()}/containers/ssl/nginx.key";`,
                '',
                '# For automatic HTTPS.',
                'location /.well-known/acme-challenge/ {',
                `  proxy_pass http://127.0.0.1:${MGMT_HOST}$request_uri;`,
                '}',
            );
        }

        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        // Build the default root.
        const rootConf = [];
        const defaultRoot = await redis.hget(keys.redis.SRS_HTTP_PROXY, "/");
        if (!defaultRoot) {
            rootConf.push(
                '',
                '# For default root.',
                'location / {',
                `  proxy_pass http://127.0.0.1:${MGMT_HOST}$request_uri;`,
                '}',
            );
        }

        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        // Build the upload limit for uploader(vLive).
        const uploadLimit = [
            '',
            '# Limit for upload file size',
            'client_max_body_size 100g;',
        ];

        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        // Build the config for NGINX.
        const confLines = [
            '# !!! Important: SRS will restore this file during each upgrade, please never modify it.',
            ...uploadLimit,
            ...sslConf,
            ...hlsConf,
            ...reversesConf,
            ...rootConf,
            '',
            '',
        ];

        fs.writeFileSync('containers/conf/default.d/nginx.dynamic.conf', confLines.join(os.EOL));
        await utils.reloadNginx(fs, execFile);
        console.log(`NGINX: Refresh dynamic.conf ok`);

        ctx.body = utils.asResponse(0);
    },

    // Whether use NGINX to deliver HLS.
    nginxHlsDelivery: async ({ ctx, action, args }) => {
        const [enabled] = args;
        if (!enabled) throw utils.asError(errs.sys.empty, errs.status.args, 'no enabled');

        const r0 = await redis.hset(keys.redis.SRS_STREAM_NGINX, 'hls', enabled === 'enable');
        console.log(`NGINX: Set hls delivery to ${enabled}, r0=${r0}`);

        ctx.body = utils.asResponse(0);
    },

    // RPC template.
    xxx: async ({ ctx, action, args }) => {
    },
};

exports.handle = (router) => {
    // In the container, we can't neither manage other containers, nor execute command, so we must request this api to
    // execute the command on host machine.
    router.all('/terraform/v1/host/exec', async (ctx) => {
        const { action, token, args } = ctx.request.body;

        if (!token) throw utils.asError(errs.sys.empty, errs.status.auth, `no token`);
        if (!action) throw utils.asError(errs.sys.empty, errs.status.args, `no action`);

        if (!Object.keys(handlers).includes(action)) {
            throw utils.asError(errs.sys.invalid, errs.status.args, `invalid action=${action}`);
        }

        const apiSecret = await utils.apiSecret(redis);
        const decoded = await utils.verifyToken(jwt, token, apiSecret);
        console.log(`exec verify action=${action}, args=${JSON.stringify(args)}, token=${token.length}B, decoded=${JSON.stringify(decoded)}`);

        if (handlers[action]) {
            await handlers[action]({ ctx, action, args });
        } else {
            throw utils.asError(errs.sys.invalid, errs.status.args, `invalid action ${action}`);
        }
    });

    return router;
};

