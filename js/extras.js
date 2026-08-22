/* Romex QC v1.5 — export, comparar, auditoría, dark mode, eliminar mes, SW update */
'use strict';

(function () {
  function $(id) { return document.getElementById(id); }

  function applyTheme() {
    var t = localStorage.getItem('romex_theme') || 'light';
    document.documentElement.setAttribute('data-theme', t === 'dark' ? 'dark' : 'light');
  }
  applyTheme();

  window.toggleRomexTheme = function () {
    var cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    var next = cur === 'dark' ? 'light' : 'dark';
    localStorage.setItem('romex_theme', next);
    applyTheme();
  };

  window.exportCsv = function () {
    if (typeof microRows === 'undefined' || typeof activeCodigo === 'undefined') {
      alert('Datos no listos');
      return;
    }
    var mode = typeof activeMode !== 'undefined' ? activeMode : 'micro';
    var rows = mode === 'micro' ? microRows : fisicoRows;
    if (!rows || !rows.length) {
      if (typeof snack === 'function') snack('No hay datos para exportar');
      return;
    }
    var keys = Object.keys(rows[0]).filter(function (k) { return k !== 'alertas'; });
    var lines = [keys.join(';')];
    rows.forEach(function (r) {
      lines.push(keys.map(function (k) {
        var v = r[k] == null ? '' : String(r[k]);
        if (v.indexOf(';') >= 0 || v.indexOf('"') >= 0) v = '"' + v.replace(/"/g, '""') + '"';
        return v;
      }).join(';'));
    });
    var blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'romex_' + activeCodigo + '_' + mode + '_' + (typeof activeYear !== 'undefined' ? activeYear : 2026) + '.csv';
    a.click();
    URL.revokeObjectURL(a.href);
    if (typeof snack === 'function') snack('CSV descargado');
  };

  window.openCompareModal = function () {
    var selA = $('cmpA');
    var selB = $('cmpB');
    if (!selA || typeof products === 'undefined') return;
    selA.innerHTML = products.map(function (p) {
      return '<option value="' + p.codigo + '">' + p.nombre + '</option>';
    }).join('');
    selB.innerHTML = selA.innerHTML;
    if (products[1]) selB.value = products[1].codigo;
    if (typeof openModal === 'function') openModal('modalCompare');
  };

  window.runCompare = async function () {
    var a = $('cmpA').value;
    var b = $('cmpB').value;
    var year = typeof activeYear !== 'undefined' ? activeYear : 2026;
    var out = $('cmpResult');
    out.innerHTML = 'Cargando…';
    try {
      var ma = await api('/productos/' + a + '/micro?anio=' + year);
      var mb = await api('/productos/' + b + '/micro?anio=' + year);
      var fa = await api('/productos/' + a + '/fisico?anio=' + year);
      var fb = await api('/productos/' + b + '/fisico?anio=' + year);
      function avg(rows, key) {
        var s = 0, n = 0;
        rows.forEach(function (r) {
          if (r[key] != null && r[key] !== '') { s += +r[key]; n++; }
        });
        return n ? (s / n).toFixed(2) : '—';
      }
      var pa = products.find(function (p) { return p.codigo === a; });
      var pb = products.find(function (p) { return p.codigo === b; });
      out.innerHTML =
        '<div class="compare-grid">' +
        '<div><strong>' + (pa && pa.nombre) + '</strong><br>RTAMV prom: ' + avg(ma, 'rtamv') +
        '<br>Mohos prom: ' + avg(ma, 'mohos') + '<br>Humedad prom: ' + avg(fa, 'humedad') + '%</div>' +
        '<div><strong>' + (pb && pb.nombre) + '</strong><br>RTAMV prom: ' + avg(mb, 'rtamv') +
        '<br>Mohos prom: ' + avg(mb, 'mohos') + '<br>Humedad prom: ' + avg(fb, 'humedad') + '%</div>' +
        '</div>';
    } catch (e) {
      out.textContent = e.message;
    }
  };

  window.openAuditModal = async function () {
    if (typeof openModal === 'function') openModal('modalAudit');
    var box = $('auditList');
    box.innerHTML = 'Cargando…';
    try {
      var rows = await api('/auditoria?limit=80');
      if (!rows.length) {
        box.innerHTML = '<p>Sin registros. Ejecuta el script SQL de auditoría si aún no.</p>';
        return;
      }
      var html = '<table class="audit-table"><thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Entidad</th><th>Código</th><th>Mes</th></tr></thead><tbody>';
      rows.forEach(function (r) {
        var f = r.creado_en ? String(r.creado_en).replace('T', ' ').slice(0, 19) : '—';
        html += '<tr><td>' + f + '</td><td>' + (r.usuario_nombre || '—') + '</td><td>' +
          (r.accion || '') + '</td><td>' + (r.entidad || '') + '</td><td>' + (r.codigo || '—') +
          '</td><td>' + (r.mes || '—') + '</td></tr>';
      });
      html += '</tbody></table>';
      box.innerHTML = html;
    } catch (e) {
      box.innerHTML = '<p>' + e.message + '</p>';
    }
  };

  window.deleteActiveMonth = async function () {
    if (typeof isAdmin !== 'undefined' && !isAdmin) {
      if (typeof snack === 'function') snack('Solo ADMIN puede eliminar');
      return;
    }
    if (!activeCodigo || !activeMonth) return;
    var nombre = (MONTH_NAMES && MONTH_NAMES[activeMonth]) || activeMonth;
    if (!confirm('¿Eliminar ' + nombre + ' ' + activeYear + ' de este producto?\nSe borrarán microbiología y físicoquímico de ese mes.')) {
      return;
    }
    try {
      await api('/productos/' + activeCodigo + '/mes/' + activeMonth + '?anio=' + activeYear, {
        method: 'DELETE'
      });
      if (typeof snack === 'function') snack('Mes eliminado');
      if (typeof loadAndShow === 'function') await loadAndShow();
    } catch (e) {
      if (typeof snack === 'function') snack(e.message);
      else alert(e.message);
    }
  };

  function injectDeleteMonthBtn() {
    var tabs = document.getElementById('monthTabs');
    if (!tabs) return;
    if (tabs.querySelector('#deleteMonthBtn')) return;
    if (typeof isAdmin !== 'undefined' && !isAdmin) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'deleteMonthBtn';
    btn.className = 'tab admin-only';
    btn.title = 'Eliminar mes activo';
    btn.style.cssText = 'color:#c62828;margin-left:auto;border-bottom-color:transparent';
    btn.innerHTML = '<span class="material-icons-outlined" style="font-size:18px;vertical-align:middle">delete</span> Eliminar mes';
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      window.deleteActiveMonth();
    });
    tabs.appendChild(btn);
  }

  document.addEventListener('click', function (e) {
    if (e.target.closest('#themeBtn')) { window.toggleRomexTheme(); return; }
    if (e.target.closest('#exportBtn')) { window.exportCsv(); return; }
    if (e.target.closest('#compareBtn')) { window.openCompareModal(); return; }
    if (e.target.closest('#auditBtn')) { window.openAuditModal(); return; }
    if (e.target.closest('#runCompareBtn')) { window.runCompare(); return; }
  });

  document.addEventListener('change', function (e) {
    if (e.target && e.target.id === 'trendParamSel') {
      window.trendParam = e.target.value;
      if (typeof window.drawFisicoTrendParam === 'function') window.drawFisicoTrendParam();
    }
  });

  var obs = new MutationObserver(function () {
    injectDeleteMonthBtn();
  });
  var tabsEl = document.getElementById('monthTabs');
  if (tabsEl) obs.observe(tabsEl, { childList: true });
  setInterval(injectDeleteMonthBtn, 2000);

  /* Service worker: forzar actualización y limpiar cachés viejos */
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(function (reg) {
      reg.update();
      if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      reg.addEventListener('updatefound', function () {
        var nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', function () {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            /* Nueva versión lista — recargar una vez */
            if (!sessionStorage.getItem('romex_sw_reloaded')) {
              sessionStorage.setItem('romex_sw_reloaded', '1');
              window.location.reload();
            }
          }
        });
      });
    }).catch(function () {});

    /* Una vez: borrar caches antiguos del SW v13 */
    if (window.caches) {
      caches.keys().then(function (keys) {
        keys.forEach(function (k) {
          if (k.indexOf('romex-qc-') === 0 && k !== 'romex-qc-v15') {
            caches.delete(k);
          }
        });
      });
    }
  }
})();
