// Render's ingress appends the client IP as the rightmost forwarded address.
// Trust only that hop, never arbitrary addresses supplied before it.
function configureProxy(app, env = process.env) {
    app.set('trust proxy', env.RENDER === 'true' ? 1 : false);
}
module.exports = { configureProxy };
