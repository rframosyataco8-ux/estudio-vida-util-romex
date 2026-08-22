/* Romex QC — Columnas 3D isométricas en Canvas (sin CDN / sin Highcharts) */
'use strict';

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

var MICRO_3D_COLORS = {
  rtamv: '#1565c0', mohos: '#ef6c00', coliformes: '#2e7d32', ecoli: '#43a047',
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

/**
 * Dibuja columnas 3D isométricas en un canvas.
 * series: [{ name, color, values: number[] }]
 */
function romexPaint3D(canvas, labels, series, title) {
  if (!canvas) return false;
  var box = canvas.parentElement;
  var W = (box && box.clientWidth) ? box.clientWidth : 640;
  var H = 320;
  var dpr = window.devicePixelRatio || 1;
  canvas.style.display = 'block';
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  canvas.width = Math.floor(W * dpr);
  canvas.height = Math.floor(H * dpr);
  var ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);

  /* fondo */
  ctx.fillStyle = '#fafbfc';
  ctx.fillRect(0, 0, W, H);

  /* título */
  ctx.fillStyle = '#37474f';
  ctx.font = '600 13px Roboto, Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(title || 'Gráfico 3D', 12, 20);

  var nCat = labels.length;
  var nSer = series.length;
  if (!nCat) return true;

  var padL = 48, padR = 16, padT = 40, padB = 70;
  var plotW = W - padL - padR;
  var plotH = H - padT - padB;
  var baseY = padT + plotH;

  var maxV = 0;
  series.forEach(function (s) {
    s.values.forEach(function (v) { if (v > maxV) maxV = v; });
  });
  if (maxV <= 0) maxV = 1;

  /* grid horizontal */
  ctx.strokeStyle = 'rgba(0,0,0,0.08)';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#90a4ae';
  ctx.font = '10px Roboto, Arial, sans-serif';
  ctx.textAlign = 'right';
  for (var g = 0; g <= 4; g++) {
    var gy = padT + (plotH * g) / 4;
    var val = maxV * (1 - g / 4);
    ctx.beginPath();
    ctx.moveTo(padL, gy);
    ctx.lineTo(W - padR, gy);
    ctx.stroke();
    ctx.fillText(val >= 10 ? Math.round(val) : val.toFixed(1), padL - 6, gy + 3);
  }

  /* dimensiones 3D */
  var depthX = 10;  /* desplazamiento X de la cara superior */
  var depthY = 8;   /* desplazamiento Y de la cara superior */
  var groupGap = plotW / nCat;
  var barGap = 4;
  var barW = Math.max(8, (groupGap - 16 - (nSer - 1) * barGap) / nSer);
  if (barW > 36) barW = 36;

  function drawBox3D(x, yBottom, w, h, color) {
    if (h < 1) h = 1;
    var top = yBottom - h;
    var face = color;
    var topC = lighten(color, 0.35);
    var sideC = darken(color, 0.25);

    /* cara lateral derecha */
    ctx.beginPath();
    ctx.moveTo(x + w, yBottom);
    ctx.lineTo(x + w + depthX, yBottom - depthY);
    ctx.lineTo(x + w + depthX, top - depthY);
    ctx.lineTo(x + w, top);
    ctx.closePath();
    ctx.fillStyle = sideC;
    ctx.fill();
    ctx.strokeStyle = darken(color, 0.35);
    ctx.lineWidth = 0.8;
    ctx.stroke();

    /* cara frontal */
    ctx.fillStyle = face;
    ctx.fillRect(x, top, w, h);
    ctx.strokeStyle = darken(color, 0.2);
    ctx.strokeRect(x, top, w, h);

    /* cara superior */
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x + depthX, top - depthY);
    ctx.lineTo(x + w + depthX, top - depthY);
    ctx.lineTo(x + w, top);
    ctx.closePath();
    ctx.fillStyle = topC;
    ctx.fill();
    ctx.strokeStyle = darken(color, 0.15);
    ctx.stroke();

    /* valor encima */
    ctx.fillStyle = '#263238';
    ctx.font = '600 9px Roboto, Arial, sans-serif';
    ctx.textAlign = 'center';
    var label = h < 2 && maxV > 1 ? '0' : (maxV >= 10 ? Math.round((h / plotH) * maxV) : ((h / plotH) * maxV).toFixed(1));
    /* recalcular valor real */
  }

  function drawBox3DVal(x, yBottom, w, h, color, value) {
    if (h < 1) h = 1;
    var top = yBottom - h;
    var face = color;
    var topC = lighten(color, 0.35);
    var sideC = darken(color, 0.25);

    ctx.beginPath();
    ctx.moveTo(x + w, yBottom);
    ctx.lineTo(x + w + depthX, yBottom - depthY);
    ctx.lineTo(x + w + depthX, top - depthY);
    ctx.lineTo(x + w, top);
    ctx.closePath();
    ctx.fillStyle = sideC;
    ctx.fill();
    ctx.strokeStyle = darken(color, 0.35);
    ctx.lineWidth = 0.8;
    ctx.stroke();

    ctx.fillStyle = face;
    ctx.fillRect(x, top, w, h);
    ctx.strokeStyle = darken(color, 0.2);
    ctx.strokeRect(x, top, w, h);

    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x + depthX, top - depthY);
    ctx.lineTo(x + w + depthX, top - depthY);
    ctx.lineTo(x + w, top);
    ctx.closePath();
    ctx.fillStyle = topC;
    ctx.fill();
    ctx.strokeStyle = darken(color, 0.15);
    ctx.stroke();

    ctx.fillStyle = '#263238';
    ctx.font = '600 9px Roboto, Arial, sans-serif';
    ctx.textAlign = 'center';
    var txt = value === 0 ? '0' : (Math.abs(value) >= 10 ? Math.round(value) : (+value).toFixed(1));
    ctx.fillText(txt, x + w / 2 + depthX / 2, top - depthY - 4);
  }

  for (var i = 0; i < nCat; i++) {
    var groupX = padL + i * groupGap + (groupGap - nSer * barW - (nSer - 1) * barGap) / 2;
    for (var s = 0; s < nSer; s++) {
      var v = series[s].values[i] || 0;
      var h = (v / maxV) * (plotH - 12);
      var x = groupX + s * (barW + barGap);
      var col = series[s].colors ? series[s].colors[i] : series[s].color;
      drawBox3DVal(x, baseY, barW, h, col || '#1565c0', v);
    }
    /* etiqueta categoría */
    ctx.fillStyle = '#546e7a';
    ctx.font = '500 10px Roboto, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(labels[i], padL + i * groupGap + groupGap / 2, baseY + 16);
  }

  /* leyenda */
  var lx = padL;
  var ly = H - 22;
  series.forEach(function (s, si) {
    ctx.fillStyle = s.color || '#888';
    ctx.fillRect(lx, ly - 8, 12, 12);
    ctx.strokeStyle = darken(s.color || '#888', 0.2);
    ctx.strokeRect(lx, ly - 8, 12, 12);
    ctx.fillStyle = '#455a64';
    ctx.font = '11px Roboto, Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(s.name, lx + 16, ly + 2);
    lx += ctx.measureText(s.name).width + 36;
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
  /* ocultar div highcharts si existiera */
  var hc = document.getElementById('cMain-3d');
  if (hc) hc.style.display = 'none';

  var title = onlyBase
    ? 'Punto de partida · Siembra ' + (bl.fechaSiembra || '')
    : 'Columnas 3D · siembra vs ' + mesLabel + ' ' + (typeof activeYear !== 'undefined' ? activeYear : '');

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
    ? 'Punto de partida físicoquímico 3D'
    : 'Columnas 3D · siembra vs ' + mesLabel;

  return romexPaint3D(cv, labels, series, title);
}

/* baselines */
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
