const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function configureProxy(app) {
  const port = process.env.BACKEND_PORT || process.env.SERVER_PORT || '3001';
  app.use('/api', createProxyMiddleware({
    target: `http://127.0.0.1:${port}`,
    changeOrigin: true,
  }));
};
