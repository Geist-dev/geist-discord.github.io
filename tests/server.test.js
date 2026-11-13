import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../server.js';

async function withServer(fn) {
  const server = createApp().listen(0, '127.0.0.1');
  await once(server, 'listening');
  try { await fn(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise(resolve => server.close(resolve)); }
}

test('public entry points and local fonts are served with correct types', () => withServer(async base => {
  const routes = [['/', 'text/html'], ['/index.html', 'text/html'], ['/app.js', 'javascript'], ['/styles/main.css', 'text/css'], ['/assets/avatar.svg', 'image/svg+xml'], ['/шрифты/boxicons.woff2', 'font/woff2']];
  for (const [route, type] of routes) {
    const response = await fetch(base + route);
    assert.equal(response.status, 200, route);
    assert.ok(response.headers.get('content-type').includes(type), route);
    assert.ok((await response.arrayBuffer()).byteLength > 0);
  }
}));
test('server, configuration, dependencies and repository files are private', () => withServer(async base => {
  for (const route of ['/server.js', '/config.json', '/.env', '/.git/config', '/package-lock.json', '/node_modules/express/index.js', '/tests/server.test.js', '/styles/%2e%2e/server.js']) {
    const response = await fetch(base + route);
    assert.equal(response.status, 404, route);
    assert.equal(await response.text(), 'Not found');
  }
}));
test('security headers restrict script execution and external connections', () => withServer(async base => {
  const response = await fetch(base);
  const policy = response.headers.get('content-security-policy');
  assert.ok(policy.includes("script-src 'self'"));
  assert.ok(policy.includes("connect-src 'self'"));
  assert.ok(policy.includes("frame-ancestors 'none'"));
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
  assert.equal(response.headers.has('x-powered-by'), false);
}));
test('health endpoint returns JSON; unknown paths remain 404', () => withServer(async base => {
  assert.deepEqual(await (await fetch(base + '/healthz')).json(), { ok: true });
  assert.equal((await fetch(base + '/missing')).status, 404);
}));
test('portfolio has correct identity, contacts and repository links', () => withServer(async base => {
  const html = await (await fetch(base)).text();
  for (const text of ['Geist-dev', 'https://t.me/flipgood', 'mailto:aeromax.live@mail.ru', 'https://github.com/Geist-dev/Alias']) assert.ok(html.includes(text));
  for (const stale of ['clifyy', 'goshkaaaa', 'discordapp.com/users', 'protection.js', 'lanyard']) assert.ok(!html.includes(stale), stale);
}));
