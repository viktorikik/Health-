/* ============================ SW «Ещё одна галочка» ============================ */
const CACHE_VERSION = 'eog-sad-v11'; 
const CACHE_URLS = [
  './',
  './index.html',
  './styles.css',
  './core.js',
  './calendar.js',
  './panel.js',
  './analytics.js',
  './health.js',
  './app.js',
  './manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(CACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  event.respondWith(
    fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE_VERSION).then(cache => cache.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(req).then(cached => cached || caches.match('./index.html')))
  );
});
