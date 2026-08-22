/* Romex boot-cache v1.5.2 — limpia SW y Cache Storage en CADA visita */
(function () {
  var RELOAD_KEY = 'romex_hard_reload_v152';

  function purge() {
    var jobs = [];

  if (typeof caches !== 'undefined') {
      jobs.push(
        caches.keys().then(function (keys) {
          return Promise.all(keys.map(function (k) {
            return caches.delete(k);
          }));
        }).catch(function () {})
      );
    }

    if ('serviceWorker' in navigator) {
      jobs.push(
        navigator.serviceWorker.getRegistrations().then(function (regs) {
          return Promise.all(regs.map(function (r) {
            return r.unregister();
          }));
        }).catch(function () {})
      );
    }

    return Promise.all(jobs);
  }

  var hadController = !!(navigator.serviceWorker && navigator.serviceWorker.controller);

  purge().then(function () {
    /* Si había SW controlando la página, forzar 1 recarga limpia */
    if (hadController) {
      try {
        if (sessionStorage.getItem(RELOAD_KEY) !== '1') {
          sessionStorage.setItem(RELOAD_KEY, '1');
          window.location.reload();
          return;
        }
      } catch (e) {}
    }
    try { sessionStorage.removeItem(RELOAD_KEY); } catch (e2) {}
  }).catch(function () {});
})();
