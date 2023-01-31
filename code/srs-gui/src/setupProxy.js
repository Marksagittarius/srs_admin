const { createProxyMiddleware } = require('http-proxy-middleware');
const PROXY_PORT = '8022';
const SRS_MANAGE_HOST = 'localhost';
const SRS_SERVER_HOST = 'srs-server';

console.log('setupProxy for development reactjs');

module.exports = function (app) {
    app.use('/console', createProxyMiddleware({
        target: `http://${SRS_MANAGE_HOST}:${PROXY_PORT}/`,
        changeOrigin: true,
        pathRewrite: {
            '^/console': ''
        }
    }));
    
    app.use('/players', createProxyMiddleware({ target: `http://${SRS_MANAGE_HOST}:${PROXY_PORT}/`, changeOrigin: true }));
    app.use('/prometheus', createProxyMiddleware({ target: `http://${SRS_MANAGE_HOST}:${PROXY_PORT}/`, changeOrigin: true }));
    app.use('/terraform', createProxyMiddleware({
        target: `http://${SRS_MANAGE_HOST}:${PROXY_PORT}/`,
        changeOrigin: true,
        pathRewrite: {
            '^/terraform': ''
        }
    }));
    app.use('/tools', createProxyMiddleware({ target: `http://${SRS_MANAGE_HOST}:${PROXY_PORT}/`, changeOrigin: true }));

    const withLogs = (options) => {
        return createProxyMiddleware(options);
    };

    app.use('/api', withLogs({ target: `http://${SRS_SERVER_HOST}:1985/`, changeOrigin: true }));
    app.use('/rtc', withLogs({ target: `http://${SRS_SERVER_HOST}:1985/`, changeOrigin: true }));
    app.use('/*/*.(flv|m3u8|ts|aac|mp3)', withLogs({ target: `http://${SRS_SERVER_HOST}:8080/`, changeOrigin: true }));

    app.use('/index.html', createProxyMiddleware({ target: `http://${SRS_MANAGE_HOST}:${PROXY_PORT}/`, changeOrigin: true }));
};

