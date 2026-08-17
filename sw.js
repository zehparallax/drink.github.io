/* Drink — Service Worker: Offline-Betrieb und die tägliche, lautlose Erinnerung. */

const CACHE = 'drink-v9';
const SHELL = [
  './', './index.html', './styles.css', './app.js', './manifest.json',
  './i18n.js', './languages.js',
  './favicon.ico', './favicon.svg',
  './icons/favicon-16.png', './icons/favicon-32.png', './icons/apple-touch-icon.png',
  './icons/apple-touch-icon-120.png', './icons/apple-touch-icon-152.png',
  './icons/apple-touch-icon-167.png', './icons/apple-touch-icon-180.png',
  './icons/icon-48.png', './icons/maskable-48.png', './icons/icon-72.png',
  './icons/maskable-72.png', './icons/icon-96.png', './icons/maskable-96.png',
  './icons/icon-128.png', './icons/maskable-128.png', './icons/icon-144.png',
  './icons/maskable-144.png', './icons/icon-192.png', './icons/maskable-192.png',
  './icons/icon-256.png', './icons/maskable-256.png', './icons/icon-384.png',
  './icons/maskable-384.png', './icons/icon-512.png', './icons/maskable-512.png',
  './emoji/eins.png', './emoji/zwei.png', './emoji/drei.png', './emoji/vier.png',
  './emoji/fuenf.png', './emoji/sechs.png', './emoji/sieben.png', './emoji/acht.png',
  './emoji/neun.png', './emoji/zehn.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE && k !== 'drink-config').map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith((async () => {
    const hit = await caches.match(req, { ignoreSearch: true });
    if (hit) {
      fetch(req).then(r => r.ok && caches.open(CACHE).then(c => c.put(req, r.clone()))).catch(() => {});
      return hit;
    }
    try {
      const res = await fetch(req);
      if (res.ok && new URL(req.url).origin === location.origin) {
        const c = await caches.open(CACHE); c.put(req, res.clone());
      }
      return res;
    } catch (err) {
      /* Nur beim Seitenaufruf auf die Startseite ausweichen. Täte man das für
         jede Anfrage, bekäme Android für ein fehlendes Icon die index.html
         geliefert — eine gültige Antwort mit HTML darin, also ein Icon, das
         stumm leer bleibt. Ein ehrlicher Fehler ist hier besser. */
      if (req.mode === 'navigate') {
        return (await caches.match('./index.html')) || Response.error();
      }
      return Response.error();
    }
  })());
});

/* ---------- Konfiguration ablegen, da kein localStorage im Worker ---------- */
const CFG_URL = './__drink_config';
async function readCfg() {
  try {
    const c = await caches.open('drink-config');
    const r = await c.match(CFG_URL);
    return r ? await r.json() : null;
  } catch (e) { return null; }
}
async function writeCfg(obj) {
  const c = await caches.open('drink-config');
  await c.put(CFG_URL, new Response(JSON.stringify(obj), { headers: { 'Content-Type': 'application/json' } }));
}

self.addEventListener('message', e => {
  const d = e.data || {};
  if (d.type === 'config') e.waitUntil(writeCfg(d.config));
  if (d.type === 'notify-now') e.waitUntil(notify());
  if (d.type === 'test-notify') e.waitUntil(notify(true));
});

/* ---------- Die Erinnerung selbst ---------- */
const dayKey = (d = new Date()) =>
  d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

async function notify(force = false) {
  const cfg = (await readCfg()) || { goal: 2000, have: 0, bar: '▱▱▱▱▱▱▱▱▱▱', amounts: [250, 500] };
  if (!force && !cfg.on) return;

  const rest = Math.max(0, (cfg.goal || 2000) - (cfg.have || 0));
  const unit = cfg.unit || 'ml';
  const have = cfg.haveTxt ?? String(cfg.have || 0);
  const goal = cfg.goalTxt ?? String(cfg.goal || 2000);
  await self.registration.showNotification(cfg.title || 'Zeit zu trinken', {
    body: `${cfg.bar}  ${have} / ${goal} ${unit}`
      + (rest && cfg.rest ? '\n' + cfg.rest : ''),
    tag: 'drink-daily',
    renotify: false,
    silent: true,          // kein Ton
    vibrate: [],           // keine Vibration
    requireInteraction: false,
    badge: './icons/icon-192.png',
    icon: './icons/icon-192.png',
    data: { ts: Date.now() },
    actions: (cfg.amounts || [250, 500]).slice(0, 2).map(ml => ({
      action: 'add-' + ml, title: '+' + ((cfg.amountLabels || {})[ml] || ml + ' ' + unit)
    }))
  });
}

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const add = e.action && e.action.startsWith('add-') ? e.action.slice(4) : null;
  const url = add ? `./?add=${add}` : './';
  e.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of list) {
      if (c.url.includes(self.registration.scope)) {
        await c.focus();
        if (add) c.navigate(url).catch(() => {});
        return;
      }
    }
    await self.clients.openWindow(url);
  })());
});

/* ---------- Auslöser ---------- */
/* 1) Periodic Background Sync: Android/Chrome, nur bei installierter App */
self.addEventListener('periodicsync', e => {
  if (e.tag === 'drink-reminder') e.waitUntil(maybeNotify());
});
/* 2) Echter Web-Push, falls du später einen Server anschließt */
self.addEventListener('push', e => {
  e.waitUntil(notify(true));
});

async function maybeNotify() {
  const cfg = await readCfg();
  if (!cfg || !cfg.on) return;
  const [h, m] = (cfg.time || '07:00').split(':').map(Number);
  const now = new Date();
  const due = new Date(now); due.setHours(h, m, 0, 0);
  if (now < due) return;
  if (cfg.lastNotify === dayKey()) return;
  await writeCfg({ ...cfg, lastNotify: dayKey(), have: 0, bar: '▱▱▱▱▱▱▱▱▱▱' });
  await notify(true);
}
