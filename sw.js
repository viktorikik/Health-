/* ============================================================
   ФАЙЛ 6 из 6 · sw.js · ЗАМЕНИТЬ ЦЕЛИКОМ
   Версия кэша уже поднята до eog-sad-v9, motion.css и motion.js
   добавлены в кэш. После деплоя закрой и открой приложение один раз.
   Делает ровно то, что описано в документации: network-first
   с fallback на кэш, очистка старых версий.
   ============================================================ */

/* ===== sw.js · «Ещё одна галочка» · eog-sad-v9 ===== */
const CACHE_VERSION = 'eog-sad-v12';
const FILES = [
  './',
  './index.html',
  './styles.css',
  './motion.css',
  './core.js',
  './calendar.js',
  './panel.js',
  './analytics.js',
  './health.js',
  './app.js',
  './motion.js',
  './growth.css',
  './growth.js',
  './manifest.webmanifest'
];

/* Установка: кэшируем оболочку. Каждый файл отдельно —
   если какого-то нет, установка всё равно не падает. */
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_VERSION).then(cache =>
      Promise.all(FILES.map(url => cache.add(url).catch(() => {})))
    )
  );
});

/* Активация: удаляем старые кэши и забираем открытые вкладки */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Запросы: сначала сеть (свежие файлы), при офлайне — кэш */
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
