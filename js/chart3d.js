/* Romex QC — gráfico 3D con modo oscuro. Solo este archivo (+ CSS chart). */
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

function romexIsDark() {
  return document.documentElement.getAttribute('data-theme') === 'dark';
}

var MICRO_3D_COLORS = {
  rtamv: '#42a5f5', mohos: '#ffb74d', coliformes: '#66bb6a', ecoli: '#26a69a',
  enterobacterias: '#ab47bc', levaduras: '#ec407a', saureus: '#ef5350'
};
var FISICO_3D_COLORS = {
  humedad: '#29b6f6', ph: '#ab47bc', ceniza: '#a1887f', grasa: '#ffee58',
  fineza: '#4db6ac', acidez: '#ef5350'
};

var _romexAnimId = 0;
var _romexRaf = 0;
var _romexLastDraw = null;

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
function easeOutExpo(t) {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}
function clamp01(t) {
  return t < 0 ? 0 : t > 1 ? 1 : t;
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

function romexTheme() {
  var dark = romexIsDark();
  if (dark) {
    return {
      dark: true,
      bg0: '#1a1d24', bg1: '#12141a',
      title: '#90caf9', sub: '#78909c',
      grid: 'rgba(144,164,174,0.12)', gridBase: 'rgba(144,164,174,0.28)',
      axisText: '#90a4ae', catText: '#b0bec5',
      valBase: '#90a4ae', valMonth: '#e3f2fd',
      legendText: '#cfd8dc',
      floor: 'rgba(144,164,174,0.08)',
      siembra: '#78909c'
    };
  }
  return {
    dark: false,
    bg0: '#f8fafc', bg1: '#ffffff',
    title: '#0d47a1', sub: '#90a4ae',
    grid: 'rgba(120,144,156,0.12)', gridBase: 'rgba(13,71,161,0.2)',
    axisText: '#607d8b', catText: '#455a64',
    valBase: '#78909c', valMonth: '#263238',
    legendText: '#37474f',
    floor: 'rgba(144,164,174,0.1)',
    siembra: '#90a4ae'
  };
}

function romexPaint3D(canvas, labels, series, title, progress) {
  if (!canvas) return false;
  if (progress == null || progress > 1) progress = 1;
  if (progress < 0) progress = 0;
  var th = romexTheme();

  var box = canvas.parentElement;
  var W = Math.max(400, (box && box.clientWidth) ? Math.floor(box.clientWidth) : 760);
  var H = 480;
  if (W < 640) H = 400;
  if (W < 420) H = 340;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);

  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.height = H + 'px';
  canvas.width = Math.floor(W * dpr);
  canvas.height = Math.floor(H * dpr);

  var ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);

  var bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, th.bg0);
  bg.addColorStop(1, th.bg1);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = th.title;
  ctx.font = '600 14px Roboto, system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(title || 'Gráfico 3D', 22, 26);

  ctx.fillStyle = th.sub;
  ctx.font = '400 11px Roboto, system-ui, sans-serif';
  ctx.fillText('■ Siembra (punto de partida)    ■ Resultado del mes', 22, 44);

  var nCat = labels.length;
  var nSer = series.length;
  if (!nCat) return true;

  var padL = 64, padR = 28, padT = 64, padB = 118;
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
  var scaleMax = maxV * 1.22;

  ctx.font = '10px Roboto, system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (var g = 0; g <= 5; g++) {
    var gy = padT + (plotH * g) / 5;
    var val = scaleMax * (1 - g / 5);
    ctx.strokeStyle = g === 5 ? th.gridBase : th.grid;
    ctx.lineWidth = g === 5 ? 1.4 : 1;
    ctx.beginPath();
    ctx.moveTo(padL, gy);
    ctx.lineTo(W - padR, gy);
    ctx.stroke();
    ctx.fillStyle = th.axisText;
    ctx.fillText(fmtVal(val), padL - 10, gy);
  }

  var depthX = 11;
  var depthY = 8;
  ctx.fillStyle = th.floor;
  ctx.beginPath();
  ctx.moveTo(padL, baseY);
  ctx.lineTo(padL + depthX, baseY - depthY);
  ctx.lineTo(W - padR + depthX * 0.25, baseY - depthY);
  ctx.lineTo(W - padR, baseY);
  ctx.closePath();
  ctx.fill();

  var groupW = plotW / nCat;
  var barGap = nSer > 1 ? 9 : 0;
  var barW = Math.min(38, Math.max(13, (groupW * 0.52 - barGap * (nSer - 1)) / nSer));
  var stagger = 0.55;

  function catProgress(i) {
    var start = (i / nCat) * stagger;
    var local = (progress - start) / (1 - stagger + 0.001);
    return easeOutExpo(clamp01(local));
  }

  function drawColumn(x, yBottom, w, h, color) {
    if (h < 1.5) h = 1.5;
    var top = yBottom - h;
    var side = darken(color, 0.28);
    var lid = lighten(color, 0.34);

    ctx.fillStyle = th.dark ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.07)';
    ctx.beginPath();
    ctx.ellipse(x + w / 2 + 2, yBottom + 2, w * 0.55 + depthX * 0.3, 3.5, 0, 0, Math.PI * 2);
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
    grad.addColorStop(0, lighten(color, 0.14));
    grad.addColorStop(0.55, color);
    grad.addColorStop(1, darken(color, 0.06));
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

    ctx.strokeStyle = darken(color, 0.18);
    ctx.lineWidth = 0.75;
    ctx.strokeRect(x, top, w, h);
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x + depthX, top - depthY);
    ctx.lineTo(x + w + depthX, top - depthY);
    ctx.lineTo(x + w, top);
    ctx.stroke();

    return top;
  }

  var valueLabels = [];

  for (var i = 0; i < nCat; i++) {
    var cp = catProgress(i);
    var groupCenter = padL + i * groupW + groupW / 2;
    var totalBarsW = nSer * barW + (nSer - 1) * barGap;
    var startX = groupCenter - totalBarsW / 2;

    for (var s = 0; s < nSer; s++) {
      var v = (series[s].values && series[s].values[i] != null) ? +series[s].values[i] : 0;
      var fullH = (v / scaleMax) * (plotH - 18);
      if (v > 0 && fullH < 4) fullH = 4;
      if (v === 0) fullH = 2;
      var serDelay = s * 0.12;
      var sp = easeOutExpo(clamp01((cp - serDelay) / (1 - serDelay + 0.001)));
      var h = fullH * sp;
      var x = startX + s * (barW + barGap);
      var col = (s === 0) ? th.siembra : ((series[s].colors && series[s].colors[i]) ? series[s].colors[i] : (series[s].color || '#42a5f5'));
      var top = drawColumn(x, baseY, barW, Math.max(h, 1), col);

      valueLabels.push({
        x: x + barW / 2 + depthX * 0.35,
        y: top - depthY - 5,
        text: fmtVal(v),
        series: s,
        ready: sp > 0.95
      });
    }

    ctx.globalAlpha = Math.min(1, progress * 1.4);
    ctx.fillStyle = th.catText;
    ctx.font = '500 10.5px Roboto, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(shortLabel(labels[i]), groupCenter, baseY + 18);
    ctx.globalAlpha = 1;
  }

  ctx.font = '600 9px Roboto, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  valueLabels.forEach(function (vl) {
    if (!vl.ready) return;
    ctx.fillStyle = vl.series === 0 ? th.valBase : th.valMonth;
    ctx.fillText(vl.text, vl.x, vl.y);
  });

  ctx.strokeStyle = th.gridBase;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(padL, baseY);
  ctx.lineTo(W - padR, baseY);
  ctx.stroke();

  var legendY = H - 26;
  ctx.font = '500 11.5px Roboto, system-ui, sans-serif';
  var parts = [];
  var totalW = 0;
  series.forEach(function (s) {
    var w = 16 + 8 + ctx.measureText(s.name).width;
    parts.push(w);
    totalW += w + 40;
  });
  totalW -= 40;
  var lx = Math.max(24, (W - totalW) / 2);

  series.forEach(function (s, si) {
    var legColor = si === 0 ? th.siembra : (s.color || '#42a5f5');
    var bx = lx, by = legendY - 6;
    ctx.fillStyle = darken(legColor, 0.25);
    ctx.fillRect(bx + 10, by - 2, 4, 12);
    ctx.fillStyle = legColor;
    ctx.fillRect(bx, by, 10, 12);
    ctx.fillStyle = lighten(legColor, 0.3);
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + 3, by - 3);
    ctx.lineTo(bx + 13, by - 3);
    ctx.lineTo(bx + 10, by);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = th.legendText;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(s.name, lx + 20, legendY);
    lx += parts[si] + 40;
  });

  return true;
}

function romexAnimate3D(canvas, labels, series, title) {
  if (!canvas) return false;
  _romexLastDraw = { canvas: canvas, labels: labels, series: series, title: title };
  if (_romexRaf) {
    cancelAnimationFrame(_romexRaf);
    _romexRaf = 0;
  }
  var animToken = ++_romexAnimId;
  var t0 = null;
  var duration = 720;

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

function romexRedrawTheme() {
  if (!_romexLastDraw) return;
  var d = _romexLastDraw;
  romexPaint3D(d.canvas, d.labels, d.series, d.title, 1);
}

/* Redibujar al cambiar tema claro/oscuro */
(function watchTheme() {
  try {
    var obs = new MutationObserver(function () {
      romexRedrawTheme();
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  } catch (e) {}
})();

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
      color: '#42a5f5',
      colors: keys.map(function (k) { return MICRO_3D_COLORS[k] || '#42a5f5'; }),
      values: monthData
    });
  }

  var cv = document.getElementById('cMain');
  if (!cv) return false;
  var hc = document.getElementById('cMain-3d');
  if (hc) hc.style.display = 'none';

  var title = onlyBase
    ? 'Punto de partida · Siembra' + (bl.fechaSiembra ? ' · ' + bl.fechaSiembra : '')
    : 'Comparación  ·  Siembra vs ' + mesLabel + (typeof activeYear !== 'undefined' ? ' ' + activeYear : '');

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
      color: '#29b6f6',
      colors: fields.map(function (k) { return FISICO_3D_COLORS[k] || '#29b6f6'; }),
      values: monthData
    });
  }

  var cv = document.getElementById('cMain');
  if (!cv) return false;
  var hc = document.getElementById('cMain-3d');
  if (hc) hc.style.display = 'none';

  var title = onlyBase
    ? 'Punto de partida · Físicoquímico'
    : 'Comparación  ·  Siembra vs ' + mesLabel;

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
