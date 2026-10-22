const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');

// Load the real application and routes without running database setup/listen.
// These requests exercise only paths that do not read or write the database.
test('application health, authentication and invalid requests work after dependency patches', async t => {
    const filename = path.join(__dirname, '../server.js');
    const realRequire = createRequire(filename);
    const source = fs.readFileSync(filename, 'utf8').replace(/startServer\(\);\s*$/, 'module.exports = app;');
    assert.ok(source.endsWith('module.exports = app;'));
    const sandbox = {
        require: name => name === 'dotenv' ? { config() {} } : realRequire(name),
        module: { exports: {} },
        process: { env: { RENDER: 'true' }, on() {}, version: process.version },
        console: { log() {}, error() {} }
    };
    vm.runInNewContext(source, sandbox, { filename });
    const app = sandbox.module.exports;
    assert.equal(app.get('trust proxy'), 1);
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    t.after(() => new Promise(resolve => server.close(resolve)));
    const base = `http://127.0.0.1:${server.address().port}`;
    const health = await fetch(base + '/api/test');
    assert.equal(health.status, 200);
    assert.equal((await health.json()).message, 'Kodak Logistics API is running!');
    assert.equal((await fetch(base + '/api/auth/verify')).status, 401);
    for (const endpoint of ['/api/bookings', '/api/returns']) {
        const res = await fetch(base + endpoint, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '198.51.100.10' }, body: '{}'
        });
        assert.equal(res.status, 400);
    }
});

test('patched query parser preserves normal filters and blocks prototype pollution', () => {
    const qs = require('qs');
    assert.deepEqual(qs.parse('view=active&status=pending&page=2'), { view: 'active', status: 'pending', page: '2' });
    qs.parse('__proto__[polluted]=yes&constructor[prototype][polluted]=yes');
    assert.equal({}.polluted, undefined);
});
