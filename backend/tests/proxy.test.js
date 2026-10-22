const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { rateLimit } = require('express-rate-limit');
const { configureProxy } = require('../middleware/proxy');

async function fixture(t, env) {
    const app = express();
    configureProxy(app, env);
    app.use(rateLimit({ windowMs: 60000, limit: 2, standardHeaders: 'draft-7', legacyHeaders: false }));
    app.get('/', (req, res) => res.json({ ip: req.ip }));
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    t.after(() => new Promise(resolve => server.close(resolve)));
    const url = `http://127.0.0.1:${server.address().port}/`;
    return { app, get: forwarded => fetch(url, { headers: { 'X-Forwarded-For': forwarded } }) };
}

test('Render visitors have separate limits; forged prefixes cannot evade a limit', async t => {
    const { app, get } = await fixture(t, { RENDER: 'true' });
    assert.equal(app.get('trust proxy'), 1);
    const a = await get('198.51.100.1');
    assert.equal(a.status, 200);
    assert.equal((await a.json()).ip, '198.51.100.1');
    const forged = await get('203.0.113.99, 198.51.100.1');
    assert.equal(forged.status, 200);
    assert.equal((await forged.json()).ip, '198.51.100.1');
    const blocked = await get('203.0.113.88, 198.51.100.1');
    assert.equal(blocked.status, 429);
    const b = await get('198.51.100.2');
    assert.equal(b.status, 200);
    assert.equal((await b.json()).ip, '198.51.100.2');
});

test('outside Render, client-supplied forwarding headers are ignored', async t => {
    const app = express();
    configureProxy(app, {});
    assert.equal(app.get('trust proxy'), false);
    app.get('/', (req, res) => res.json({ ip: req.ip }));
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    t.after(() => new Promise(resolve => server.close(resolve)));
    const res = await fetch(`http://127.0.0.1:${server.address().port}/`, { headers: { 'X-Forwarded-For': '203.0.113.99' } });
    assert.equal((await res.json()).ip, '127.0.0.1');
});
