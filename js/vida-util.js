/* Romex QC v1.4.1 — punto de partida + barras estilo 3D + tendencia dual */
'use strict';

var ROMEX_BASELINES = null;
var BASELINE_COLOR = 'rgba(120,144,156,0.85)';
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
  return { anio: 2026, mes: 5 };
}

async function loadBaselines() {
  if (ROMEX_BASELINES) return ROMEX_BASELINES;
  try {
    var urls = [(window.API_BASE || '') + '/data/baselines.json', 'data/baselines.json'];
    for (var i = 0; i < urls.length; i++) {
      try {
        var r = await fetch(urls[i]);
        if (r.ok) {
          ROMEX_BASELINES = await r.json();
          break;
        }
      } catch (e1) { /* next */ }
    }
  } catch (e) {
    console.warn('baselines', e);
  }
  if (!ROMEX_BASELINES) ROMEX_BASELINES = { products: {} };
  return ROMEX_BASELINES;
}

function getBaseline(codigo, lote) {
  var b = ROMEX_BASELINES && ROMEX_BASELINES.products && ROMEX_BASELINES.products[codigo];
  if (b) return b;
  var lm = parseLoteMesAnio(lote);
  return {
    anioInicio: lm.anio, mesInicio: lm.mes, fechaSiembra: null,
    micro: { rtamv: 0, mohos: 0, coliformes: 0, ecoli: 0, enterobacterias: 0, levaduras: 0, saureus: 0 },
    fisico: {}
  };
}

function isStartMonth(bl) {
  return activeYear === bl.anioInicio && activeMonth === bl.mesInicio;
}

/** Gradiente para efecto 3D en barras */
function barGradient(ctx, color) {
  var chart = ctx.chart;
  var area = chart.chartArea;
  if (!area) return color;
  var g = ctx.chart.ctx.createLinearGradient(0, area.bottom, 0, area.top);
  g.addColorStop(0, color);
  g.addColorStop(0.55, color);
  g.addColorStop(1, '#ffffff');
  return g;
}

function destroyMainOnly() {
  if (typeof chartMain !== 'undefined' && chartMain) {
    try { chartMain.destroy(); } catch (e) {}
    chartMain = null;
  }
}
function destroyTrendOnly() {
  if (typeof chartTrend !== 'undefined' && chartTrend) {
    try { chartTrend.destroy(); } catch (e) {}
    chartTrend = null;
  }
}

function drawMicroBarDual(d, bl) {
  destroyMainOnly();
  var cv = document.getElementById('cMain');
  if (!cv || typeof Chart === 'undefined') return;

  var keys = MICRO_KEYS || ['rtamv', 'mohos', 'coliformes', 'ecoli', 'enterobacterias', 'levaduras', 'saureus'];
  var labels = keys.map(function (k) { return (MICRO_LABELS && MICRO_LABELS[k]) || k; });
  var baseData = keys.map(function (k) { return (bl.micro && bl.micro[k] != null) ? +bl.micro[k] : 0; });
  var monthData = keys.map(function (k) { return d && d[k] != null ? +d[k] : 0; });
  var onlyBase = isStartMonth(bl) || !d;

  var datasets = [{
    label: 'Punto de partida (siembra)',
    data: baseData,
    backgroundColor: function (c) { return barGradient(c, '#78909c'); },
    borderColor: '#455a64',
    borderWidth: 2,
    borderSkipped: false,
    borderRadius: { topLeft: 8, topRight: 8, bottomLeft: 2, bottomRight: 2 },
    barPercentage: 0.75,
    categoryPercentage: 0.7
  }];

  if (!onlyBase) {
    datasets.push({
      label: 'Resultado ' + ((MONTH_NAMES && MONTH_NAMES[activeMonth]) || activeMonth),
      data: monthData,
      backgroundColor: function (c) {
        var k = keys[c.dataIndex];
        return barGradient(c, MONTH_COLOR_MICRO[k] || '#1565c0');
      },
      borderColor: '#0d47a1',
      borderWidth: 2,
      borderSkipped: false,
      borderRadius: { topLeft: 8, topRight: 8, bottomLeft: 2, bottomRight: 2 },
      barPercentage: 0.75,
      categoryPercentage: 0.7
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
        legend: { position: 'bottom', labels: { boxWidth: 14, font: { size: 11 } } },
        datalabels: {
          color: '#263238',
          anchor: 'end',
          align: 'top',
          font: { size: 10, weight: '600' },
          formatter: function (v) { return v == null ? '' : v; }
        },
        title: {
          display: true,
          text: onlyBase
            ? 'Punto de partida · Siembra ' + (bl.fechaSiembra || '')
            : 'Comparación 3D: siembra vs ' + ((MONTH_NAMES && MONTH_NAMES[activeMonth]) || '') + ' ' + activeYear,
          font: { size: 13, weight: '600' },
          color: '#37474f',
          padding: { bottom: 8 }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { size: 11, weight: '500' } }
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(0,0,0,0.07)' },
          ticks: { font: { size: 10 } }
        }
      },
      animation: { duration: 600 }
    }
  });

  /* Sombra CSS al canvas para profundidad 3D */
  if (cv.parentElement) {
    cv.parentElement.style.perspective = '800px';
    cv.style.transform = 'rotateX(6deg)';
    cv.style.transformOrigin = 'center bottom';
    cv.style.filter = 'drop-shadow(0 10px 14px rgba(0,0,0,0.18))';
  }
}

function drawMicroTrendDual(bl) {
  destroyTrendOnly();
  var cv = document.getElementById('cTrend');
  if (!cv || typeof Chart === 'undefined') return;

  var rows = (microRows || []).slice().sort(function (a, b) { return a.mes - b.mes; });
  var labels = rows.map(function (r) { return MONTH_NAMES[r.mes]; });
  var baseRtamv = (bl.micro && bl.micro.rtamv) || 0;
  var baseMohos = (bl.micro && bl.micro.mohos) || 0;
  if (!labels.length) {
    labels = [MONTH_NAMES[bl.mesInicio] || 'Inicio'];
    rows = [{ rtamv: baseRtamv, mohos: baseMohos }];
  }

  chartTrend = new Chart(cv, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Punto partida RTAMV',
          data: rows.map(function () { return baseRtamv; }),
          borderColor: '#78909c',
          borderDash: [8, 5],
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
          tension: 0
        },
        {
          label: 'RTAMV mes',
          data: rows.map(function (r) { return r.rtamv; }),
          borderColor: '#1565c0',
          backgroundColor: 'rgba(21,101,192,0.15)',
          borderWidth: 3,
          fill: true,
          tension: 0.35,
          pointRadius: 5,
          pointBackgroundColor: '#1565c0',
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        },
        {
          label: 'Punto partida Mohos',
          data: rows.map(function () { return baseMohos; }),
          borderColor: '#b0bec5',
          borderDash: [6, 4],
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
          tension: 0,
          yAxisID: 'y1'
        },
        {
          label: 'Mohos mes',
          data: rows.map(function (r) { return r.mohos; }),
          borderColor: '#ef6c00',
          borderWidth: 3,
          fill: false,
          tension: 0.35,
          pointRadius: 5,
          pointBackgroundColor: '#ef6c00',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
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
          text: 'Tendencia vs punto de partida (punteada = siembra)',
          font: { size: 12, weight: '600' },
          color: '#37474f'
        }
      },
      scales: {
        y: { position: 'left', title: { display: true, text: 'RTAMV', font: { size: 11 } } },
        y1: {
          position: 'right',
          grid: { drawOnChartArea: false },
          beginAtZero: true,
          title: { display: true, text: 'Mohos', font: { size: 11 } }
        }
      }
    }
  });
  if (cv.parentElement) {
    cv.style.transform = 'none';
    cv.style.filter = 'drop-shadow(0 6px 10px rgba(0,0,0,0.12))';
  }
}

function drawFisicoBarDual(d, fields, bl) {
  destroyMainOnly();
  var cv = document.getElementById('cMain');
  if (!cv) return;
  fields = fields && fields.length ? fields : ['humedad', 'ph', 'ceniza', 'grasa'];
  var labels = fields.map(function (k) { return (FISICO_LABELS && FISICO_LABELS[k]) || k; });
  var baseData = fields.map(function (k) { return bl.fisico && bl.fisico[k] != null ? +bl.fisico[k] : 0; });
  var monthData = fields.map(function (k) { return d && d[k] != null ? +d[k] : 0; });
  var onlyBase = isStartMonth(bl) || !d;

  var datasets = [{
    label: 'Punto de partida (siembra)',
    data: baseData,
    backgroundColor: function (c) { return barGradient(c, '#78909c'); },
    borderColor: '#455a64',
    borderWidth: 2,
    borderSkipped: false,
    borderRadius: { topLeft: 8, topRight: 8, bottomLeft: 2, bottomRight: 2 }
  }];
  if (!onlyBase) {
    datasets.push({
      label: 'Resultado ' + ((MONTH_NAMES && MONTH_NAMES[activeMonth]) || ''),
      data: monthData,
      backgroundColor: function (c) {
        var k = fields[c.dataIndex];
        return barGradient(c, (COLORS && COLORS[k]) || '#1565c0');
      },
      borderColor: '#0d47a1',
      borderWidth: 2,
      borderSkipped: false,
      borderRadius: { topLeft: 8, topRight: 8, bottomLeft: 2, bottomRight: 2 }
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
          color: '#263238',
          anchor: 'end',
          align: 'top',
          font: { size: 10, weight: '600' },
          formatter: function (v) { return (+v).toFixed(2); }
        },
        title: {
          display: true,
          text: onlyBase ? 'Punto de partida físicoquímico' : 'Comparación 3D: siembra vs mes',
          font: { size: 13, weight: '600' },
          color: '#37474f'
        }
      },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true }
      }
    }
  });
  if (cv.parentElement) {
    cv.style.transform = 'rotateX(6deg)';
    cv.style.transformOrigin = 'center bottom';
    cv.style.filter = 'drop-shadow(0 10px 14px rgba(0,0,0,0.18))';
  }
}

function drawFisicoTrendDual(bl, key) {
  key = key || window.trendParam || 'humedad';
  destroyTrendOnly();
  var cv = document.getElementById('cTrend');
  if (!cv) return;
  var rows = (fisicoRows || []).slice().sort(function (a, b) { return a.mes - b.mes; });
  var baseVal = bl.fisico && bl.fisico[key] != null ? +bl.fisico[key] : 0;
  var label = (FISICO_LABELS && FISICO_LABELS[key]) || key;
  var color = (COLORS && COLORS[key]) || '#1565c0';

  chartTrend = new Chart(cv, {
    type: 'line',
    data: {
      labels: rows.map(function (r) { return MONTH_NAMES[r.mes]; }),
      datasets: [
        {
          label: 'Punto partida',
          data: rows.map(function () { return baseVal; }),
          borderColor: '#78909c',
          borderDash: [8, 5],
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
          tension: 0
        },
        {
          label: label + ' mes',
          data: rows.map(function (r) { return r[key] != null ? +r[key] : null; }),
          borderColor: color,
          backgroundColor: color + '22',
          borderWidth: 3,
          fill: true,
          tension: 0.35,
          pointRadius: 5,
          pointBackgroundColor: color,
          pointBorderColor: '#fff',
          pointBorderWidth: 2
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
          font: { size: 12, weight: '600' },
          color: '#37474f'
        }
      }
    }
  });
  cv.style.transform = 'none';
  cv.style.filter = 'drop-shadow(0 6px 10px rgba(0,0,0,0.12))';
}

function baselineInfoHtml(bl, p) {
  var mesNom = (MONTH_NAMES && MONTH_NAMES[bl.mesInicio]) || bl.mesInicio;
  return (
    '<div class="card full" style="background:linear-gradient(90deg,#eceff1,#f5f7fa)">' +
    '<div class="card-title">Punto de partida · Estudio de vida útil</div>' +
    '<div style="padding:10px 14px;font-size:13px;line-height:1.55;color:#455a64">' +
    '<strong>Lote</strong> ' + (p && p.lote ? p.lote : bl.lote || '—') +
    ' → inicio <strong>' + mesNom + ' ' + bl.anioInicio + '</strong>' +
    (bl.fechaSiembra ? ' · Fecha siembra: <strong>' + bl.fechaSiembra + '</strong>' : '') +
    '<br><span style="font-size:12px;opacity:.85">Promedio de parrillas de siembra (Excel). ' +
    'Mes de inicio: solo punto de partida. Meses siguientes: comparación siembra vs resultado.</span>' +
    '</div></div>'
  );
}

function installVidaUtilHooks() {
  window.drawMicroBar = function (d) {
    var p = products && products.find(function (x) { return x.codigo === activeCodigo; });
    drawMicroBarDual(d, getBaseline(activeCodigo, p && p.lote));
  };
  window.drawMicroTrend = function () {
    var p = products && products.find(function (x) { return x.codigo === activeCodigo; });
    drawMicroTrendDual(getBaseline(activeCodigo, p && p.lote));
  };
  window.drawFisicoBar = function (d, fields) {
    var p = products && products.find(function (x) { return x.codigo === activeCodigo; });
    drawFisicoBarDual(d, fields, getBaseline(activeCodigo, p && p.lote));
  };
  window.drawHumTrend = function () {
    var p = products && products.find(function (x) { return x.codigo === activeCodigo; });
    drawFisicoTrendDual(getBaseline(activeCodigo, p && p.lote), window.trendParam || 'humedad');
  };
  window.drawFisicoTrendParam = function () {
    var p = products && products.find(function (x) { return x.codigo === activeCodigo; });
    drawFisicoTrendDual(getBaseline(activeCodigo, p && p.lote), window.trendParam || 'humedad');
  };
}

function wrapRenders() {
  ['renderMicro', 'renderFisico'].forEach(function (name) {
    if (typeof window[name] !== 'function' || window[name]._vu2) return;
    var orig = window[name];
    window[name] = function (p) {
      orig.apply(this, arguments);
      setTimeout(function () {
        var content = document.getElementById('content');
        if (!content) return;
        if (!content.querySelector('.vu-baseline-card')) {
          var bl = getBaseline(activeCodigo, p && p.lote);
          var wrap = document.createElement('div');
          wrap.className = 'vu-baseline-card';
          wrap.innerHTML = baselineInfoHtml(bl, p);
          content.insertBefore(wrap.firstChild, content.firstChild);
        }
      }, 40);
    };
    window[name]._vu2 = true;
  });
}

loadBaselines().then(function () {
  installVidaUtilHooks();
  wrapRenders();
  setTimeout(function () { installVidaUtilHooks(); wrapRenders(); }, 300);
  setTimeout(function () { installVidaUtilHooks(); wrapRenders(); }, 1200);
});
