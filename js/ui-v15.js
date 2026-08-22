/* Romex QC UI v1.5.1 — skeletons, transiciones, menú productos abierto */
'use strict';
(function () {
  function skeletonHtml() {
    return '<div class="loading-skel">' +
      '<div class="card full skeleton-card"><div class="skeleton skeleton-block" style="width:40%"></div>' +
      '<div class="skeleton skeleton-block" style="width:70%"></div>' +
      '<div class="skeleton skeleton-block" style="width:55%"></div></div>' +
      '<div class="card full"><div class="skeleton skeleton-chart"></div></div>' +
      '<div class="card full skeleton-card"><div class="skeleton skeleton-block" style="width:30%"></div>' +
      '<div class="skeleton skeleton-block" style="width:80%"></div></div>' +
      '</div>';
  }
  window.romexSkeletonHtml = skeletonHtml;

  function contentSwitchStart() {
    var c = document.getElementById('content');
    if (c) c.classList.add('is-switching');
  }
  function contentSwitchEnd() {
    var c = document.getElementById('content');
    if (!c) return;
    requestAnimationFrame(function () { c.classList.remove('is-switching'); });
  }
  window.romexContentSwitchStart = contentSwitchStart;
  window.romexContentSwitchEnd = contentSwitchEnd;

  function openProductsMenu() {
    var btn = document.getElementById('productsToggle');
    var nav = document.getElementById('productNav');
    if (!btn || !nav) return;
    nav.classList.add('open');
    btn.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
  }

  var tries = 0;
  function patch() {
    tries++;
    if (typeof loadAndShow !== 'function') {
      if (tries < 50) setTimeout(patch, 40);
      return;
    }

    var origLoad = loadAndShow;
    window.loadAndShow = async function () {
      var el = document.getElementById('content');
      if (el) el.innerHTML = skeletonHtml();
      return origLoad.apply(this, arguments);
    };

    openProductsMenu();
    setTimeout(openProductsMenu, 400);
    setTimeout(openProductsMenu, 1200);

    document.addEventListener('click', function (e) {
      var tab = e.target.closest('.tab');
      var seg = e.target.closest('.seg');
      if ((tab || seg) && typeof sqlReady !== 'undefined' && sqlReady) {
        contentSwitchStart();
        setTimeout(contentSwitchEnd, 260);
      }
    }, true);
  }
  patch();
})();
