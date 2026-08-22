/* Service worker Romex QC v1.5 — network-first para no servir UI vieja */
var CACHE = 'romex-qc-v15';
var ASSETS = [
  './',
  './index.html',
  './login.html',
  './css/styles.css',
  './css/dark.css',
  './css/chart-fix.css',
  './css/ui-v15.css',
  './js/app.js',
  './js/chart3d.js',
  './js/extras.js',
  './js/ui-v15.js',
  './manifest.json'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(ASSETS).catch(function () {});
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE; }).map(function (k) {
          return caches.delete(k);
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

/* Network-first: siempre intenta red; si falla, usa caché */
self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);
  if (url.pathname.indexOf('/api/') === 0) return;
  if (e.request.method !== 'GET') return;

  e.respondWith(
    fetch(e.request).then(function (res) {
      if (res && res.ok && res.type === 'basic') {
        var clone = res.clone();
        caches.open(CACHE).then(function (c) {
          c.put(e.request, clone);
        });
      }
      return res;
    }).catch(function () {
      return caches.match(e.request).then(function (cached) {
        return cached || caches.match('./index.html');
      });
    })
  );
});
