/* Romex QC UI helpers v1.5.1 — complementos visuales (lógica core en app.js) */
'use strict';
(function () {
  function openProducts() {
    var btn = document.getElementById('productsToggle');
    var nav = document.getElementById('productNav');
    if (!btn || !nav) return;
    nav.classList.add('open');
    btn.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(openProducts, 300);
      setTimeout(openProducts, 900);
    });
  } else {
    setTimeout(openProducts, 300);
  }
})();
