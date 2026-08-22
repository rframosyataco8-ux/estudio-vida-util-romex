/* Romex QC SW v1.5.1 — no cachea HTML/JS/CSS */
self.addEventListener('install', function (e) { self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});
self.addEventListener('fetch', function (e) {
  var u = new URL(e.request.url);
  if (u.pathname.indexOf('/api/') === 0 || e.request.method !== 'GET') return;
  var p = u.pathname.toLowerCase();
  if (/\.(html|js|css|json)(\?|$)/.test(p) || p === '/' || p.endsWith('/')) {
    e.respondWith(fetch(e.request, { cache: 'no-store' }));
  }
});
