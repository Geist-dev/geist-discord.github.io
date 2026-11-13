import test from 'node:test';
import assert from 'node:assert/strict';
import { createPresence, readDiscordId } from '../presence.js';
const id = '601356351263997952';
const payload = { success: true, data: { discord_user: { id, username: 'demo' }, discord_status: 'online', activities: [], spotify: null } };
const ok = () => ({ ok: true, json: async () => payload });

test('configuration permits a public ID or explicit opt-out and rejects malformed IDs', async () => {
  assert.equal(await readDiscordId({ DISCORD_ID: id }), id);
  assert.equal(await readDiscordId({ DISCORD_ID: '' }), null);
  await assert.rejects(readDiscordId({ DISCORD_ID: '../secret' }), /17–20 digits/);
});
test('unconfigured integration makes no upstream requests', async () => {
  const presence = createPresence({ fetchImpl: () => { throw new Error('must not fetch'); } });
  assert.deepEqual(await presence(), { status: 200, body: { success: false, reason: 'not_configured' } });
});
test('concurrent requests share one upstream call and expire after TTL', async () => {
  let calls = 0, time = 0;
  const presence = createPresence({ discordId: id, now: () => time, ttlMs: 100, fetchImpl: async (url, options) => {
    calls++;
    assert.equal(url, `https://api.lanyard.rest/v1/users/${id}`);
    assert.ok(options.signal instanceof AbortSignal);
    await new Promise(resolve => setTimeout(resolve, 5));
    return ok();
  } });
  const results = await Promise.all([presence(), presence(), presence()]);
  assert.equal(calls, 1);
  assert.equal(results[0].body.data.discord_user.id, id);
  await presence(); assert.equal(calls, 1);
  time = 101; await presence(); assert.equal(calls, 2);
});
test('upstream errors are cached briefly and do not expose response bodies or stack traces', async () => {
  let calls = 0;
  const presence = createPresence({ discordId: id, fetchImpl: async () => { calls++; throw new Error('private internal detail'); } });
  assert.deepEqual(await presence(), { status: 503, body: { success: false, reason: 'unavailable' } });
  await presence(); assert.equal(calls, 1);
});
test('HTTP failures, unsuccessful payloads and wrong users are rejected', async () => {
  for (const response of [{ ok: false }, { ok: true, json: async () => ({ success: false }) }, { ok: true, json: async () => ({ success: true, data: { discord_user: { id: 'wrong' } } }) }]) {
    const presence = createPresence({ discordId: id, fetchImpl: async () => response });
    assert.equal((await presence()).status, 503);
  }
});
test('timeout aborts a slow upstream request and returns a controlled error', async () => {
  const presence = createPresence({ discordId: id, timeoutMs: 10, fetchImpl: (url, { signal }) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(ok()), 500);
    signal.addEventListener('abort', () => { clearTimeout(timer); reject(signal.reason); }, { once: true });
  }) });
  assert.equal((await presence()).status, 503);
});
