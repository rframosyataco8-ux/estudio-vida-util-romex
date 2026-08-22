/* Limpia SW y Cache Storage al entrar — evita UI fantasma v1.3 */
(function () {
  var KEY = 'romex_purged_v151';
  try {
    if (sessionStorage.getItem(KEY) === '1') return;
  } catch (e) {}

  var jobs = [];

  if (typeof caches !== 'undefined') {
    jobs.push(
      caches.keys().then(function (keys) {
        return Promise.all(keys.map(function (k) { return caches.delete(k); }));
      }).catch(function () {})
    );
  }

  if ('serviceWorker' in navigator) {
    jobs.push(
      navigator.serviceWorker.getRegistrations().then(function (regs) {
        return Promise.all(regs.map(function (r) { return r.unregister(); }));
      }).catch(function () {})
    );
  }

  Promise.all(jobs).then(function () {
    try { sessionStorage.setItem(KEY, '1'); } catch (e) {}
  }).catch(function () {
    try { sessionStorage.setItem(KEY, '1'); } catch (e2) {}
  });
})();
