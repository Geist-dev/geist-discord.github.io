import { readFile } from 'node:fs/promises';

export async function readDiscordId(env = process.env) {
  const config = JSON.parse(await readFile(new URL('./config.json', import.meta.url), 'utf8'));
  const id = env.DISCORD_ID ?? config.discord_id;
  if (id === '' || id == null) return null;
  if (typeof id !== 'string' || !/^\d{17,20}$/.test(id)) throw new Error('DISCORD_ID must contain 17–20 digits');
  return id;
}

export function createPresence({ discordId, fetchImpl = fetch, now = Date.now, timeoutMs = 5000, ttlMs = 15000 } = {}) {
  let cached;
  let expires = 0;
  let pending;
  return async function presence() {
    if (!discordId) return { status: 200, body: { success: false, reason: 'not_configured' } };
    if (cached && now() < expires) return cached;
    if (pending) return pending;
    pending = (async () => {
      let result;
      try {
        const response = await fetchImpl(`https://api.lanyard.rest/v1/users/${discordId}`, {
          headers: { accept: 'application/json' }, signal: AbortSignal.timeout(timeoutMs)
        });
        if (!response.ok) throw new Error('Upstream unavailable');
        const body = await response.json();
        if (body.success !== true || !body.data?.discord_user || body.data.discord_user.id !== discordId) throw new Error('Invalid presence response');
        result = { status: 200, body: { success: true, data: body.data } };
      } catch {
        result = { status: 503, body: { success: false, reason: 'unavailable' } };
      }
      cached = result;
      expires = now() + ttlMs;
      return result;
    })();
    try { return await pending; } finally { pending = null; }
  };
}
