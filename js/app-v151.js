/* Parche nativo v1.5.1 sobre app.js — skeletons, fade, menú productos */
'use strict';
(function () {
  function skeletonHtml() {
    return '<div class="loading-skel">' +
      '<div class="card full skeleton-card"><div class="skeleton skeleton-block" style="width:40%"></div>' +
      '<div class="skeleton skeleton-block" style="width:70%"></div>' +
      '<div class="skeleton skeleton-block" style="width:55%"></div></div>' +
      '<div class="card full"><div class="skeleton skeleton-chart"></div></div>' +
      '<div class="card full skeleton-card"><div class="skeleton skeleton-block" style="width:30%"></div>' +
      '<div class="skeleton skeleton-block" style="width:80%"></div></div></div>';
  }

  function openProducts() {
    var btn = document.getElementById('productsToggle');
    var nav = document.getElementById('productNav');
    if (!btn || !nav) return;
    nav.classList.add('open');
    btn.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
  }

  function contentFade(on) {
    var c = document.getElementById('content');
    if (!c) return;
    if (on) c.classList.add('is-switching');
    else requestAnimationFrame(function () { c.classList.remove('is-switching'); });
  }

  var n = 0;
  function tryPatch() {
    n++;
    if (typeof loadAndShow !== 'function') {
      if (n < 60) setTimeout(tryPatch, 50);
      return;
    }

    var orig = loadAndShow;
    window.loadAndShow = async function () {
      var el = document.getElementById('content');
      if (el) el.innerHTML = skeletonHtml();
      openProducts();
      return orig.apply(this, arguments);
    };

    openProducts();
    setTimeout(openProducts, 500);
    setTimeout(openProducts, 1500);

    document.addEventListener('click', function (e) {
      if (typeof sqlReady !== 'undefined' && !sqlReady) return;
      if (e.target.closest('.tab') || e.target.closest('.seg')) {
        contentFade(true);
        setTimeout(function () { contentFade(false); }, 280);
      }
    }, true);

    window.addEventListener('resize', function () {
      clearTimeout(window._romexRz);
      window._romexRz = setTimeout(function () {
        if (typeof romexRedrawTheme === 'function') romexRedrawTheme();
      }, 180);
    });
  }
  tryPatch();
})();
