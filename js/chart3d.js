/* Romex QC — gráfico 3D. Easing mejorado. Solo este archivo. */
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
  rtamv: '#1976d2', mohos: '#ef6c00', coliformes: '#43a047', ecoli: '#00897b',
  enterobacterias: '#8e24aa', levaduras: '#d81b60', saureus: '#e53935'
};
var FISICO_3D_COLORS = {
  humedad: '#0288d1', ph: '#7b1fa2', ceniza: '#6d4c41', grasa: '#f9a825',
  fineza: '#00897b', acidez: '#c62828'
};

var _romexAnimId = 0;
var _romexRaf = 0;

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

/** Easing: arranque rápido, frenado suave al final */
function easeOutQuart(t) {
  return 1 - Math.pow(1 - t, 4);
}

function shortLabel(lab) {
  var map = {
    'RTAMV': 'RTAMV', 'Mohos': 'Mohos', 'Coliformes': 'Colif.', 'Colif.': 'Colif.',
    'E.Coli': 'E.Coli', 'Enterobact.': 'Enterob.', 'Enterob.': 'Enterob.',
    'Levaduras': 'Levad.', 'Levad.': 'Levad.', 'S.Aureus': 'S.Aur.', 'S.Aur.': 'S.Aur.',
    '% Humedad': 'Humedad', '% Ceniza': 'Ceniza', '% Grasa': 'Grasa',
    '% Fineza': 'Fineza', '% Acidez': 'Acidez', 'pH': 'pH'
  };
  return map[lab] || lab;
}

function romexPaint3D(canvas, labels, series, title, progress) {
  if (!canvas) return false;
  if (progress == null || progress > 1) progress = 1;
  if (progress < 0) progress = 0;
  var p = easeOutQuart(progress);

  var box = canvas.parentElement;
  var W = Math.max(420, (box && box.clientWidth) ? Math.floor(box.clientWidth) : 760);
  var H = 460;
  if (W < 600) H = 380;
  if (W < 420) H = 320;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);

  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.height = H + 'px';
  canvas.width = Math.floor(W * dpr);
  canvas.height = Math.floor(H * dpr);

  var ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#1a237e';
  ctx.font = '600 13px Roboto, system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(title || 'Gráfico 3D', 20, 22);

  ctx.fillStyle = '#78909c';
  ctx.font = '400 10px Roboto, system-ui, sans-serif';
  ctx.fillText('Gris = siembra  ·  Color = mes actual', 20, 38);

  var nCat = labels.length;
  var nSer = series.length;
  if (!nCat) return true;

  var padL = 58, padR = 24, padT = 58, padB = 112;
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
  var scaleMax = maxV * 1.28;

  ctx.font = '10px Roboto, system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (var g = 0; g <= 4; g++) {
    var gy = padT + (plotH * g) / 4;
    var val = scaleMax * (1 - g / 4);
    ctx.strokeStyle = g === 4 ? 'rgba(55,71,79,0.22)' : 'rgba(55,71,79,0.07)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, gy);
    ctx.lineTo(W - padR, gy);
    ctx.stroke();
    ctx.fillStyle = '#607d8b';
    ctx.fillText(fmtVal(val), padL - 8, gy);
  }

  var depthX = 9;
  var depthY = 6;
  var groupW = plotW / nCat;
  var barGap = nSer > 1 ? 10 : 0;
  var barW = Math.min(34, Math.max(12, (groupW * 0.5 - barGap * (nSer - 1)) / nSer));

  function drawColumn(x, yBottom, w, h, color) {
    if (h < 2) h = 2;
    var top = yBottom - h;
    var side = darken(color, 0.26);
    var lid = lighten(color, 0.30);

    ctx.fillStyle = 'rgba(0,0,0,0.05)';
    ctx.fillRect(x + 1, yBottom, w + depthX, 2);

    ctx.beginPath();
    ctx.moveTo(x + w, yBottom);
    ctx.lineTo(x + w + depthX, yBottom - depthY);
    ctx.lineTo(x + w + depthX, top - depthY);
    ctx.lineTo(x + w, top);
    ctx.closePath();
    ctx.fillStyle = side;
    ctx.fill();

    ctx.fillStyle = color;
    ctx.fillRect(x, top, w, h);

    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x + depthX, top - depthY);
    ctx.lineTo(x + w + depthX, top - depthY);
    ctx.lineTo(x + w, top);
    ctx.closePath();
    ctx.fillStyle = lid;
    ctx.fill();

    ctx.strokeStyle = darken(color, 0.2);
    ctx.lineWidth = 0.7;
    ctx.strokeRect(x, top, w, h);

    return top;
  }

  var valueLabels = [];

  for (var i = 0; i < nCat; i++) {
    var groupCenter = padL + i * groupW + groupW / 2;
    var totalBarsW = nSer * barW + (nSer - 1) * barGap;
    var startX = groupCenter - totalBarsW / 2;

    for (var s = 0; s < nSer; s++) {
      var v = (series[s].values && series[s].values[i] != null) ? +series[s].values[i] : 0;
      var fullH = (v / scaleMax) * (plotH - 16);
      if (v > 0 && fullH < 3) fullH = 3;
      if (v === 0) fullH = 1.5;
      var h = fullH * p;
      var x = startX + s * (barW + barGap);
      var col = (s === 0) ? '#90a4ae' : ((series[s].colors && series[s].colors[i]) ? series[s].colors[i] : (series[s].color || '#1976d2'));
      var top = drawColumn(x, baseY, barW, Math.max(h, 1), col);

      valueLabels.push({
        x: x + barW / 2 + depthX * 0.3,
        y: top - depthY - 4,
        text: fmtVal(v),
        series: s
      });
    }

    ctx.fillStyle = '#455a64';
    ctx.font = '500 10px Roboto, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(shortLabel(labels[i]), groupCenter, baseY + 16);
  }

  if (progress >= 0.92) {
    ctx.globalAlpha = Math.min(1, (progress - 0.92) / 0.08);
    ctx.font = '600 9px Roboto, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    valueLabels.forEach(function (vl) {
      ctx.fillStyle = vl.series === 0 ? '#607d8b' : '#263238';
      ctx.fillText(vl.text, vl.x, vl.y);
    });
    ctx.globalAlpha = 1;
  }

  ctx.strokeStyle = 'rgba(55,71,79,0.25)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(padL, baseY);
  ctx.lineTo(W - padR, baseY);
  ctx.stroke();

  var legendY = H - 24;
  ctx.font = '500 11px Roboto, system-ui, sans-serif';
  var parts = [];
  var totalW = 0;
  series.forEach(function (s) {
    var w = 14 + 6 + ctx.measureText(s.name).width;
    parts.push(w);
    totalW += w + 36;
  });
  totalW -= 36;
  var lx = Math.max(20, (W - totalW) / 2);

  series.forEach(function (s, si) {
    var legColor = si === 0 ? '#90a4ae' : (s.color || '#1976d2');
    ctx.fillStyle = legColor;
    ctx.fillRect(lx, legendY - 7, 12, 12);
    ctx.strokeStyle = darken(legColor, 0.2);
    ctx.lineWidth = 0.8;
    ctx.strokeRect(lx, legendY - 7, 12, 12);
    ctx.fillStyle = '#37474f';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(s.name, lx + 18, legendY - 1);
    lx += parts[si] + 36;
  });

  return true;
}

function romexAnimate3D(canvas, labels, series, title) {
  if (!canvas) return false;
  if (_romexRaf) {
    cancelAnimationFrame(_romexRaf);
    _romexRaf = 0;
  }
  var animToken = ++_romexAnimId;
  var t0 = null;
  var duration = 420;

  function frame(ts) {
    if (animToken !== _romexAnimId) return;
    if (t0 == null) t0 = ts;
    var t = Math.min(1, (ts - t0) / duration);
    romexPaint3D(canvas, labels, series, title, t);
    if (t < 1) {
      _romexRaf = requestAnimationFrame(frame);
    } else {
      _romexRaf = 0;
    }
  }
  _romexRaf = requestAnimationFrame(frame);
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
    ? 'Punto de partida · Siembra' + (bl.fechaSiembra ? ' · ' + bl.fechaSiembra : '')
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
    ? 'Punto de partida · Físicoquímico'
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
