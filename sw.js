/* Romex QC SW v1.5.1 — network-only para HTML/JS/CSS (evita UI vieja) */
var CACHE = 'romex-qc-v151';

self.addEventListener('install', function (e) {
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        return caches.delete(k);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

/* Siempre red para documentos y scripts; no reutilizar HTML/JS/CSS viejos */
self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);
  if (url.pathname.indexOf('/api/') === 0) return;
  if (e.request.method !== 'GET') return;

  var path = url.pathname.toLowerCase();
  var isCode = /\.(html|js|css|json)(\?|$)/.test(path) || path === '/' || path.endsWith('/');

  if (isCode) {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' }).catch(function () {
        return caches.match(e.request);
      })
    );
    return;
  }

  e.respondWith(
    fetch(e.request).then(function (res) {
      return res;
    }).catch(function () {
      return caches.match(e.request);
    })
  );
});
