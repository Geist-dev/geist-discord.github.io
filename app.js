(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const fallbackAvatar = 'assets/avatar.svg';
  const storage = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch { /* Optional persistence. */ } }
  };
  const toggle = $('themeToggle');
  function setTheme(light) {
    document.body.classList.toggle('light-theme', light);
    toggle.setAttribute('aria-pressed', String(light));
    toggle.setAttribute('aria-label', light ? 'Включить тёмную тему' : 'Включить светлую тему');
    toggle.querySelector('i').className = light ? 'bx bx-sun' : 'bx bx-moon';
  }
  setTheme(storage.get('theme') === 'light');
  toggle.addEventListener('click', () => {
    const light = !document.body.classList.contains('light-theme');
    setTheme(light);
    storage.set('theme', light ? 'light' : 'dark');
  });

  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = String(text);
    return node;
  };
  const fallback = 'assets/avatar.svg';
  function image(url, cls, alt) {
    const node = el('img', cls);
    node.alt = alt;
    node.src = fallback;
    try {
      const u = new URL(url);
      if (u.protocol === 'https:' && ['cdn.discordapp.com', 'media.discordapp.net', 'i.scdn.co'].includes(u.hostname)) node.src = u.href;
    } catch { /* Local fallback. */ }
    node.addEventListener('error', () => { node.src = fallback; }, { once: true });
    return node;
  }
  let track = null;
  function noMusic(text) {
    track = null;
    document.querySelector('.player-content').replaceChildren(el('p', 'presence-message', text));
  }
  const clock = ms => {
    const seconds = Math.floor(Math.max(0, ms) / 1000);
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  };
  function progress() {
    if (!track) return;
    const duration = track.end - track.start;
    const elapsed = Math.max(0, Math.min(Date.now() - track.start, duration));
    document.querySelector('.progress-fill').style.width = `${elapsed / duration * 100}%`;
    const time = document.querySelector('.time-info');
    time.children[0].textContent = clock(elapsed);
    time.children[1].textContent = clock(duration);
  }
  function spotify(data) {
    track = null;
    if (!data || typeof data.song !== 'string') return noMusic('Сейчас музыка не играет');
    const row = el('div', 'now-playing');
    const info = el('div', 'track-info');
    info.append(el('div', 'track-title', data.song), el('div', 'track-artist', data.artist || ''), el('div', 'track-album', data.album || ''));
    row.append(image(data.album_art_url, 'album-art', 'Обложка альбома'), info);
    const nodes = [row];
    const start = data.timestamps?.start, end = data.timestamps?.end;
    if (Number.isFinite(start) && Number.isFinite(end) && start > 0 && end > start) {
      track = { start, end };
      const controls = el('div', 'player-controls'), bar = el('div', 'progress-bar'), time = el('div', 'time-info');
      bar.append(el('div', 'progress-fill'));
      time.append(el('span'), el('span'));
      controls.append(bar, time);
      nodes.push(controls);
    }
    document.querySelector('.player-content').replaceChildren(...nodes);
    progress();
  }
  function activities(data) {
    const list = Array.isArray(data) ? data.filter(a => a && a.type !== 2).slice(0, 8) : [];
    $('activitySection').hidden = list.length === 0;
    $('activityContent').replaceChildren();
    for (const activity of list) {
      const row = el('div', 'activity-item'), details = el('div', 'activity-details');
      if (activity.type !== 4) details.append(el('div', 'activity-name', activity.name || 'Активность'));
      for (const value of [activity.details, activity.state || (activity.type === 4 ? activity.name : '')]) {
        if (typeof value === 'string' && value) details.append(el('div', 'activity-state', value));
      }
      row.append(details);
      $('activityContent').append(row);
    }
  }
  function unavailable(message) {
    $('statusIndicator').style.background = '#747f8d';
    $('statusIndicator').title = 'Статус неизвестен';
    $('presenceStatus').textContent = message;
    noMusic('Данные о музыке недоступны');
    activities([]);
  }
  function render(data) {
    const user = data.discord_user;
    if (!user || typeof user.id !== 'string') throw new Error('Invalid user');
    const statuses = { online: ['#3ba55d', 'В сети'], idle: ['#faa61a', 'Отошёл'], dnd: ['#f04747', 'Не беспокоить'], offline: ['#747f8d', 'Не в сети'] };
    const [color, label] = statuses[data.discord_status] || statuses.offline;
    $('statusIndicator').style.background = color;
    $('statusIndicator').title = label;
    $('presenceStatus').textContent = `${user.username || 'Discord'} · ${label}`;
    if (/^\d{17,20}$/.test(user.id) && /^[a-zA-Z0-9_]+$/.test(user.avatar || '')) {
      const avatar = image(`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${user.avatar.startsWith('a_') ? 'gif' : 'png'}?size=256`, 'avatar-img', 'Аватар Geist-dev');
      avatar.id = 'avatarImg';
      $('avatarImg').replaceWith(avatar);
    } else $('avatarImg').src = fallback;
    spotify(data.spotify);
    activities(data.activities);
  }
  const staticId = document.querySelector('meta[name="discord-id"]')?.content || '';
  let busy = false, staticMode = false;
  async function refresh() {
    if (busy || document.hidden) return;
    busy = true;
    try {
      let response;
      const request = url => fetch(url, { signal: AbortSignal.timeout(7000), cache: 'no-store', credentials: 'omit' });
      if (!staticMode) {
        response = await request('api/discord');
        if (response.status === 404) staticMode = true;
      }
      if (staticMode) {
        if (!/^\d{17,20}$/.test(staticId)) { unavailable('Discord не подключён'); return; }
        response = await request(`https://api.lanyard.rest/v1/users/${staticId}`);
      }
      if (!response.ok) throw new Error('Presence unavailable');
      const body = await response.json();
      if (body.success === true && body.data) render(body.data);
      else unavailable(body.reason === 'not_configured' ? 'Discord не подключён' : 'Discord временно недоступен');
    } catch { unavailable('Discord временно недоступен'); }
    finally { busy = false; }
  }
  refresh();
  setInterval(refresh, 15000);
  setInterval(progress, 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
})();
