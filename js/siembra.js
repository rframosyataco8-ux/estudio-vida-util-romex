/* Romex QC — siembra / punto de partida v1.5.7
 * Solo ADMIN puede editar la tablita de promedio de siembra (punto de partida).
 * Etiqueta simplificada a «Siembra».
 * Lote 44260304 → 2603 → MARZO (no mayo).
 * El mes de siembra SIEMPRE aparece en tabs aunque no exista fila en BD.
 */
'use strict';

(function () {
  function getBl(codigo) {
    codigo = codigo || (typeof activeCodigo !== 'undefined' ? activeCodigo : '');
    if (typeof romexGetBaseline === 'function') return romexGetBaseline(codigo);
    var all = window.ROMEX_BASELINES && window.ROMEX_BASELINES.products;
    return (all && all[codigo]) || {
      anioInicio: 2026, mesInicio: 5, fechaSiembra: null,
      micro: { rtamv: 0, mohos: 0, coliformes: 0, ecoli: 0, enterobacterias: 0, levaduras: 0, saureus: 0 },
      fisico: {}
    };
  }

  function canEditSiembra() {
    if (typeof isAdmin !== 'undefined' && isAdmin) return true;
    var rol = (localStorage.getItem('romex_rol') || sessionStorage.getItem('romex_rol') || '').toUpperCase();
    if (rol === 'ADMIN') return true;
    var u = (localStorage.getItem('romex_user_login') || sessionStorage.getItem('romex_user_login') ||
             localStorage.getItem('romex_user') || sessionStorage.getItem('romex_user') || '').toLowerCase();
    return u === 'admin' || u === 'rodrigo' || u === 'administrador';
  }

  window.romexParseLoteYYMM = function (lote) {
    var s = String(lote || '');
    var m = s.match(/(\d{2})(0[1-9]|1[0-2])/);
    if (!m) return null;
    return { anio: 2000 + parseInt(m[1], 10), mes: parseInt(m[2], 10) };
  };

  window.romexIsStartMonth = function () {
    var bl = getBl();
    return typeof activeYear !== 'undefined' && typeof activeMonth !== 'undefined' &&
      +activeYear === +bl.anioInicio && +activeMonth === +bl.mesInicio;
  };

  window.romexSetMonthFromBaseline = function (codigo) {
    var bl = getBl(codigo);
    if (bl.anioInicio) {
      if (typeof activeYear !== 'undefined') activeYear = +bl.anioInicio;
      var ys = document.getElementById('yearSelect');
      if (ys) ys.value = String(bl.anioInicio);
    }
    if (bl.mesInicio && typeof activeMonth !== 'undefined') {
      activeMonth = +bl.mesInicio;
    }
  };

  /** Fila sintética = promedio de siembra (cuando no hay registro en BD para el mes inicio) */
  window.romexSyntheticSiembraRow = function (mode) {
    var bl = getBl();
    var row = {
      anio: bl.anioInicio,
      mes: bl.mesInicio,
      fecha_analisis: bl.fechaSiembra || null,
      estado: 'SIEMBRA',
      analista: 'Promedio parrillas',
      _siembra: true
    };
    if (mode === 'fisico') {
      var f = bl.fisico || {};
      ['humedad', 'ph', 'ceniza', 'grasa', 'fineza', 'acidez'].forEach(function (k) {
        row[k] = f[k] != null ? f[k] : null;
      });
    } else {
      var m = bl.micro || {};
      ['rtamv', 'mohos', 'coliformes', 'ecoli', 'enterobacterias', 'levaduras', 'saureus'].forEach(function (k) {
        row[k] = m[k] != null ? +m[k] : 0;
      });
    }
    return row;
  };

  window.romexSiembraNoteHtml = function () {
    var bl = getBl();
    var mesNom = (typeof MONTH_NAMES !== 'undefined' && MONTH_NAMES[bl.mesInicio])
      ? MONTH_NAMES[bl.mesInicio] : bl.mesInicio;
    var fecha = bl.fechaSiembra || '—';
    var isStart = window.romexIsStartMonth();
    var avgHint = '';
    if (bl.micro) {
      avgHint = ' · RTAMV: ' + (bl.micro.rtamv != null ? bl.micro.rtamv : '—') +
        ' · Mohos: ' + (bl.micro.mohos != null ? bl.micro.mohos : '—');
    }
    var editHint = '';
    if (isStart && canEditSiembra()) {
      editHint = ' · <em>Puedes editar el promedio (solo administrador)</em>';
    } else if (isStart) {
      editHint = ' · <em>Solo promedio de siembra (solo lectura)</em>';
    }
    return '<div class="siembra-note' + (isStart ? ' is-start' : '') + '">' +
      '<span class="material-icons-outlined" style="font-size:16px;vertical-align:middle">science</span> ' +
      '<strong>Siembra</strong> · ' + mesNom + ' ' + (bl.anioInicio || '') +
      (fecha && fecha !== '—' ? ' · Fecha: ' + fecha : '') +
      avgHint +
      (isStart
        ? editHint
        : ' · Comparación: siembra vs resultado del mes') +
      '</div>';
  };

  function injectNote() {
    var content = document.getElementById('content');
    if (!content || content.querySelector('.siembra-note')) return;
    if (!content.querySelector('.card')) return;
    content.insertAdjacentHTML('afterbegin', romexSiembraNoteHtml());
  }

  var siembraSaveTimer = null;

  function ensureBaselineProduct(codigo) {
    if (!window.ROMEX_BASELINES) window.ROMEX_BASELINES = { products: {} };
    if (!window.ROMEX_BASELINES.products) window.ROMEX_BASELINES.products = {};
    if (!window.ROMEX_BASELINES.products[codigo]) {
      window.ROMEX_BASELINES.products[codigo] = getBl(codigo);
    }
    return window.ROMEX_BASELINES.products[codigo];
  }

  async function saveSiembraBaseline(mode) {
    if (!canEditSiembra() || !activeCodigo) return;
    var inputs = document.querySelectorAll('td input[data-siembra-f]');
    if (!inputs.length) return;
    var bl = ensureBaselineProduct(activeCodigo);
    if (mode === 'fisico') {
      if (!bl.fisico) bl.fisico = {};
      inputs.forEach(function (inp) {
        var k = inp.getAttribute('data-siembra-f');
        var v = parseFloat(inp.value);
        bl.fisico[k] = Number.isFinite(v) ? Math.round(v * 100) / 100 : null;
      });
    } else {
      if (!bl.micro) bl.micro = {};
      inputs.forEach(function (inp) {
        var k = inp.getAttribute('data-siembra-f');
        var v = parseInt(inp.value, 10);
        bl.micro[k] = Number.isFinite(v) && v >= 0 ? v : 0;
      });
    }
    if (typeof setSaveInd === 'function') setSaveInd('saving', 'Guardando siembra…');
    try {
      if (typeof api === 'function') {
        await api('/baselines/' + encodeURIComponent(activeCodigo), {
          method: 'PUT',
          body: JSON.stringify({
            micro: bl.micro,
            fisico: bl.fisico,
            anioInicio: bl.anioInicio,
            mesInicio: bl.mesInicio,
            fechaSiembra: bl.fechaSiembra || null,
            lote: bl.lote || null
          })
        });
      }
      if (typeof setSaveInd === 'function') {
        setSaveInd('saved', 'Siembra guardada');
        setTimeout(function () { setSaveInd('', ''); }, 2500);
      }
      if (typeof snack === 'function') snack('Promedio de siembra actualizado');
      /* Redibujar gráficos con nuevos valores */
      var d = romexSyntheticSiembraRow(mode);
      if (mode === 'micro' && typeof drawMicroBar === 'function') drawMicroBar(d);
      if (mode === 'fisico' && typeof drawFisicoBar === 'function') {
        var fields = ['humedad', 'ph', 'ceniza', 'grasa', 'fineza', 'acidez'].filter(function (k) {
          return d[k] != null && d[k] !== '';
        });
        if (!fields.length) fields = ['humedad', 'ph', 'ceniza', 'grasa'];
        drawFisicoBar(d, fields);
      }
      if (mode === 'micro' && typeof drawMicroTrend === 'function') drawMicroTrend();
      if (mode === 'fisico' && typeof drawHumTrend === 'function') drawHumTrend();
    } catch (e) {
      if (typeof setSaveInd === 'function') setSaveInd('', '');
      if (typeof snack === 'function') snack('Error al guardar siembra: ' + (e.message || e));
      else alert('Error al guardar siembra: ' + (e.message || e));
    }
  }

  function scheduleSiembraSave(mode) {
    if (!canEditSiembra()) return;
    clearTimeout(siembraSaveTimer);
    if (typeof setSaveInd === 'function') setSaveInd('saving', 'Guardando…');
    siembraSaveTimer = setTimeout(function () { saveSiembraBaseline(mode); }, 800);
  }

  /* —— Tendencias —— */
  window.romexDrawMicroTrendSiembra = function () {
    var cv = document.getElementById('cTrend');
    if (!cv || typeof Chart === 'undefined') return false;
    if (typeof chartTrend !== 'undefined' && chartTrend) {
      try { chartTrend.destroy(); } catch (e) {}
      chartTrend = null;
    }
    var rows = typeof microRows !== 'undefined' ? microRows.slice() : [];
    var bl = getBl();
    if (bl.mesInicio && !rows.some(function (r) { return +r.mes === +bl.mesInicio; })) {
      rows.unshift(romexSyntheticSiembraRow('micro'));
      rows.sort(function (a, b) { return a.mes - b.mes; });
    }
    if (!rows.length) return false;
    var labels = rows.map(function (r) {
      return (MONTH_NAMES && MONTH_NAMES[r.mes]) ? MONTH_NAMES[r.mes] : String(r.mes);
    });
    var baseR = bl.micro && bl.micro.rtamv != null ? +bl.micro.rtamv : 0;
    var baseM = bl.micro && bl.micro.mohos != null ? +bl.micro.mohos : 0;
    var n = rows.length;
    var dark = document.documentElement.getAttribute('data-theme') === 'dark';
    chartTrend = new Chart(cv, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          { label: 'Siembra RTAMV', data: Array(n).fill(baseR), borderColor: '#90a4ae', borderDash: [6, 4], pointRadius: 0, fill: false, tension: 0, borderWidth: 2 },
          { label: 'RTAMV mes', data: rows.map(function (r) { return +r.rtamv || 0; }), borderColor: '#1565c0', backgroundColor: 'rgba(21,101,192,0.12)', fill: true, tension: 0.35, pointRadius: 4, borderWidth: 2.5 },
          { label: 'Siembra Mohos', data: Array(n).fill(baseM), borderColor: '#bcaaa4', borderDash: [6, 4], pointRadius: 0, fill: false, tension: 0, borderWidth: 2, yAxisID: 'y1' },
          { label: 'Mohos mes', data: rows.map(function (r) { return +r.mohos || 0; }), borderColor: '#ef6c00', backgroundColor: 'rgba(239,108,0,0.1)', fill: true, tension: 0.35, pointRadius: 4, borderWidth: 2.5, yAxisID: 'y1' }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
          datalabels: { display: false },
          title: { display: true, text: 'Tendencia · Siembra (punteada) vs resultado', font: { size: 12, weight: '500' }, color: dark ? '#90caf9' : '#1565c0' }
        },
        scales: {
          y: { position: 'left', title: { display: true, text: 'RTAMV', font: { size: 10 } }, beginAtZero: true },
          y1: { position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'Mohos', font: { size: 10 } }, beginAtZero: true }
        }
      }
    });
    return true;
  };

  window.romexDrawFisicoTrendSiembra = function () {
    var cv = document.getElementById('cTrend');
    if (!cv || typeof Chart === 'undefined') return false;
    if (typeof chartTrend !== 'undefined' && chartTrend) {
      try { chartTrend.destroy(); } catch (e) {}
      chartTrend = null;
    }
    var rows = typeof fisicoRows !== 'undefined' ? fisicoRows.slice() : [];
    var bl = getBl();
    if (bl.mesInicio && !rows.some(function (r) { return +r.mes === +bl.mesInicio; })) {
      rows.unshift(romexSyntheticSiembraRow('fisico'));
      rows.sort(function (a, b) { return a.mes - b.mes; });
    }
    if (!rows.length) return false;
    var labels = rows.map(function (r) {
      return (MONTH_NAMES && MONTH_NAMES[r.mes]) ? MONTH_NAMES[r.mes] : String(r.mes);
    });
    var baseH = bl.fisico && bl.fisico.humedad != null ? +bl.fisico.humedad : 0;
    var n = rows.length;
    var dark = document.documentElement.getAttribute('data-theme') === 'dark';
    chartTrend = new Chart(cv, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          { label: 'Siembra % Humedad', data: Array(n).fill(baseH), borderColor: '#90a4ae', borderDash: [6, 4], pointRadius: 0, fill: false, tension: 0, borderWidth: 2 },
          { label: '% Humedad mes', data: rows.map(function (r) { return +r.humedad || 0; }), borderColor: '#1565c0', backgroundColor: 'rgba(21,101,192,0.12)', fill: true, tension: 0.35, pointRadius: 4, borderWidth: 2.5 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
          datalabels: { display: false },
          title: { display: true, text: 'Tendencia · Siembra vs % Humedad', font: { size: 12, weight: '500' }, color: dark ? '#90caf9' : '#1565c0' }
        },
        scales: { y: { beginAtZero: true, title: { display: true, text: '% Humedad', font: { size: 10 } } } }
      }
    });
    return true;
  };

  var tries = 0;
  function patch() {
    tries++;
    if (typeof renderTabs !== 'function' || typeof loadAndShow !== 'function') {
      if (tries < 100) setTimeout(patch, 40);
      return;
    }

    /* 1) Tabs: SIEMPRE incluir mes de siembra del lote */
    var origTabs = renderTabs;
    window.renderTabs = function () {
      var bl = getBl();
      var months = [];
      if (typeof microRows !== 'undefined') {
        microRows.concat(typeof fisicoRows !== 'undefined' ? fisicoRows : []).forEach(function (r) {
          if (months.indexOf(+r.mes) < 0) months.push(+r.mes);
        });
      }
      if (bl.mesInicio && months.indexOf(+bl.mesInicio) < 0) {
        months.push(+bl.mesInicio);
      }
      months.sort(function (a, b) { return a - b; });
      if (months.indexOf(+activeMonth) < 0 && months.length) {
        if (bl.mesInicio && months.indexOf(+bl.mesInicio) >= 0) {
          activeMonth = +bl.mesInicio;
        } else {
          activeMonth = months[0];
        }
      }
      var el = document.getElementById('monthTabs');
      if (!el) return;
      el.innerHTML = months.map(function (m) {
        var label = (typeof MONTH_NAMES !== 'undefined' && MONTH_NAMES[m]) ? MONTH_NAMES[m] : String(m);
        var isSiembra = bl.mesInicio && +m === +bl.mesInicio;
        return '<button type="button" class="tab' + (m === activeMonth ? ' active' : '') +
          (isSiembra ? ' tab-siembra' : '') + '" data-m="' + m + '">' +
          label + (isSiembra ? ' · Siembra' : '') + '</button>';
      }).join('');
    };

    /* 2) loadAndShow: mes = mes del lote ANTES de renderizar */
    var origLoad = loadAndShow;
    window.loadAndShow = async function () {
      if (typeof activeCodigo !== 'undefined' && activeCodigo) {
        romexSetMonthFromBaseline(activeCodigo);
      }
      var res = await origLoad.apply(this, arguments);
      setTimeout(injectNote, 40);
      setTimeout(injectNote, 250);
      return res;
    };

    /* 3) renderMicro: si es mes siembra y no hay fila BD → promedio (editable solo ADMIN) */
    if (typeof renderMicro === 'function') {
      var origMicro = renderMicro;
      window.renderMicro = function (p) {
        var d = typeof rowFor === 'function' ? rowFor('micro') : null;
        if (!d && romexIsStartMonth()) {
          d = romexSyntheticSiembraRow('micro');
          var admin = canEditSiembra();
          var dis = admin ? '' : ' disabled';
          var headNote = admin
            ? ' <span style="font-size:10px">auto-guarda · solo administrador</span>'
            : ' <span style="font-size:10px">solo lectura</span>';
          document.getElementById('content').innerHTML =
            '<div class="card full"><div class="doc-bar"><div><div class="doc-co">EXPORTADORA ROMEX S.A.</div>' +
            '<div class="doc-pl">Planta Cacao Chincha · Microbiología · Siembra</div></div>' +
            '<div class="doc-meta">I-EVUP-R-309</div></div>' +
            '<div class="doc-head">Siembra · ' + (p && p.nombre ? p.nombre : '') + ' · ' +
            (MONTH_NAMES[activeMonth] || activeMonth) + ' ' + activeYear + '</div>' +
            '<div class="info-grid">' +
            '<div class="info-cell"><div class="info-lbl">Producto</div><div class="info-val">' + (p && p.nombre ? p.nombre : '') + '</div></div>' +
            '<div class="info-cell"><div class="info-lbl">Lote</div><div class="info-val">' + (p && p.lote ? p.lote : '') + '</div></div>' +
            '<div class="info-cell"><div class="info-lbl">Fecha siembra</div><div class="info-val">' + (d.fecha_analisis || '—') + '</div></div>' +
            '<div class="info-cell"><div class="info-lbl">Estado</div><div class="info-val"><span class="badge warn">SIEMBRA</span></div></div></div></div>' +
            '<div class="card full"><div class="card-title">Promedio de siembra (ufc/gr)' + headNote + '</div>' +
            '<div class="table-wrap"><table><thead><tr>' +
            MICRO_KEYS.map(function (k) { return '<th>' + MICRO_LABELS[k] + '</th>'; }).join('') +
            '</tr></thead><tbody><tr>' +
            MICRO_KEYS.map(function (k) {
              return '<td><input type="number" min="0" data-siembra-f="' + k + '" value="' + (d[k] || 0) + '"' + dis + '></td>';
            }).join('') +
            '</tr></tbody></table></div></div>' +
            (typeof chartCardHtml === 'function' ? chartCardHtml() : '<div class="card full"><canvas id="cMain"></canvas></div>') +
            '<div class="card full"><div class="card-title">Tendencia</div><div class="chart-box sm"><canvas id="cTrend"></canvas></div></div>';
          setTimeout(function () {
            if (typeof drawMicroBar === 'function') drawMicroBar(d);
            if (typeof drawMicroTrend === 'function') drawMicroTrend();
            injectNote();
          }, 50);
          return;
        }
        origMicro(p);
        setTimeout(injectNote, 60);
      };
    }

    if (typeof renderFisico === 'function') {
      var origFisico = renderFisico;
      window.renderFisico = function (p) {
        var d = typeof rowFor === 'function' ? rowFor('fisico') : null;
        if (!d && romexIsStartMonth()) {
          d = romexSyntheticSiembraRow('fisico');
          var fields = ['humedad', 'ph', 'ceniza', 'grasa', 'fineza', 'acidez'].filter(function (k) {
            return d[k] != null && d[k] !== '';
          });
          if (!fields.length) fields = ['humedad', 'ph', 'ceniza', 'grasa'];
          var admin = canEditSiembra();
          var dis = admin ? '' : ' disabled';
          var headNote = admin
            ? ' <span style="font-size:10px">auto-guarda · solo administrador</span>'
            : ' <span style="font-size:10px">solo lectura</span>';
          document.getElementById('content').innerHTML =
            '<div class="card full"><div class="doc-head">Siembra · físicoquímico · ' +
            (p && p.nombre ? p.nombre : '') + ' · ' + (MONTH_NAMES[activeMonth] || '') + ' ' + activeYear + '</div></div>' +
            '<div class="card full"><div class="card-title">Promedio de siembra' + headNote + '</div>' +
            '<div class="table-wrap"><table><thead><tr>' +
            fields.map(function (k) { return '<th>' + (FISICO_LABELS[k] || k) + '</th>'; }).join('') +
            '</tr></thead><tbody><tr>' +
            fields.map(function (k) {
              return '<td><input type="number" step="0.01" data-siembra-f="' + k + '" value="' + d[k] + '"' + dis + '></td>';
            }).join('') +
            '</tr></tbody></table></div></div>' +
            (typeof chartCardHtml === 'function' ? chartCardHtml() : '') +
            '<div class="card full"><div class="card-title">Tendencia</div><div class="chart-box sm"><canvas id="cTrend"></canvas></div></div>';
          setTimeout(function () {
            if (typeof drawFisicoBar === 'function') drawFisicoBar(d, fields);
            if (typeof drawHumTrend === 'function') drawHumTrend();
            injectNote();
          }, 50);
          return;
        }
        origFisico(p);
        setTimeout(injectNote, 60);
      };
    }

    if (typeof drawMicroTrend === 'function') {
      window.drawMicroTrend = function () { romexDrawMicroTrendSiembra(); };
    }
    if (typeof drawHumTrend === 'function') {
      window.drawHumTrend = function () { romexDrawFisicoTrendSiembra(); };
    }

    /* Input en tabla de siembra: solo ADMIN guarda baseline */
    document.addEventListener('input', function (e) {
      var inp = e.target;
      if (!inp || !inp.getAttribute || !inp.getAttribute('data-siembra-f')) return;
      if (!canEditSiembra()) return;
      var mode = (typeof activeMode !== 'undefined' ? activeMode : 'micro');
      scheduleSiembraSave(mode);
    });

    /* 4) Click producto: NO dejar activeMonth=5 — forzar mes del lote */
    document.addEventListener('click', function (e) {
      var ni = e.target.closest('.nav-item');
      if (ni && ni.dataset.c) {
        var cod = ni.dataset.c;
        setTimeout(function () {
          romexSetMonthFromBaseline(cod);
        }, 0);
      }
      if (e.target.closest('.tab') || e.target.closest('.seg') || ni) {
        setTimeout(injectNote, 150);
      }
    }, true);

    var content = document.getElementById('content');
    if (content && window.MutationObserver) {
      new MutationObserver(function () { setTimeout(injectNote, 30); }).observe(content, { childList: true });
    }

    console.log('[Romex siembra] v1.5.7 activo — edición solo ADMIN');
  }
  patch();
})();
