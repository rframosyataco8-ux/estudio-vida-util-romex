/* Romex QC — SOLO gráfico 3D (Canvas). No modifica app.js ni extras. */
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
  rtamv: '#1976d2', mohos: '#f57c00', coliformes: '#388e3c', ecoli: '#00796b',
  enterobacterias: '#7b1fa2', levaduras: '#c2185b', saureus: '#d32f2f'
};
var FISICO_3D_COLORS = {
  humedad: '#0288d1', ph: '#7b1fa2', ceniza: '#6d4c41', grasa: '#f9a825',
  fineza: '#00897b', acidez: '#c62828'
};

var _romexAnimId = 0;

function _hexRgb(hex) {
  hex = String(hex || '#888888').replace('#', '');
  if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  return {
    r: parseInt(hex.substr(0, 2), 16) || 0,
    g: parseInt(hex.substr(2, 2), 16) || 0,
    b: parseInt(hex.substr(4, 2), 16) || 0
  };
}
function lighten(hex, pct) {
  var c = _hexRgb(hex);
  return 'rgb(' +
    Math.min(255, Math.round(c.r + (255 - c.r) * pct)) + ',' +
    Math.min(255, Math.round(c.g + (255 - c.g) * pct)) + ',' +
    Math.min(255, Math.round(c.b + (255 - c.b) * pct)) + ')';
}
function darken(hex, pct) {
  var c = _hexRgb(hex);
  return 'rgb(' +
    Math.max(0, Math.round(c.r * (1 - pct))) + ',' +
    Math.max(0, Math.round(c.g * (1 - pct))) + ',' +
    Math.max(0, Math.round(c.b * (1 - pct))) + ')';
}
function fmtVal(v) {
  if (v == null || !isFinite(v)) return '0';
  if (Math.abs(v) >= 100) return String(Math.round(v));
  if (Math.abs(v) >= 10) return String(Math.round(v * 10) / 10);
  var t = (Math.round(v * 100) / 100).toFixed(2);
  return t.replace(/\.00$/, '').replace(/(\.[1-9])0$/, '$1');
}
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function romexPaint3D(canvas, labels, series, title, progress) {
  if (!canvas) return false;
  if (progress == null || progress > 1) progress = 1;
  if (progress < 0) progress = 0;
  var p = easeOutCubic(progress);

  var box = canvas.parentElement;
  var W = Math.max(360, (box && box.clientWidth) ? box.clientWidth - 4 : 720);
  var H = 420;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);

  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.height = H + 'px';
  canvas.width = Math.floor(W * dpr);
  canvas.height = Math.floor(H * dpr);

  var ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);

  ctx.fillStyle = '#fafbfc';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#263238';
  ctx.font = '600 14px Roboto, system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(title || 'Gráfico 3D', 18, 24);

  var nCat = labels.length;
  var nSer = series.length;
  if (!nCat) return true;

  var padL = 58, padR = 24, padT = 52, padB = 96;
  var plotW = W - padL - padR;
  var plotH = H - padT - padB;
  var baseY = padT + plotH;

  var maxV = 0;
  series.forEach(function (s) {
    (s.values || []).forEach(function (v) {
      if (+v > maxV) maxV = +v;
    });
  });
  if (maxV <= 0) maxV = 1;
  var scaleMax = maxV * 1.15;

  ctx.font = '10px Roboto, system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (var g = 0; g <= 5; g++) {
    var gy = padT + (plotH * g) / 5;
    var val = scaleMax * (1 - g / 5);
    ctx.strokeStyle = g === 5 ? 'rgba(38,50,56,0.18)' : 'rgba(38,50,56,0.06)';
    ctx.lineWidth = g === 5 ? 1.2 : 1;
    ctx.beginPath();
    ctx.moveTo(padL, gy);
    ctx.lineTo(W - padR, gy);
    ctx.stroke();
    ctx.fillStyle = '#607d8b';
    ctx.fillText(fmtVal(val), padL - 8, gy);
  }

  var depthX = 12;
  var depthY = 9;
  ctx.fillStyle = 'rgba(176,190,197,0.12)';
  ctx.beginPath();
  ctx.moveTo(padL, baseY);
  ctx.lineTo(padL + depthX, baseY - depthY);
  ctx.lineTo(W - padR + depthX * 0.3, baseY - depthY);
  ctx.lineTo(W - padR, baseY);
  ctx.closePath();
  ctx.fill();

  var groupW = plotW / nCat;
  var barGap = nSer > 1 ? 7 : 0;
  var barW = Math.min(48, Math.max(16, (groupW * 0.72 - barGap * (nSer - 1)) / nSer));

  function drawColumn(x, yBottom, w, h, color, value) {
    if (h < 2) h = 2;
    var top = yBottom - h;
    var side = darken(color, 0.28);
    var lid = lighten(color, 0.32);

    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.beginPath();
    ctx.moveTo(x + 2, yBottom);
    ctx.lineTo(x + w + depthX + 2, yBottom);
    ctx.lineTo(x + w + depthX + 2, yBottom + 3);
    ctx.lineTo(x + 2, yBottom + 3);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x + w, yBottom);
    ctx.lineTo(x + w + depthX, yBottom - depthY);
    ctx.lineTo(x + w + depthX, top - depthY);
    ctx.lineTo(x + w, top);
    ctx.closePath();
    ctx.fillStyle = side;
    ctx.fill();

    var grad = ctx.createLinearGradient(x, top, x, yBottom);
    grad.addColorStop(0, lighten(color, 0.12));
    grad.addColorStop(1, color);
    ctx.fillStyle = grad;
    ctx.fillRect(x, top, w, h);

    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x + depthX, top - depthY);
    ctx.lineTo(x + w + depthX, top - depthY);
    ctx.lineTo(x + w, top);
    ctx.closePath();
    ctx.fillStyle = lid;
    ctx.fill();

    ctx.strokeStyle = darken(color, 0.22);
    ctx.lineWidth = 0.8;
    ctx.strokeRect(x, top, w, h);
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x + depthX, top - depthY);
    ctx.lineTo(x + w + depthX, top - depthY);
    ctx.lineTo(x + w, top);
    ctx.stroke();

    if (progress > 0.85) {
      ctx.globalAlpha = Math.min(1, (progress - 0.85) / 0.15);
      ctx.fillStyle = '#37474f';
      ctx.font = '600 10px Roboto, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(fmtVal(value), x + w / 2 + depthX * 0.45, top - depthY - 4);
      ctx.globalAlpha = 1;
    }
  }

  for (var i = 0; i < nCat; i++) {
    var groupCenter = padL + i * groupW + groupW / 2;
    var totalBarsW = nSer * barW + (nSer - 1) * barGap;
    var startX = groupCenter - totalBarsW / 2;

    for (var s = 0; s < nSer; s++) {
      var v = (series[s].values && series[s].values[i] != null) ? +series[s].values[i] : 0;
      var fullH = (v / scaleMax) * (plotH - 10);
      if (v > 0 && fullH < 4) fullH = 4;
      if (v === 0) fullH = 2;
      var h = fullH * p;
      var x = startX + s * (barW + barGap);
      var col = (series[s].colors && series[s].colors[i]) ? series[s].colors[i] : (series[s].color || '#1976d2');
      drawColumn(x, baseY, barW, Math.max(h, 1), col, v);
    }

    ctx.fillStyle = '#455a64';
    ctx.font = '500 11px Roboto, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    var lab = String(labels[i] || '');
    if (lab.length > 10 && groupW < 100) {
      var cut = lab.lastIndexOf(' ', 9);
      if (cut < 4) cut = 8;
      ctx.fillText(lab.slice(0, cut).trim(), groupCenter, baseY + 12);
      ctx.fillText(lab.slice(cut).trim(), groupCenter, baseY + 26);
    } else {
      ctx.fillText(lab, groupCenter, baseY + 14);
    }
  }

  var legendY = H - 26;
  ctx.font = '500 11px Roboto, system-ui, sans-serif';
  var parts = [];
  var totalW = 0;
  series.forEach(function (s) {
    var w = 14 + 6 + ctx.measureText(s.name).width;
    parts.push(w);
    totalW += w + 28;
  });
  totalW -= 28;
  var lx = Math.max(18, (W - totalW) / 2);
  series.forEach(function (s, si) {
    ctx.fillStyle = s.color || '#90a4ae';
    ctx.fillRect(lx, legendY - 7, 12, 12);
    ctx.strokeStyle = darken(s.color || '#90a4ae', 0.25);
    ctx.lineWidth = 0.8;
    ctx.strokeRect(lx, legendY - 7, 12, 12);
    ctx.fillStyle = '#37474f';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(s.name, lx + 18, legendY - 1);
    lx += parts[si] + 28;
  });

  return true;
}

function romexAnimate3D(canvas, labels, series, title) {
  if (!canvas) return false;
  var animToken = ++_romexAnimId;
  var t0 = null;
  var duration = 650;

  function frame(ts) {
    if (animToken !== _romexAnimId) return;
    if (t0 == null) t0 = ts;
    var t = Math.min(1, (ts - t0) / duration);
    romexPaint3D(canvas, labels, series, title, t);
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return true;
}

function romexDrawMicro3D(d) {
  var bl = romexGetBaseline(typeof activeCodigo !== 'undefined' ? activeCodigo : '');
  var keys = (typeof MICRO_KEYS !== 'undefined' ? MICRO_KEYS : null) ||
    ['rtamv', 'mohos', 'coliformes', 'ecoli', 'enterobacterias', 'levaduras', 'saureus'];
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
  var mesLabel = (typeof MONTH_NAMES !== 'undefined' && MONTH_NAMES[activeMonth])
    ? MONTH_NAMES[activeMonth] : String(activeMonth);

  var series = [{
    name: 'Punto de partida (siembra)',
    color: '#90a4ae',
    values: baseData
  }];
  if (!onlyBase) {
    series.push({
      name: 'Resultado ' + mesLabel,
      color: '#1976d2',
      colors: keys.map(function (k) { return MICRO_3D_COLORS[k] || '#1976d2'; }),
      values: monthData
    });
  }

  var cv = document.getElementById('cMain');
  if (!cv) return false;
  var hc = document.getElementById('cMain-3d');
  if (hc) hc.style.display = 'none';

  var title = onlyBase
    ? 'Punto de partida · Siembra' + (bl.fechaSiembra ? ' ' + bl.fechaSiembra : '')
    : 'Siembra vs ' + mesLabel + (typeof activeYear !== 'undefined' ? ' ' + activeYear : '');

  return romexAnimate3D(cv, labels, series, title);
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
  var mesLabel = (typeof MONTH_NAMES !== 'undefined' && MONTH_NAMES[activeMonth])
    ? MONTH_NAMES[activeMonth] : String(activeMonth);

  var series = [{
    name: 'Punto de partida (siembra)',
    color: '#90a4ae',
    values: baseData
  }];
  if (!onlyBase) {
    series.push({
      name: 'Resultado ' + mesLabel,
      color: '#0288d1',
      colors: fields.map(function (k) { return FISICO_3D_COLORS[k] || '#0288d1'; }),
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

  return romexAnimate3D(cv, labels, series, title);
}

(function loadBl() {
  var urls = ['data/baselines.json', (window.API_BASE || '') + '/data/baselines.json'];
  function tryNext(i) {
    if (i >= urls.length) {
      window.ROMEX_BASELINES = window.ROMEX_BASELINES || { products: {} };
      return;
    }
    fetch(urls[i]).then(function (r) {
      if (!r.ok) throw new Error('fail');
      return r.json();
    }).then(function (j) {
      window.ROMEX_BASELINES = j;
    }).catch(function () {
      tryNext(i + 1);
    });
  }
  tryNext(0);
})();
