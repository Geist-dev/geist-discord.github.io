import express from 'express';
import { createPresence, readDiscordId } from './presence.js';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
export function createApp(options = {}) {
  const presence = createPresence(options);
  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https://cdn.discordapp.com https://media.discordapp.net https://i.scdn.co; font-src 'self'; connect-src 'self' https://api.lanyard.rest; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"
    });
    next();
  });
  app.get('/healthz', (req, res) => res.json({ ok: true }));
  app.get('/api/discord', async (req, res) => {
    const result = await presence();
    res.set('Cache-Control', 'no-store').status(result.status).json(result.body);
  });
  // Explicit public routes: never expose server code, config, .env, tests or dependencies.
  for (const dir of ['styles', 'assets', 'шрифты']) {
    app.use(encodeURI(`/${dir}`), express.static(path.join(root, dir), { dotfiles: 'deny', index: false }));
  }
  app.get(['/', '/index.html'], (req, res) => res.sendFile(path.join(root, 'index.html')));
  app.get('/app.js', (req, res) => res.sendFile(path.join(root, 'app.js')));
  app.use((req, res) => res.status(404).type('text').send('Not found'));
  return app;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const discordId = await readDiscordId();
    const port = Number(process.env.PORT || 3000);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be 1–65535');
    const host = process.env.HOST || '127.0.0.1';
    const server = createApp({ discordId }).listen(port, host, () => console.log(`Portfolio: http://${host}:${port}`));
    server.on('error', error => { console.error(error.message); process.exitCode = 1; });
    for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => server.close());
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
