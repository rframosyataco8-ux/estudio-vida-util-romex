/* Romex QC v1.3 — export, comparar, auditoría, dark mode, alertas, tendencia */
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

  function injectAlerts(mode) {
    var content = $('content');
    if (!content) return;
    var d = typeof rowFor === 'function' ? rowFor(mode) : null;
    if (!d || !d.alertas || !d.alertas.length) return;
    if (content.querySelector('.alert-banner')) return;
    var msgs = d.alertas.map(function (a) {
      return a.label + ': ' + a.valor + (a.tipo === 'max' ? ' > máx ' : ' < mín ') + a.limite;
    }).join(' · ');
    var banner = document.createElement('div');
    banner.className = 'alert-banner';
    banner.innerHTML = '<strong>⚠ Valores fuera de límite orientativo</strong>' + msgs;
    content.insertBefore(banner, content.firstChild);
  }

  function injectTrendSelect() {
    var titles = document.querySelectorAll('.card-title');
    var trendTitle = null;
    titles.forEach(function (t) {
      if (t.textContent.indexOf('Tendencia') >= 0) trendTitle = t;
    });
    if (!trendTitle || trendTitle.querySelector('#trendParamSel')) return;
    trendTitle.classList.add('card-title-trend');
    var sel = document.createElement('select');
    sel.id = 'trendParamSel';
    sel.className = 'year-select';
    sel.style.marginLeft = 'auto';
    sel.style.fontSize = '11px';
    ['humedad', 'ph', 'ceniza', 'grasa', 'fineza', 'acidez'].forEach(function (k) {
      var o = document.createElement('option');
      o.value = k;
      o.textContent = (typeof FISICO_LABELS !== 'undefined' && FISICO_LABELS[k]) ? FISICO_LABELS[k] : k;
      if (k === (window.trendParam || 'humedad')) o.selected = true;
      sel.appendChild(o);
    });
    trendTitle.style.display = 'flex';
    trendTitle.style.alignItems = 'center';
    trendTitle.appendChild(sel);
  }

  window.trendParam = 'humedad';

  window.drawFisicoTrendParam = function () {
    var cv = document.getElementById('cTrend');
    if (!cv || typeof Chart === 'undefined' || typeof fisicoRows === 'undefined') return;
    if (typeof chartTrend !== 'undefined' && chartTrend) {
      try { chartTrend.destroy(); } catch (e) {}
      chartTrend = null;
    }
    var key = window.trendParam || 'humedad';
    var label = (typeof FISICO_LABELS !== 'undefined' && FISICO_LABELS[key]) ? FISICO_LABELS[key] : key;
    var color = (typeof COLORS !== 'undefined' && COLORS[key]) ? COLORS[key] : '#1565c0';
    chartTrend = new Chart(cv, {
      type: 'line',
      data: {
        labels: fisicoRows.map(function (r) { return MONTH_NAMES[r.mes]; }),
        datasets: [{
          data: fisicoRows.map(function (r) { return r[key] != null && r[key] !== '' ? +r[key] : null; }),
          borderColor: color,
          fill: true,
          tension: 0.35,
          pointRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          datalabels: {
            color: color,
            anchor: 'end',
            align: 'top',
            formatter: function (v) { return v == null ? '' : (+v).toFixed(2); }
          }
        }
      }
    });
  };

  /* Envolver renders cuando existan */
  function wrapRenders() {
    if (typeof renderMicro === 'function' && !renderMicro._romexWrapped) {
      var om = renderMicro;
      renderMicro = function (p) {
        om(p);
        setTimeout(function () { injectAlerts('micro'); }, 30);
      };
      renderMicro._romexWrapped = true;
    }
    if (typeof renderFisico === 'function' && !renderFisico._romexWrapped) {
      var of = renderFisico;
      renderFisico = function (p) {
        of(p);
        setTimeout(function () {
          injectAlerts('fisico');
          injectTrendSelect();
          window.drawFisicoTrendParam();
        }, 40);
      };
      renderFisico._romexWrapped = true;
    }
  }
  wrapRenders();
  setTimeout(wrapRenders, 500);
  setTimeout(wrapRenders, 1500);

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
    if (typeof snack === 'function') snack('CSV descargado (ábrelo en Excel)');
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
        box.innerHTML = '<p>Sin registros. Ejecuta <code>sql/05_auditoria.sql</code> en SSMS y realiza cambios.</p>';
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
      box.innerHTML = '<p>' + e.message + '</p><p>¿Ejecutaste sql/05_auditoria.sql?</p>';
    }
  };

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
      window.drawFisicoTrendParam();
    }
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }
})();
