/* Romex QC — Columnas 3D limpias e isométricas (Canvas, sin CDN) */
'use strict';

function romexGetBaseline(codigo) {
  var bl = window.ROMEX_BASELINES && window.ROMEX_BASELINES.products && window.ROMEX_BASELINES.products[codigo];
  if (bl) return bl;
  return {
    anioInicio: 2026, mesInicio: 5, fechaSiembra: null,
    micro: { rtamv: 0, mohos: 0, coliformes: 0, ecoli: 0, enterobacterias: 0, levaduras: 0, saureus: 0 },
    fisico: {}
  };
}

function romexIsStart(bl) {
  return typeof activeYear !== 'undefined' && typeof activeMonth !== 'undefined' &&
    activeYear === bl.anioInicio && activeMonth === bl.mesInicio;
}

var MICRO_3D_COLORS = {
  rtamv: '#1565c0', mohos: '#ef6c00', coliformes: '#2e7d32', ecoli: '#00897b',
  enterobacterias: '#7b1fa2', levaduras: '#c2185b', saureus: '#c62828'
};
var FISICO_3D_COLORS = {
  humedad: '#0288d1', ph: '#7b1fa2', ceniza: '#5d4037', grasa: '#f9a825',
  fineza: '#00897b', acidez: '#c62828'
};

function lighten(hex, pct) {
  hex = String(hex || '#888').replace('#', '');
  if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
  var r = parseInt(hex.substr(0, 2), 16);
  var g = parseInt(hex.substr(2, 2), 16);
  var b = parseInt(hex.substr(4, 2), 16);
  r = Math.min(255, Math.round(r + (255 - r) * pct));
  g = Math.min(255, Math.round(g + (255 - g) * pct));
  b = Math.min(255, Math.round(b + (255 - b) * pct));
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}
function darken(hex, pct) {
  hex = String(hex || '#888').replace('#', '');
  if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
  var r = parseInt(hex.substr(0, 2), 16);
  var g = parseInt(hex.substr(2, 2), 16);
  var b = parseInt(hex.substr(4, 2), 16);
  r = Math.max(0, Math.round(r * (1 - pct)));
  g = Math.max(0, Math.round(g * (1 - pct)));
  b = Math.max(0, Math.round(b * (1 - pct)));
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}

function fmtVal(v) {
  if (v == null || !isFinite(v)) return '0';
  if (Math.abs(v) >= 100) return String(Math.round(v));
  if (Math.abs(v) >= 10) return String(Math.round(v * 10) / 10);
  return (Math.round(v * 100) / 100).toFixed(2).replace(/\.00$/, '').replace(/(\.[1-9])0$/, '$1');
}

/**
 * Columnas 3D ordenadas, legibles y coherentes
 */
function romexPaint3D(canvas, labels, series, title) {
  if (!canvas) return false;
  var box = canvas.parentElement;
  var W = Math.max(320, (box && box.clientWidth) ? box.clientWidth : 700);
  var H = 380;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);

  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.height = H + 'px';
  canvas.width = Math.floor(W * dpr);
  canvas.height = Math.floor(H * dpr);

  var ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);

  /* fondo limpio */
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  /* título */
  ctx.fillStyle = '#37474f';
  ctx.font = '600 13px Roboto, system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(title || 'Gráfico 3D', 16, 22);

  var nCat = labels.length;
  var nSer = series.length;
  if (!nCat) return true;

  var padL = 56, padR = 20, padT = 48, padB = 88;
  var plotW = W - padL - padR;
  var plotH = H - padT - padB;
  var baseY = padT + plotH;

  var maxV = 0;
  series.forEach(function (s) {
    (s.values || []).forEach(function (v) {
      if (v > maxV) maxV = v;
    });
  });
  if (maxV <= 0) maxV = 1;
  /* margen superior 10% */
  var scaleMax = maxV * 1.12;

  /* rejilla suave */
  ctx.font = '10px Roboto, system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (var g = 0; g <= 4; g++) {
    var gy = padT + (plotH * g) / 4;
    var val = scaleMax * (1 - g / 4);
    ctx.strokeStyle = g === 4 ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, gy);
    ctx.lineTo(W - padR, gy);
    ctx.stroke();
    ctx.fillStyle = '#78909c';
    ctx.fillText(fmtVal(val), padL - 8, gy);
  }

  /* profundidad 3D moderada (limpia) */
  var depthX = 8;
  var depthY = 6;
  var groupW = plotW / nCat;
  var innerPad = Math.max(10, groupW * 0.12);
  var usable = groupW - innerPad * 2;
  var barGap = nSer > 1 ? 6 : 0;
  var barW = Math.min(42, Math.max(14, (usable - barGap * (nSer - 1)) / nSer));

  function drawBox3DVal(x, yBottom, w, h, color, value) {
    if (h < 2) h = 2;
    var top = yBottom - h;
    var sideC = darken(color, 0.22);
    var topC = lighten(color, 0.28);

    /* lateral */
    ctx.beginPath();
    ctx.moveTo(x + w, yBottom);
    ctx.lineTo(x + w + depthX, yBottom - depthY);
    ctx.lineTo(x + w + depthX, top - depthY);
    ctx.lineTo(x + w, top);
    ctx.closePath();
    ctx.fillStyle = sideC;
    ctx.fill();

    /* frente */
    ctx.fillStyle = color;
    ctx.fillRect(x, top, w, h);

    /* superior */
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x + depthX, top - depthY);
    ctx.lineTo(x + w + depthX, top - depthY);
    ctx.lineTo(x + w, top);
    ctx.closePath();
    ctx.fillStyle = topC;
    ctx.fill();

    /* borde sutil */
    ctx.strokeStyle = darken(color, 0.18);
    ctx.lineWidth = 0.7;
    ctx.strokeRect(x, top, w, h);

    /* etiqueta valor (solo si hay espacio) */
    if (h > 18 || value > 0) {
      ctx.fillStyle = '#263238';
      ctx.font = '600 9px Roboto, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(fmtVal(value), x + w / 2 + depthX * 0.4, top - depthY - 3);
    }
  }

  for (var i = 0; i < nCat; i++) {
    var groupCenter = padL + i * groupW + groupW / 2;
    var totalBarsW = nSer * barW + (nSer - 1) * barGap;
    var startX = groupCenter - totalBarsW / 2;

    for (var s = 0; s < nSer; s++) {
      var v = (series[s].values && series[s].values[i] != null) ? +series[s].values[i] : 0;
      var h = (v / scaleMax) * (plotH - 8);
      var x = startX + s * (barW + barGap);
      var col = (series[s].colors && series[s].colors[i]) ? series[s].colors[i] : series[s].color;
      drawBox3DVal(x, baseY, barW, Math.max(h, v > 0 ? 3 : 1), col || '#1565c0', v);
    }

    /* etiqueta categoría — centrada, sin solaparse */
    ctx.fillStyle = '#455a64';
    ctx.font = '500 11px Roboto, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    var lab = labels[i];
    /* si es largo, partir en 2 líneas */
    if (lab.length > 8 && groupW < 90) {
      var mid = Math.ceil(lab.length / 2);
      var sp = lab.indexOf(' ', mid - 2);
      if (sp < 0) sp = mid;
      ctx.fillText(lab.slice(0, sp).trim(), groupCenter, baseY + 10);
      ctx.fillText(lab.slice(sp).trim(), groupCenter, baseY + 24);
    } else {
      ctx.fillText(lab, groupCenter, baseY + 12);
    }
  }

  /* leyenda limpia centrada */
  var legendY = H - 28;
  ctx.font = '11px Roboto, system-ui, sans-serif';
  var totalLegW = 0;
  var gaps = [];
  series.forEach(function (s) {
    var tw = 14 + 6 + ctx.measureText(s.name).width;
    gaps.push(tw);
    totalLegW += tw + 24;
  });
  totalLegW -= 24;
  var lx = (W - totalLegW) / 2;
  series.forEach(function (s, si) {
    ctx.fillStyle = s.color || '#888';
    ctx.fillRect(lx, legendY - 8, 12, 12);
    ctx.strokeStyle = darken(s.color || '#888', 0.2);
    ctx.lineWidth = 0.8;
    ctx.strokeRect(lx, legendY - 8, 12, 12);
    ctx.fillStyle = '#37474f';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(s.name, lx + 16, legendY - 2);
    lx += gaps[si] + 24;
  });

  return true;
}

function romexDrawMicro3D(d) {
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
    color: '#90a4ae',
    values: baseData
  }];
  if (!onlyBase) {
    series.push({
      name: 'Resultado ' + mesLabel,
      color: '#1565c0',
      colors: keys.map(function (k) { return MICRO_3D_COLORS[k] || '#1565c0'; }),
      values: monthData
    });
  }

  var cv = document.getElementById('cMain');
  if (!cv) return false;
  var hc = document.getElementById('cMain-3d');
  if (hc) hc.style.display = 'none';

  var title = onlyBase
    ? 'Punto de partida · Siembra ' + (bl.fechaSiembra || '')
    : 'Siembra vs ' + mesLabel + ' ' + (typeof activeYear !== 'undefined' ? activeYear : '');

  return romexPaint3D(cv, labels, series, title);
}

function romexDrawFisico3D(d, fields) {
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
    color: '#90a4ae',
    values: baseData
  }];
  if (!onlyBase) {
    series.push({
      name: 'Resultado ' + mesLabel,
      color: '#0288d1',
      colors: fields.map(function (k) { return FISICO_3D_COLORS[k] || '#1565c0'; }),
      values: monthData
    });
  }

  var cv = document.getElementById('cMain');
  if (!cv) return false;
  var hc = document.getElementById('cMain-3d');
  if (hc) hc.style.display = 'none';

  var title = onlyBase
    ? 'Punto de partida físicoquímico'
    : 'Siembra vs ' + mesLabel;

  return romexPaint3D(cv, labels, series, title);
}

(function loadBl() {
  var urls = ['data/baselines.json', (window.API_BASE || '') + '/data/baselines.json'];
  function tryNext(i) {
    if (i >= urls.length) { window.ROMEX_BASELINES = { products: {} }; return; }
    fetch(urls[i]).then(function (r) {
      if (!r.ok) throw new Error('fail');
      return r.json();
    }).then(function (j) { window.ROMEX_BASELINES = j; })
      .catch(function () { tryNext(i + 1); });
  }
  tryNext(0);
})();
