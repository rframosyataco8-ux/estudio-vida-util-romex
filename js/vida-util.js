/* Romex QC — Estudio de vida útil: punto de partida + gráficos duales */
'use strict';

var ROMEX_BASELINES = null;
var BASELINE_COLOR = '#90a4ae';
var MONTH_COLOR_MICRO = {
  rtamv: '#1565c0', mohos: '#ef6c00', coliformes: '#2e7d32', ecoli: '#43a047',
  enterobacterias: '#7b1fa2', levaduras: '#c2185b', saureus: '#c62828'
};

function parseLoteMesAnio(lote) {
  var s = String(lote || '');
  var m = s.match(/26(\d{2})/);
  if (m) {
    var mes = parseInt(m[1], 10);
    if (mes >= 1 && mes <= 12) return { anio: 2026, mes: mes };
  }
  m = s.match(/(\d{2})(\d{2})\d*$/);
  return { anio: 2026, mes: 5 };
}

async function loadBaselines() {
  if (ROMEX_BASELINES) return ROMEX_BASELINES;
  try {
    var base = (window.API_BASE || '') || '';
    var r = await fetch(base + '/data/baselines.json');
    if (!r.ok) r = await fetch('data/baselines.json');
    ROMEX_BASELINES = await r.json();
  } catch (e) {
    console.warn('baselines', e);
    ROMEX_BASELINES = { products: {} };
  }
  return ROMEX_BASELINES;
}

function getBaseline(codigo, lote) {
  var b = ROMEX_BASELINES && ROMEX_BASELINES.products && ROMEX_BASELINES.products[codigo];
  if (b) return b;
  var lm = parseLoteMesAnio(lote);
  return {
    anioInicio: lm.anio,
    mesInicio: lm.mes,
    fechaSiembra: null,
    micro: { rtamv: 0, mohos: 0, coliformes: 0, ecoli: 0, enterobacterias: 0, levaduras: 0, saureus: 0 },
    fisico: {}
  };
}

function isStartMonth(bl) {
  return typeof activeYear !== 'undefined' && typeof activeMonth !== 'undefined' &&
    activeYear === bl.anioInicio && activeMonth === bl.mesInicio;
}

function afterStartMonth(bl) {
  if (typeof activeYear === 'undefined') return false;
  if (activeYear > bl.anioInicio) return true;
  if (activeYear === bl.anioInicio && activeMonth > bl.mesInicio) return true;
  return false;
}

/** Gráfico de barras agrupadas: Punto de partida vs Resultado del mes */
function drawMicroBarDual(d, bl) {
  if (typeof destroyCharts === 'function') destroyCharts();
  var cv = document.getElementById('cMain');
  if (!cv || typeof Chart === 'undefined') return;

  var keys = typeof MICRO_KEYS !== 'undefined' ? MICRO_KEYS : ['rtamv', 'mohos', 'coliformes', 'ecoli', 'enterobacterias', 'levaduras', 'saureus'];
  var labels = keys.map(function (k) {
    return (typeof MICRO_LABELS !== 'undefined' && MICRO_LABELS[k]) ? MICRO_LABELS[k] : k;
  });
  var baseData = keys.map(function (k) { return (bl.micro && bl.micro[k] != null) ? +bl.micro[k] : 0; });
  var monthData = keys.map(function (k) { return d && d[k] != null ? +d[k] : 0; });
  var onlyBase = isStartMonth(bl) || !d;

  var datasets = [{
    label: 'Punto de partida (siembra)',
    data: baseData,
    backgroundColor: keys.map(function () { return BASELINE_COLOR; }),
    borderColor: '#607d8b',
    borderWidth: 1,
    borderRadius: 6,
    barPercentage: 0.7,
    categoryPercentage: 0.65
  }];

  if (!onlyBase) {
    datasets.push({
      label: 'Resultado ' + (typeof MONTH_NAMES !== 'undefined' ? MONTH_NAMES[activeMonth] : activeMonth),
      data: monthData,
      backgroundColor: keys.map(function (k) { return MONTH_COLOR_MICRO[k] || '#1565c0'; }),
      borderRadius: 6,
      barPercentage: 0.7,
      categoryPercentage: 0.65
    });
  }

  chartMain = new Chart(cv, {
    type: 'bar',
    data: { labels: labels, datasets: datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
        datalabels: {
          color: '#37474f',
          anchor: 'end',
          align: 'end',
          font: { size: 9, weight: '500' },
          formatter: function (v) { return v === 0 ? '0' : v; }
        },
        title: {
          display: true,
          text: onlyBase
            ? 'Punto de partida · Siembra ' + (bl.fechaSiembra || '')
            : 'Comparación: siembra vs ' + (MONTH_NAMES[activeMonth] || '') + ' ' + activeYear,
          font: { size: 12, weight: '500' },
          color: '#546e7a'
        }
      },
      scales: {
        x: { grid: { display: false }, stacked: false },
        y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.06)' } }
      }
    }
  });
}

function drawMicroTrendDual(bl) {
  var cv = document.getElementById('cTrend');
  if (!cv || typeof Chart === 'undefined') return;
  if (typeof chartTrend !== 'undefined' && chartTrend) {
    try { chartTrend.destroy(); } catch (e) {}
    chartTrend = null;
  }

  var rows = typeof microRows !== 'undefined' ? microRows.slice().sort(function (a, b) { return a.mes - b.mes; }) : [];
  var labels = rows.map(function (r) { return MONTH_NAMES[r.mes]; });
  var baseRtamv = (bl.micro && bl.micro.rtamv) || 0;
  var baseMohos = (bl.micro && bl.micro.mohos) || 0;

  chartTrend = new Chart(cv, {
    type: 'line',
    data: {
      labels: labels.length ? labels : [MONTH_NAMES[bl.mesInicio] || 'Inicio'],
      datasets: [
        {
          label: 'Punto partida RTAMV',
          data: labels.length ? rows.map(function () { return baseRtamv; }) : [baseRtamv],
          borderColor: BASELINE_COLOR,
          borderDash: [6, 4],
          pointRadius: 0,
          fill: false,
          tension: 0
        },
        {
          label: 'RTAMV mes',
          data: labels.length ? rows.map(function (r) { return r.rtamv; }) : [baseRtamv],
          borderColor: '#1565c0',
          backgroundColor: 'rgba(21,101,192,0.12)',
          fill: true,
          tension: 0.35,
          pointRadius: 4,
          pointBackgroundColor: '#1565c0'
        },
        {
          label: 'Punto partida Mohos',
          data: labels.length ? rows.map(function () { return baseMohos; }) : [baseMohos],
          borderColor: '#b0bec5',
          borderDash: [4, 4],
          pointRadius: 0,
          fill: false,
          tension: 0,
          yAxisID: 'y1'
        },
        {
          label: 'Mohos mes',
          data: labels.length ? rows.map(function (r) { return r.mohos; }) : [baseMohos],
          borderColor: '#ef6c00',
          fill: false,
          tension: 0.35,
          pointRadius: 4,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } },
        datalabels: { display: false },
        title: {
          display: true,
          text: 'Tendencia vs punto de partida (línea punteada = siembra)',
          font: { size: 12 },
          color: '#546e7a'
        }
      },
      scales: {
        y: { position: 'left', title: { display: true, text: 'RTAMV' } },
        y1: {
          position: 'right',
          grid: { drawOnChartArea: false },
          beginAtZero: true,
          title: { display: true, text: 'Mohos' }
        }
      }
    }
  });
}

function drawFisicoBarDual(d, fields, bl) {
  if (typeof destroyCharts === 'function') destroyCharts();
  var cv = document.getElementById('cMain');
  if (!cv) return;
  fields = fields && fields.length ? fields : ['humedad', 'ph', 'ceniza', 'grasa'];
  var labels = fields.map(function (k) {
    return (typeof FISICO_LABELS !== 'undefined' && FISICO_LABELS[k]) ? FISICO_LABELS[k] : k;
  });
  var baseData = fields.map(function (k) {
    return bl.fisico && bl.fisico[k] != null ? +bl.fisico[k] : 0;
  });
  var monthData = fields.map(function (k) { return d && d[k] != null ? +d[k] : 0; });
  var onlyBase = isStartMonth(bl) || !d;

  var datasets = [{
    label: 'Punto de partida (siembra)',
    data: baseData,
    backgroundColor: BASELINE_COLOR,
    borderRadius: 6
  }];
  if (!onlyBase) {
    datasets.push({
      label: 'Resultado ' + (MONTH_NAMES[activeMonth] || ''),
      data: monthData,
      backgroundColor: fields.map(function (k) {
        return (typeof COLORS !== 'undefined' && COLORS[k]) ? COLORS[k] : '#1565c0';
      }),
      borderRadius: 6
    });
  }

  chartMain = new Chart(cv, {
    type: 'bar',
    data: { labels: labels, datasets: datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' },
        datalabels: {
          color: '#37474f',
          anchor: 'end',
          align: 'end',
          font: { size: 9 },
          formatter: function (v) { return (+v).toFixed(2); }
        },
        title: {
          display: true,
          text: onlyBase ? 'Punto de partida físicoquímico' : 'Comparación siembra vs mes',
          font: { size: 12 },
          color: '#546e7a'
        }
      },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true }
      }
    }
  });
}

function drawFisicoTrendDual(bl, key) {
  key = key || window.trendParam || 'humedad';
  var cv = document.getElementById('cTrend');
  if (!cv) return;
  if (typeof chartTrend !== 'undefined' && chartTrend) {
    try { chartTrend.destroy(); } catch (e) {}
    chartTrend = null;
  }
  var rows = typeof fisicoRows !== 'undefined' ? fisicoRows.slice().sort(function (a, b) { return a.mes - b.mes; }) : [];
  var baseVal = bl.fisico && bl.fisico[key] != null ? +bl.fisico[key] : 0;
  var label = (typeof FISICO_LABELS !== 'undefined' && FISICO_LABELS[key]) ? FISICO_LABELS[key] : key;
  var color = (typeof COLORS !== 'undefined' && COLORS[key]) ? COLORS[key] : '#1565c0';

  chartTrend = new Chart(cv, {
    type: 'line',
    data: {
      labels: rows.map(function (r) { return MONTH_NAMES[r.mes]; }),
      datasets: [
        {
          label: 'Punto partida',
          data: rows.map(function () { return baseVal; }),
          borderColor: BASELINE_COLOR,
          borderDash: [6, 4],
          pointRadius: 0,
          fill: false,
          tension: 0
        },
        {
          label: label + ' mes',
          data: rows.map(function (r) { return r[key] != null ? +r[key] : null; }),
          borderColor: color,
          backgroundColor: color + '22',
          fill: true,
          tension: 0.35,
          pointRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' },
        datalabels: { display: false },
        title: {
          display: true,
          text: 'Tendencia ' + label + ' vs punto de partida',
          font: { size: 12 },
          color: '#546e7a'
        }
      }
    }
  });
}

function baselineInfoHtml(bl, p) {
  var mesNom = (typeof MONTH_NAMES !== 'undefined' && MONTH_NAMES[bl.mesInicio]) ? MONTH_NAMES[bl.mesInicio] : bl.mesInicio;
  return (
    '<div class="card full" style="background:linear-gradient(90deg,#eceff1,#f5f7fa)">' +
    '<div class="card-title">Punto de partida · Estudio de vida útil</div>' +
    '<div style="padding:10px 14px;font-size:13px;line-height:1.55;color:#455a64">' +
    '<strong>Lote</strong> ' + (p && p.lote ? p.lote : bl.lote || '—') +
    ' → inicio <strong>' + mesNom + ' ' + bl.anioInicio + '</strong>' +
    (bl.fechaSiembra ? ' · Fecha siembra (última analítica): <strong>' + bl.fechaSiembra + '</strong>' : '') +
    '<br><span style="font-size:12px;opacity:.85">El punto de partida es el <em>promedio</em> de las parrillas de siembra (Excel). ' +
    'En el mes de inicio solo se muestra ese promedio; desde el mes siguiente se compara cada resultado contra el punto de partida.</span>' +
    '</div></div>'
  );
}

/* Hooks: sustituye draws del app principal */
function installVidaUtilHooks() {
  if (typeof drawMicroBar === 'function') {
    window._drawMicroBarOrig = drawMicroBar;
    drawMicroBar = function (d) {
      var p = products && products.find(function (x) { return x.codigo === activeCodigo; });
      var bl = getBaseline(activeCodigo, p && p.lote);
      drawMicroBarDual(d, bl);
    };
  }
  if (typeof drawMicroTrend === 'function') {
    window._drawMicroTrendOrig = drawMicroTrend;
    drawMicroTrend = function () {
      var p = products && products.find(function (x) { return x.codigo === activeCodigo; });
      var bl = getBaseline(activeCodigo, p && p.lote);
      drawMicroTrendDual(bl);
    };
  }
  if (typeof drawFisicoBar === 'function') {
    window._drawFisicoBarOrig = drawFisicoBar;
    drawFisicoBar = function (d, fields) {
      var p = products && products.find(function (x) { return x.codigo === activeCodigo; });
      var bl = getBaseline(activeCodigo, p && p.lote);
      drawFisicoBarDual(d, fields, bl);
    };
  }
  if (typeof drawHumTrend === 'function') {
    window._drawHumTrendOrig = drawHumTrend;
    drawHumTrend = function () {
      var p = products && products.find(function (x) { return x.codigo === activeCodigo; });
      var bl = getBaseline(activeCodigo, p && p.lote);
      drawFisicoTrendDual(bl, window.trendParam || 'humedad');
    };
  }
  if (typeof window.drawFisicoTrendParam === 'function') {
    window.drawFisicoTrendParam = function () {
      var p = products && products.find(function (x) { return x.codigo === activeCodigo; });
      var bl = getBaseline(activeCodigo, p && p.lote);
      drawFisicoTrendDual(bl, window.trendParam || 'humedad');
    };
  }
}

loadBaselines().then(function () {
  installVidaUtilHooks();
  setTimeout(installVidaUtilHooks, 800);
});

/* Inyectar tarjeta informativa tras render */
(function wrapRenderInfo() {
  function wrap(name) {
    if (typeof window[name] !== 'function' || window[name]._vu) return;
    var orig = window[name];
    window[name] = function (p) {
      orig.apply(this, arguments);
      setTimeout(function () {
        var content = document.getElementById('content');
        if (!content || content.querySelector('.vu-baseline-info')) return;
        var bl = getBaseline(activeCodigo, p && p.lote);
        var div = document.createElement('div');
        div.className = 'vu-baseline-info';
        div.innerHTML = baselineInfoHtml(bl, p);
        content.insertBefore(div.firstChild, content.firstChild);
      }, 50);
    };
    window[name]._vu = true;
  }
  wrap('renderMicro');
  wrap('renderFisico');
  setTimeout(function () { wrap('renderMicro'); wrap('renderFisico'); }, 1000);
})();
