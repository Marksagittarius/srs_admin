'use strict';

const config = {
    redis: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || '',
    },
};

const ioredis = require('ioredis');
const redis = require('./js-core/redis').create({ config: config.redis, redis: ioredis });
const utils = require('./js-core/utils');
const keys = require('./js-core/keys');
const helper = require('./helper');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');

// Whether the host is darwin, we must request from mgmt.
exports.isDarwin = null;

// We must mark these fields as async, to notice user not to use it before it initialized.
const conf = { cloud: null, region: null, source: null, registry: null, cwd: null, platform: null };
exports.cloud = async () => {
    return conf.cloud;
};
exports.region = async () => {
    return conf.region;
};
exports.source = async () => {
    return conf.source;
};
exports.registry = async () => {
    return conf.registry;
};
exports.cwd = () => {
    return conf.cwd;
};
exports.ipv4 = async () => {
    return await helper.execApi('ipv4');
};

exports.init = async () => {
    // Setup the api secret.
    // Remark: Should do it before any helper.execApi, which depends on it.
    await utils.setupApiSecret(redis, uuidv4, moment);

    // Request and cache the apiSecret.
    const apiSecret = await utils.apiSecret(redis);

    // Load the platform from redis, initialized by mgmt.
    conf.cloud = await redis.hget(keys.redis.SRS_TENCENT_LH, 'cloud');
    conf.region = await redis.hget(keys.redis.SRS_TENCENT_LH, 'region');
    conf.source = await redis.hget(keys.redis.SRS_TENCENT_LH, 'source');
    conf.registry = await redis.hget(keys.redis.SRS_TENCENT_LH, 'registry');

    // Request the cwd of mgmt.
    const { cwd } = await helper.execApi('cwd');
    conf.cwd = cwd;

    // Request the host platform.
    const { platform: hostPlatform } = await helper.execApi('hostPlatform');
    conf.platform = hostPlatform;
    exports.isDarwin = conf.platform === 'darwin';

    console.log(`Initialize cloud=${conf.cloud}, region=${conf.region}, source=${conf.source}, registry=${conf.registry}, isDarwin=${exports.isDarwin}, cwd=${cwd}, apiSecret=${apiSecret.length}B`);
};

