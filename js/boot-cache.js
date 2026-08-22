/* Limpia SW y cachés viejos UNA vez por sesión — evita UI v1.3 fantasma */
(function () {
  var KEY = 'romex_cache_cleared_v151';
  if (sessionStorage.getItem(KEY)) return;

  function done() {
    try { sessionStorage.setItem(KEY, '1'); } catch (e) {}
  }

  var tasks = [];

  if (window.caches) {
    tasks.push(
      caches.keys().then(function (keys) {
        return Promise.all(keys.map(function (k) { return caches.delete(k); }));
      }).catch(function () {})
    );
  }

  if ('serviceWorker' in navigator) {
    tasks.push(
      navigator.serviceWorker.getRegistrations().then(function (regs) {
        return Promise.all(regs.map(function (r) { return r.unregister(); }));
      }).catch(function () {})
    );
  }

  Promise.all(tasks).then(done).catch(done);
})();
