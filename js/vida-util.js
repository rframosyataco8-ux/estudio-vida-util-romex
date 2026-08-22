/* Romex QC — punto de partida + columnas 3D (Highcharts) + tendencia dual */
'use strict';

var ROMEX_BASELINES = null;
var BASELINE_COLOR = '#90a4ae';
var MONTH_COLOR_MICRO = {
  rtamv: '#1565c0', mohos: '#ef6c00', coliformes: '#2e7d32', ecoli: '#43a047',
  enterobacterias: '#7b1fa2', levaduras: '#c2185b', saureus: '#c62828'
};
var FISICO_COLORS = {
  humedad: '#0288d1', ph: '#7b1fa2', ceniza: '#5d4037', grasa: '#f9a825',
  fineza: '#00897b', acidez: '#c62828'
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
        if (r.ok) { ROMEX_BASELINES = await r.json(); break; }
      } catch (e1) {}
    }
  } catch (e) { console.warn('baselines', e); }
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
  return typeof activeYear !== 'undefined' && typeof activeMonth !== 'undefined' &&
    activeYear === bl.anioInicio && activeMonth === bl.mesInicio;
}

function destroyChartJsMain() {
  if (typeof chartMain !== 'undefined' && chartMain) {
    try { chartMain.destroy(); } catch (e) {}
    chartMain = null;
  }
}
function destroyChartJsTrend() {
  if (typeof chartTrend !== 'undefined' && chartTrend) {
    try { chartTrend.destroy(); } catch (e) {}
    chartTrend = null;
  }
}

/** Contenedor del gráfico 3D (reemplaza canvas Chart.js) */
function ensureHcContainer(canvasId) {
  var cv = document.getElementById(canvasId);
  if (!cv) return null;
  var parent = cv.parentElement;
  if (!parent) return null;
  var hid = canvasId + '-hc';
  var div = document.getElementById(hid);
  if (!div) {
    div = document.createElement('div');
    div.id = hid;
    div.style.width = '100%';
    div.style.height = parent.clientHeight ? parent.clientHeight + 'px' : '280px';
    div.style.minHeight = '260px';
    parent.appendChild(div);
  }
  cv.style.display = 'none';
  div.style.display = 'block';
  return div;
}

function drawMicroBarDual(d, bl) {
  destroyChartJsMain();
  if (typeof Highcharts === 'undefined') {
    console.error('Highcharts no cargado');
    return;
  }

  var keys = (typeof MICRO_KEYS !== 'undefined' ? MICRO_KEYS : null) ||
    ['rtamv', 'mohos', 'coliformes', 'ecoli', 'enterobacterias', 'levaduras', 'saureus'];
  var labels = keys.map(function (k) {
    return (typeof MICRO_LABELS !== 'undefined' && MICRO_LABELS[k]) ? MICRO_LABELS[k] : k;
  });
  var baseData = keys.map(function (k) {
    return (bl.micro && bl.micro[k] != null) ? +bl.micro[k] : 0;
  });
  var monthData = keys.map(function (k) {
    return d && d[k] != null ? +d[k] : 0;
  });
  var onlyBase = isStartMonth(bl) || !d;
  var mesLabel = (typeof MONTH_NAMES !== 'undefined' && MONTH_NAMES[activeMonth])
    ? MONTH_NAMES[activeMonth] : String(activeMonth);

  var series = [{
    name: 'Punto de partida (siembra)',
    data: baseData,
    color: BASELINE_COLOR,
    edgeColor: '#546e7a'
  }];
  if (!onlyBase) {
    series.push({
      name: 'Resultado ' + mesLabel,
      data: monthData.map(function (v, i) {
        return { y: v, color: MONTH_COLOR_MICRO[keys[i]] || '#1565c0' };
      }),
      edgeColor: '#0d47a1'
    });
  }

  var el = ensureHcContainer('cMain');
  if (!el) return;

  Highcharts.chart(el.id, {
    chart: {
      type: 'column',
      backgroundColor: 'transparent',
      options3d: {
        enabled: true,
        alpha: 12,
        beta: 18,
        depth: 55,
        viewDistance: 28,
        frame: {
          bottom: { size: 1, color: 'rgba(0,0,0,0.06)' },
          side: { size: 1, color: 'rgba(0,0,0,0.04)' },
          back: { size: 1, color: 'rgba(0,0,0,0.03)' }
        }
      }
    },
    title: {
      text: onlyBase
        ? 'Punto de partida · Siembra ' + (bl.fechaSiembra || '')
        : 'Comparación 3D · siembra vs ' + mesLabel + ' ' + activeYear,
      style: { fontSize: '13px', fontWeight: '600', color: '#37474f' }
    },
    subtitle: {
      text: onlyBase ? 'Solo promedio de siembra (mes de inicio)' : 'Gris = siembra · Colores = resultado del mes',
      style: { fontSize: '11px', color: '#78909c' }
    },
    xAxis: {
      categories: labels,
      labels: { style: { fontSize: '10px', fontWeight: '500' } }
    },
    yAxis: {
      title: { text: 'ufc/gr', style: { fontSize: '11px' } },
      min: 0,
      gridLineColor: 'rgba(0,0,0,0.08)'
    },
    legend: {
      enabled: true,
      itemStyle: { fontSize: '11px' }
    },
    plotOptions: {
      column: {
        depth: 28,
        grouping: true,
        groupZPadding: 8,
        edgeWidth: 1,
        dataLabels: {
          enabled: true,
          style: { fontSize: '9px', fontWeight: '600', textOutline: 'none', color: '#263238' },
          formatter: function () {
            return this.y === 0 ? '0' : this.y;
          }
        }
      }
    },
    series: series,
    credits: { enabled: false },
    tooltip: {
      shared: true,
      headerFormat: '<b>{point.key}</b><br/>',
      pointFormat: '<span style="color:{series.color}">●</span> {series.name}: <b>{point.y}</b><br/>'
    }
  });
}

function drawFisicoBarDual(d, fields, bl) {
  destroyChartJsMain();
  if (typeof Highcharts === 'undefined') return;

  fields = fields && fields.length ? fields : ['humedad', 'ph', 'ceniza', 'grasa'];
  var labels = fields.map(function (k) {
    return (typeof FISICO_LABELS !== 'undefined' && FISICO_LABELS[k]) ? FISICO_LABELS[k] : k;
  });
  var baseData = fields.map(function (k) {
    return bl.fisico && bl.fisico[k] != null ? +bl.fisico[k] : 0;
  });
  var monthData = fields.map(function (k) {
    return d && d[k] != null ? +d[k] : 0;
  });
  var onlyBase = isStartMonth(bl) || !d;
  var mesLabel = (typeof MONTH_NAMES !== 'undefined' && MONTH_NAMES[activeMonth])
    ? MONTH_NAMES[activeMonth] : String(activeMonth);

  var series = [{
    name: 'Punto de partida (siembra)',
    data: baseData,
    color: BASELINE_COLOR,
    edgeColor: '#546e7a'
  }];
  if (!onlyBase) {
    series.push({
      name: 'Resultado ' + mesLabel,
      data: monthData.map(function (v, i) {
        return { y: v, color: FISICO_COLORS[fields[i]] || '#1565c0' };
      }),
      edgeColor: '#0d47a1'
    });
  }

  var el = ensureHcContainer('cMain');
  if (!el) return;

  Highcharts.chart(el.id, {
    chart: {
      type: 'column',
      backgroundColor: 'transparent',
      options3d: {
        enabled: true,
        alpha: 12,
        beta: 18,
        depth: 55,
        viewDistance: 28,
        frame: {
          bottom: { size: 1, color: 'rgba(0,0,0,0.06)' },
          side: { size: 1, color: 'rgba(0,0,0,0.04)' },
          back: { size: 1, color: 'rgba(0,0,0,0.03)' }
        }
      }
    },
    title: {
      text: onlyBase ? 'Punto de partida físicoquímico 3D' : 'Comparación 3D · siembra vs ' + mesLabel,
      style: { fontSize: '13px', fontWeight: '600', color: '#37474f' }
    },
    xAxis: { categories: labels, labels: { style: { fontSize: '10px' } } },
    yAxis: { title: { text: null }, min: 0, gridLineColor: 'rgba(0,0,0,0.08)' },
    legend: { enabled: true, itemStyle: { fontSize: '11px' } },
    plotOptions: {
      column: {
        depth: 28,
        grouping: true,
        groupZPadding: 8,
        edgeWidth: 1,
        dataLabels: {
          enabled: true,
          style: { fontSize: '9px', fontWeight: '600', textOutline: 'none' },
          formatter: function () { return Highcharts.numberFormat(this.y, 2); }
        }
      }
    },
    series: series,
    credits: { enabled: false }
  });
}

function drawMicroTrendDual(bl) {
  destroyChartJsTrend();
  var cv = document.getElementById('cTrend');
  if (!cv || typeof Chart === 'undefined') return;

  /* tendencia sigue en Chart.js 2D (más legible para líneas) */
  var trendHc = document.getElementById('cTrend-hc');
  if (trendHc) trendHc.style.display = 'none';
  cv.style.display = 'block';

  var rows = (typeof microRows !== 'undefined' ? microRows : []).slice()
    .sort(function (a, b) { return a.mes - b.mes; });
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
          borderColor: '#78909c', borderDash: [8, 5], borderWidth: 2,
          pointRadius: 0, fill: false, tension: 0
        },
        {
          label: 'RTAMV mes',
          data: rows.map(function (r) { return r.rtamv; }),
          borderColor: '#1565c0', backgroundColor: 'rgba(21,101,192,0.12)',
          borderWidth: 3, fill: true, tension: 0.35,
          pointRadius: 5, pointBackgroundColor: '#1565c0',
          pointBorderColor: '#fff', pointBorderWidth: 2
        },
        {
          label: 'Punto partida Mohos',
          data: rows.map(function () { return baseMohos; }),
          borderColor: '#b0bec5', borderDash: [6, 4], borderWidth: 2,
          pointRadius: 0, fill: false, tension: 0, yAxisID: 'y1'
        },
        {
          label: 'Mohos mes',
          data: rows.map(function (r) { return r.mohos; }),
          borderColor: '#ef6c00', borderWidth: 3, fill: false, tension: 0.35,
          pointRadius: 5, pointBackgroundColor: '#ef6c00',
          pointBorderColor: '#fff', pointBorderWidth: 2, yAxisID: 'y1'
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

function drawFisicoTrendDual(bl, key) {
  key = key || window.trendParam || 'humedad';
  destroyChartJsTrend();
  var cv = document.getElementById('cTrend');
  if (!cv || typeof Chart === 'undefined') return;
  var trendHc = document.getElementById('cTrend-hc');
  if (trendHc) trendHc.style.display = 'none';
  cv.style.display = 'block';

  var rows = (typeof fisicoRows !== 'undefined' ? fisicoRows : []).slice()
    .sort(function (a, b) { return a.mes - b.mes; });
  var baseVal = bl.fisico && bl.fisico[key] != null ? +bl.fisico[key] : 0;
  var label = (typeof FISICO_LABELS !== 'undefined' && FISICO_LABELS[key]) ? FISICO_LABELS[key] : key;
  var color = FISICO_COLORS[key] || '#1565c0';

  chartTrend = new Chart(cv, {
    type: 'line',
    data: {
      labels: rows.map(function (r) { return MONTH_NAMES[r.mes]; }),
      datasets: [
        {
          label: 'Punto partida',
          data: rows.map(function () { return baseVal; }),
          borderColor: '#78909c', borderDash: [8, 5], borderWidth: 2,
          pointRadius: 0, fill: false, tension: 0
        },
        {
          label: label + ' mes',
          data: rows.map(function (r) { return r[key] != null ? +r[key] : null; }),
          borderColor: color, backgroundColor: color + '22',
          borderWidth: 3, fill: true, tension: 0.35,
          pointRadius: 5, pointBackgroundColor: color,
          pointBorderColor: '#fff', pointBorderWidth: 2
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
}

function baselineInfoHtml(bl, p) {
  var mesNom = (typeof MONTH_NAMES !== 'undefined' && MONTH_NAMES[bl.mesInicio]) ? MONTH_NAMES[bl.mesInicio] : bl.mesInicio;
  return (
    '<div class="card full" style="background:linear-gradient(90deg,#eceff1,#f5f7fa)">' +
    '<div class="card-title">Punto de partida · Estudio de vida útil</div>' +
    '<div style="padding:10px 14px;font-size:13px;line-height:1.55;color:#455a64">' +
    '<strong>Lote</strong> ' + (p && p.lote ? p.lote : bl.lote || '—') +
    ' → inicio <strong>' + mesNom + ' ' + bl.anioInicio + '</strong>' +
    (bl.fechaSiembra ? ' · Fecha siembra: <strong>' + bl.fechaSiembra + '</strong>' : '') +
    '<br><span style="font-size:12px;opacity:.85">Promedio de parrillas de siembra. ' +
    'Mes de inicio: solo punto de partida. Después: columnas 3D siembra vs resultado.</span>' +
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
    if (typeof window[name] !== 'function' || window[name]._vu3) return;
    var orig = window[name];
    window[name] = function (p) {
      orig.apply(this, arguments);
      setTimeout(function () {
        var content = document.getElementById('content');
        if (!content || content.querySelector('.vu-baseline-card')) return;
        var bl = getBaseline(activeCodigo, p && p.lote);
        var wrap = document.createElement('div');
        wrap.className = 'vu-baseline-card';
        wrap.innerHTML = baselineInfoHtml(bl, p);
        content.insertBefore(wrap.firstChild, content.firstChild);
      }, 40);
    };
    window[name]._vu3 = true;
  });
}

loadBaselines().then(function () {
  installVidaUtilHooks();
  wrapRenders();
  setTimeout(function () { installVidaUtilHooks(); wrapRenders(); }, 400);
  setTimeout(function () { installVidaUtilHooks(); wrapRenders(); }, 1500);
});
