/* Aplica permisos del usuario logueado a la UI */
'use strict';

(function () {
  var perms = null;

  function isSuper() {
    var u = (localStorage.getItem('romex_user_login') ||
             sessionStorage.getItem('romex_user_login') || '').toLowerCase();
    return u === 'admin' || u === 'rodrigo';
  }

  async function loadPerms() {
    if (isSuper()) {
      perms = { ver_micro: true, ver_fisico: true, editar: true, mes_desde: 1, mes_hasta: 12, super: true };
      window.romexPermisos = perms;
      return perms;
    }
    try {
      if (typeof api !== 'function') return null;
      var data = await api('/me/permisos');
      perms = data.permisos || { ver_micro: true, ver_fisico: true, editar: false, mes_desde: 1, mes_hasta: 12 };
      if (data.super_user) {
        perms.super = true;
        perms.editar = true;
        perms.ver_micro = true;
        perms.ver_fisico = true;
      }
      window.romexPermisos = perms;
      // Si no puede editar, forzar modo LECTOR en la UI
      if (!perms.editar && typeof isAdmin !== 'undefined') {
        window.isAdmin = false;
        if (typeof userRol !== 'undefined') window.userRol = 'LECTOR';
        if (typeof applyRoleUI === 'function') applyRoleUI();
      }
      applyModeVisibility();
      return perms;
    } catch (e) {
      console.warn('permisos:', e.message);
      return null;
    }
  }

  function applyModeVisibility() {
    if (!perms) return;
    var segs = document.querySelectorAll('.seg');
    segs.forEach(function (b) {
      var mode = b.getAttribute('data-mode');
      if (mode === 'micro' && perms.ver_micro === false) b.style.display = 'none';
      else if (mode === 'fisico' && perms.ver_fisico === false) b.style.display = 'none';
      else b.style.display = '';
    });
    // Si el modo activo no está permitido, cambiar
    if (typeof activeMode !== 'undefined') {
      if (activeMode === 'micro' && perms.ver_micro === false && perms.ver_fisico !== false) {
        window.activeMode = 'fisico';
        var p = typeof products !== 'undefined' && products.find(function (x) { return x.codigo === activeCodigo; });
        if (p && typeof renderFisico === 'function') renderFisico(p);
        document.querySelectorAll('.seg').forEach(function (b) {
          b.classList.toggle('active', b.dataset.mode === 'fisico');
        });
      } else if (activeMode === 'fisico' && perms.ver_fisico === false && perms.ver_micro !== false) {
        window.activeMode = 'micro';
        var p2 = typeof products !== 'undefined' && products.find(function (x) { return x.codigo === activeCodigo; });
        if (p2 && typeof renderMicro === 'function') renderMicro(p2);
        document.querySelectorAll('.seg').forEach(function (b) {
          b.classList.toggle('active', b.dataset.mode === 'micro');
        });
      }
    }
  }

  // Filtrar meses visibles en tabs
  var origRenderTabs = null;
  function patchRenderTabs() {
    if (typeof renderTabs !== 'function' || origRenderTabs) return;
    origRenderTabs = renderTabs;
    window.renderTabs = function () {
      origRenderTabs.apply(this, arguments);
      if (!perms || perms.super) return;
      var desde = perms.mes_desde || 1;
      var hasta = perms.mes_hasta || 12;
      document.querySelectorAll('#monthTabs .tab[data-m]').forEach(function (tab) {
        var m = parseInt(tab.getAttribute('data-m'), 10);
        if (m < desde || m > hasta) tab.style.display = 'none';
        else tab.style.display = '';
      });
      // Si el mes activo está fuera de rango, elegir uno válido
      if (typeof activeMonth !== 'undefined' && (activeMonth < desde || activeMonth > hasta)) {
        var first = document.querySelector('#monthTabs .tab[data-m]:not([style*="display: none"])');
        if (first) {
          window.activeMonth = parseInt(first.getAttribute('data-m'), 10);
          first.classList.add('active');
        }
      }
    };
  }

  // Bloquear edición si no tiene permiso
  function enforceNoEdit() {
    if (!perms || perms.editar || perms.super) return;
    window.isAdmin = false;
    document.querySelectorAll('.admin-only').forEach(function (el) { el.hidden = true; });
    document.querySelectorAll('td input[data-f]').forEach(function (inp) {
      inp.disabled = true;
    });
  }

  var n = 0;
  function boot() {
    n++;
    if (typeof api !== 'function') {
      if (n < 80) setTimeout(boot, 100);
      return;
    }
    loadPerms().then(function () {
      patchRenderTabs();
      enforceNoEdit();
      // Re-aplicar cuando cambie el contenido
      var obs = new MutationObserver(function () {
        enforceNoEdit();
        applyModeVisibility();
      });
      var content = document.getElementById('content');
      if (content) obs.observe(content, { childList: true, subtree: true });
    });
  }
  setTimeout(boot, 400);
  setTimeout(boot, 1200);
  setTimeout(boot, 2500);
})();
