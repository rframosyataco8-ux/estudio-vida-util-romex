/* Columnas 3D con Highcharts — Romex QC */
'use strict';

function romexHcReady() {
  return typeof Highcharts !== 'undefined' && Highcharts.chart;
}

function romexGetBaseline(codigo) {
  var bl = window.ROMEX_BASELINES && window.ROMEX_BASELINES.products && window.ROMEX_BASELINES.products[codigo];
  if (bl) return bl;
  return {
    anioInicio: 2026,
    mesInicio: 5,
    fechaSiembra: null,
    micro: { rtamv: 0, mohos: 0, coliformes: 0, ecoli: 0, enterobacterias: 0, levaduras: 0, saureus: 0 },
    fisico: {}
  };
}

function romexIsStart(bl) {
  return typeof activeYear !== 'undefined' && typeof activeMonth !== 'undefined' &&
    activeYear === bl.anioInicio && activeMonth === bl.mesInicio;
}

function romexChartHost(canvasId) {
  var cv = document.getElementById(canvasId);
  if (!cv) return null;
  var box = cv.parentElement;
  if (!box) return null;
  var hid = canvasId + '-3d';
  var div = document.getElementById(hid);
  if (!div) {
    div = document.createElement('div');
    div.id = hid;
    div.style.width = '100%';
    div.style.height = '300px';
    box.appendChild(div);
  }
  cv.style.display = 'none';
  div.style.display = 'block';
  div.innerHTML = '';
  return div;
}

var MICRO_3D_COLORS = {
  rtamv: '#1565c0', mohos: '#ef6c00', coliformes: '#2e7d32', ecoli: '#43a047',
  enterobacterias: '#7b1fa2', levaduras: '#c2185b', saureus: '#c62828'
};
var FISICO_3D_COLORS = {
  humedad: '#0288d1', ph: '#7b1fa2', ceniza: '#5d4037', grasa: '#f9a825',
  fineza: '#00897b', acidez: '#c62828'
};

/** Dibuja columnas 3D micro: siembra vs mes */
function romexDrawMicro3D(d) {
  if (!romexHcReady()) {
    console.warn('Highcharts no disponible');
    return false;
  }
  var bl = romexGetBaseline(typeof activeCodigo !== 'undefined' ? activeCodigo : '');
  var keys = typeof MICRO_KEYS !== 'undefined' ? MICRO_KEYS : ['rtamv', 'mohos', 'coliformes', 'ecoli', 'enterobacterias', 'levaduras', 'saureus'];
  var labels = keys.map(function (k) {
    return (typeof MICRO_LABELS !== 'undefined' && MICRO_LABELS[k]) ? MICRO_LABELS[k] : k;
  });
  var baseData = keys.map(function (k) {
    return bl.micro && bl.micro[k] != null ? +bl.micro[k] : 0;
  });
  var monthData = keys.map(function (k) {
    return d && d[k] != null ? +d[k] : 0;
  });
  var onlyBase = romexIsStart(bl) || !d;
  var mesLabel = (typeof MONTH_NAMES !== 'undefined' && MONTH_NAMES[activeMonth]) ? MONTH_NAMES[activeMonth] : String(activeMonth);

  var series = [{
    name: 'Punto de partida (siembra)',
    data: baseData,
    color: '#90a4ae',
    edgeColor: '#546e7a'
  }];
  if (!onlyBase) {
    series.push({
      name: 'Resultado ' + mesLabel,
      data: monthData.map(function (v, i) {
        return { y: v, color: MICRO_3D_COLORS[keys[i]] || '#1565c0' };
      }),
      edgeColor: '#0d47a1'
    });
  }

  var el = romexChartHost('cMain');
  if (!el) return false;

  Highcharts.chart(el, {
    chart: {
      type: 'column',
      backgroundColor: 'transparent',
      options3d: {
        enabled: true,
        alpha: 15,
        beta: 20,
        depth: 60,
        viewDistance: 25,
        frame: {
          bottom: { size: 2, color: 'rgba(0,0,0,0.08)' },
          side: { size: 1, color: 'rgba(0,0,0,0.05)' },
          back: { size: 1, color: 'rgba(0,0,0,0.04)' }
        }
      }
    },
    title: {
      text: onlyBase
        ? 'Punto de partida · Siembra ' + (bl.fechaSiembra || '')
        : 'Columnas 3D · siembra vs ' + mesLabel + ' ' + (typeof activeYear !== 'undefined' ? activeYear : ''),
      style: { fontSize: '13px', fontWeight: '600', color: '#37474f' }
    },
    xAxis: {
      categories: labels,
      labels: { style: { fontSize: '10px', fontWeight: '500' } }
    },
    yAxis: {
      title: { text: 'ufc/gr' },
      min: 0,
      gridLineColor: 'rgba(0,0,0,0.08)'
    },
    legend: { enabled: true, itemStyle: { fontSize: '11px' } },
    plotOptions: {
      column: {
        depth: 32,
        grouping: true,
        groupZPadding: 10,
        edgeWidth: 1,
        dataLabels: {
          enabled: true,
          style: { fontSize: '9px', fontWeight: '600', textOutline: 'none', color: '#263238' }
        }
      }
    },
    series: series,
    credits: { enabled: false },
    tooltip: { shared: true }
  });
  return true;
}

function romexDrawFisico3D(d, fields) {
  if (!romexHcReady()) return false;
  var bl = romexGetBaseline(typeof activeCodigo !== 'undefined' ? activeCodigo : '');
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
  var onlyBase = romexIsStart(bl) || !d;
  var mesLabel = (typeof MONTH_NAMES !== 'undefined' && MONTH_NAMES[activeMonth]) ? MONTH_NAMES[activeMonth] : String(activeMonth);

  var series = [{
    name: 'Punto de partida (siembra)',
    data: baseData,
    color: '#90a4ae',
    edgeColor: '#546e7a'
  }];
  if (!onlyBase) {
    series.push({
      name: 'Resultado ' + mesLabel,
      data: monthData.map(function (v, i) {
        return { y: v, color: FISICO_3D_COLORS[fields[i]] || '#1565c0' };
      }),
      edgeColor: '#0d47a1'
    });
  }

  var el = romexChartHost('cMain');
  if (!el) return false;

  Highcharts.chart(el, {
    chart: {
      type: 'column',
      backgroundColor: 'transparent',
      options3d: {
        enabled: true,
        alpha: 15,
        beta: 20,
        depth: 60,
        viewDistance: 25,
        frame: {
          bottom: { size: 2, color: 'rgba(0,0,0,0.08)' },
          side: { size: 1, color: 'rgba(0,0,0,0.05)' },
          back: { size: 1, color: 'rgba(0,0,0,0.04)' }
        }
      }
    },
    title: {
      text: onlyBase ? 'Punto de partida físicoquímico 3D' : 'Columnas 3D · siembra vs ' + mesLabel,
      style: { fontSize: '13px', fontWeight: '600', color: '#37474f' }
    },
    xAxis: { categories: labels, labels: { style: { fontSize: '10px' } } },
    yAxis: { title: { text: null }, min: 0 },
    legend: { enabled: true },
    plotOptions: {
      column: {
        depth: 32,
        grouping: true,
        groupZPadding: 10,
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
  return true;
}

/* Cargar baselines */
(function loadBl() {
  var urls = ['data/baselines.json', (window.API_BASE || '') + '/data/baselines.json'];
  function tryNext(i) {
    if (i >= urls.length) {
      window.ROMEX_BASELINES = { products: {} };
      return;
    }
    fetch(urls[i]).then(function (r) {
      if (!r.ok) throw new Error('fail');
      return r.json();
    }).then(function (j) {
      window.ROMEX_BASELINES = j;
    }).catch(function () { tryNext(i + 1); });
  }
  tryNext(0);
})();
