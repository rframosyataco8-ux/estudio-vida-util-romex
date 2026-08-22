/* Romex QC — lógica de siembra / punto de partida v1.5.2
 * - Lote YYMM → mes/año de inicio (ej. 13260318 → 2603 → marzo 2026)
 * - Punto de partida = promedio de parrillas (baselines.json)
 * - Mes inicio: solo siembra en gráfico 3D
 * - Meses siguientes: siembra vs resultado
 * - Tendencia: línea de siembra (constante) + línea de resultados
 */
'use strict';

(function () {
  function getBl(codigo) {
    if (typeof romexGetBaseline === 'function') return romexGetBaseline(codigo);
    var all = window.ROMEX_BASELINES && window.ROMEX_BASELINES.products;
    return (all && all[codigo]) || {
      anioInicio: 2026, mesInicio: 5,
      micro: { rtamv: 0, mohos: 0, coliformes: 0, ecoli: 0, enterobacterias: 0, levaduras: 0, saureus: 0 },
      fisico: {}
    };
  }

  /** Extrae YYMM del lote (busca patrón 2 dígitos año + 2 dígitos mes 01-12) */
  window.romexParseLoteYYMM = function (lote) {
    var s = String(lote || '');
    var m = s.match(/(\d{2})(0[1-9]|1[0-2])/);
    if (!m) return null;
    var yy = parseInt(m[1], 10);
    var mm = parseInt(m[2], 10);
    var anio = yy >= 20 ? 2000 + yy : 2000 + yy;
    return { anio: anio, mes: mm };
  };

  window.romexIsStartMonth = function () {
    var bl = getBl(typeof activeCodigo !== 'undefined' ? activeCodigo : '');
    return typeof activeYear !== 'undefined' && typeof activeMonth !== 'undefined' &&
      activeYear === bl.anioInicio && activeMonth === bl.mesInicio;
  };

  /** Al elegir producto, ir al mes de inicio del lote */
  window.romexSetMonthFromBaseline = function (codigo) {
    var bl = getBl(codigo);
    if (bl.anioInicio) {
      if (typeof activeYear !== 'undefined') activeYear = bl.anioInicio;
      var ys = document.getElementById('yearSelect');
      if (ys) ys.value = String(bl.anioInicio);
    }
    if (bl.mesInicio) {
      if (typeof activeMonth !== 'undefined') activeMonth = bl.mesInicio;
    }
  };

  /** Badge / nota de siembra en el content */
  window.romexSiembraNoteHtml = function () {
    var bl = getBl(typeof activeCodigo !== 'undefined' ? activeCodigo : '');
    var mesNom = (typeof MONTH_NAMES !== 'undefined' && MONTH_NAMES[bl.mesInicio])
      ? MONTH_NAMES[bl.mesInicio] : bl.mesInicio;
    var fecha = bl.fechaSiembra || '—';
    var isStart = window.romexIsStartMonth();
    return '<div class="siembra-note' + (isStart ? ' is-start' : '') + '">' +
      '<span class="material-icons-outlined" style="font-size:16px;vertical-align:middle">science</span> ' +
      '<strong>Punto de partida (siembra)</strong> · ' + mesNom + ' ' + (bl.anioInicio || '') +
      (fecha && fecha !== '—' ? ' · Fecha siembra: ' + fecha : '') +
      (isStart
        ? ' · <em>Este mes muestra solo el promedio de siembra</em>'
        : ' · Comparación: siembra vs resultado del mes') +
      '</div>';
  };

  function baselineArray(keys, side) {
    var bl = getBl(typeof activeCodigo !== 'undefined' ? activeCodigo : '');
    var src = side === 'fisico' ? (bl.fisico || {}) : (bl.micro || {});
    return keys.map(function (k) {
      return src[k] != null ? +src[k] : 0;
    });
  }

  /** Tendencia micro: siembra (constante) + RTAMV/Mohos mensuales */
  window.romexDrawMicroTrendSiembra = function () {
    var cv = document.getElementById('cTrend');
    if (!cv || typeof Chart === 'undefined') return false;
    if (typeof chartTrend !== 'undefined' && chartTrend) {
      try { chartTrend.destroy(); } catch (e) {}
      chartTrend = null;
    }
    var rows = typeof microRows !== 'undefined' ? microRows : [];
    if (!rows.length) return false;

    var labels = rows.map(function (r) {
      return (typeof MONTH_NAMES !== 'undefined' && MONTH_NAMES[r.mes]) ? MONTH_NAMES[r.mes] : String(r.mes);
    });
    var bl = getBl(typeof activeCodigo !== 'undefined' ? activeCodigo : '');
    var baseR = bl.micro && bl.micro.rtamv != null ? +bl.micro.rtamv : 0;
    var baseM = bl.micro && bl.micro.mohos != null ? +bl.micro.mohos : 0;
    var n = rows.length;
    var baseRLine = Array(n).fill(baseR);
    var baseMLine = Array(n).fill(baseM);

    var dark = document.documentElement.getAttribute('data-theme') === 'dark';
    chartTrend = new Chart(cv, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Siembra RTAMV',
            data: baseRLine,
            borderColor: '#90a4ae',
            borderDash: [6, 4],
            pointRadius: 0,
            fill: false,
            tension: 0,
            borderWidth: 2
          },
          {
            label: 'RTAMV mes',
            data: rows.map(function (r) { return +r.rtamv || 0; }),
            borderColor: '#1565c0',
            backgroundColor: 'rgba(21,101,192,0.12)',
            fill: true,
            tension: 0.35,
            pointRadius: 4,
            borderWidth: 2.5
          },
          {
            label: 'Siembra Mohos',
            data: baseMLine,
            borderColor: '#bcaaa4',
            borderDash: [6, 4],
            pointRadius: 0,
            fill: false,
            tension: 0,
            borderWidth: 2,
            yAxisID: 'y1'
          },
          {
            label: 'Mohos mes',
            data: rows.map(function (r) { return +r.mohos || 0; }),
            borderColor: '#ef6c00',
            backgroundColor: 'rgba(239,108,0,0.1)',
            fill: true,
            tension: 0.35,
            pointRadius: 4,
            borderWidth: 2.5,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
          datalabels: { display: false },
          title: {
            display: true,
            text: 'Tendencia · Siembra (línea punteada) vs resultado mensual',
            font: { size: 12, weight: '500' },
            color: dark ? '#90caf9' : '#1565c0'
          }
        },
        scales: {
          y: { position: 'left', title: { display: true, text: 'RTAMV', font: { size: 10 } }, beginAtZero: true },
          y1: { position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'Mohos', font: { size: 10 } }, beginAtZero: true }
        }
      }
    });
    return true;
  };

  /** Tendencia físico: siembra humedad constante + humedad mes */
  window.romexDrawFisicoTrendSiembra = function () {
    var cv = document.getElementById('cTrend');
    if (!cv || typeof Chart === 'undefined') return false;
    if (typeof chartTrend !== 'undefined' && chartTrend) {
      try { chartTrend.destroy(); } catch (e) {}
      chartTrend = null;
    }
    var rows = typeof fisicoRows !== 'undefined' ? fisicoRows : [];
    if (!rows.length) return false;

    var labels = rows.map(function (r) {
      return (typeof MONTH_NAMES !== 'undefined' && MONTH_NAMES[r.mes]) ? MONTH_NAMES[r.mes] : String(r.mes);
    });
    var bl = getBl(typeof activeCodigo !== 'undefined' ? activeCodigo : '');
    var baseH = bl.fisico && bl.fisico.humedad != null ? +bl.fisico.humedad : 0;
    var n = rows.length;
    var dark = document.documentElement.getAttribute('data-theme') === 'dark';

    chartTrend = new Chart(cv, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Siembra % Humedad',
            data: Array(n).fill(baseH),
            borderColor: '#90a4ae',
            borderDash: [6, 4],
            pointRadius: 0,
            fill: false,
            tension: 0,
            borderWidth: 2
          },
          {
            label: '% Humedad mes',
            data: rows.map(function (r) { return +r.humedad || 0; }),
            borderColor: '#1565c0',
            backgroundColor: 'rgba(21,101,192,0.12)',
            fill: true,
            tension: 0.35,
            pointRadius: 4,
            borderWidth: 2.5
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
          datalabels: {
            display: true,
            formatter: function (v, ctx) {
              if (ctx.datasetIndex === 0) return '';
              return (+v).toFixed(2) + '%';
            },
            color: dark ? '#e3f2fd' : '#1565c0',
            font: { size: 9 }
          },
          title: {
            display: true,
            text: 'Tendencia · Siembra vs % Humedad mensual',
            font: { size: 12, weight: '500' },
            color: dark ? '#90caf9' : '#1565c0'
          }
        },
        scales: { y: { beginAtZero: true, title: { display: true, text: '% Humedad', font: { size: 10 } } } }
      }
    });
    return true;
  };

  /* Parchear drawMicroTrend / drawHumTrend y cambio de producto */
  var tries = 0;
  function patch() {
    tries++;
    if (typeof drawMicroTrend !== 'function' && tries < 80) {
      setTimeout(patch, 50);
      return;
    }
    if (typeof drawMicroTrend === 'function') {
      window.drawMicroTrend = function () {
        if (window.romexDrawMicroTrendSiembra()) return;
      };
    }
    if (typeof drawHumTrend === 'function') {
      window.drawHumTrend = function () {
        if (window.romexDrawFisicoTrendSiembra()) return;
      };
    }

    /* Interceptar click de producto para fijar mes inicio */
    document.addEventListener('click', function (e) {
      var ni = e.target.closest('.nav-item');
      if (!ni || !ni.dataset.c) return;
      var cod = ni.dataset.c;
      setTimeout(function () {
        if (typeof activeCodigo !== 'undefined' && activeCodigo === cod) {
          window.romexSetMonthFromBaseline(cod);
        }
      }, 0);
    }, true);
  }
  patch();
})();
