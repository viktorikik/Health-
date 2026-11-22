/* ============================================================
   sw.js · eog-sad-v11 · ЗАМЕНИТЬ ЦЕЛИКОМ
   Версия поднята после замены growth.css (v1.4) и growth.js (v1.4).
   Стратегия: network-first с fallback на кэш.
   ============================================================ */
const CACHE_VERSION = 'eog-sad-v11';
const FILES = [
  './',
  './index.html',
  './styles.css',
  './motion.css',
  './growth.css',
  './core.js',
  './calendar.js',
  './panel.js',
  './analytics.js',
  './health.js',
  './app.js',
  './motion.js',
  './growth.js',
  './manifest.webmanifest'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_VERSION).then(cache =>
      Promise.all(FILES.map(url => cache.add(url).catch(() => {})))
    )
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(
    fetch(req).then(res => {
      if (res && res.ok && new URL(req.url).origin === self.location.origin) {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then(cache => cache.put(req, copy));
      }
      return res;
    }).catch(() =>
      caches.match(req).then(hit => {
        if (hit) return hit;
        if (req.mode === 'navigate') return caches.match('./index.html');
        return Response.error();
      })
    )
  );
});
