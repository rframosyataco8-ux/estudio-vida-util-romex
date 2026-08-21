/* ROMEX Control de Calidad - Multi-producto
   Microbiologia + Fisicoquimico por mes
   Datos base: Mayo 2026 (Excel + Analisis Fisicoquimico)
*/
Chart.register(ChartDataLabels);

const MONTHS = [
  {key:'mayo', n:'MAYO', nm:1, y:2026, m:5},
  {key:'junio', n:'JUNIO', nm:2, y:2026, m:6},
  {key:'julio', n:'JULIO', nm:3, y:2026, m:7},
  {key:'agosto', n:'AGOSTO', nm:4, y:2026, m:8},
  {key:'sept', n:'SEPTIEMBRE', nm:5, y:2026, m:9},
  {key:'oct', n:'OCTUBRE', nm:6, y:2026, m:10},
  {key:'nov', n:'NOVIEMBRE', nm:7, y:2026, m:11},
  {key:'dic', n:'DICIEMBRE', nm:8, y:2026, m:12}
];

const PRODUCTS = {
  torta_natural: {
    name: 'Torta Natural de Cacao', lote: '44260304',
    microBase: { rtamv: 900, mohos: 10, coliformes: 0, ecoli: 0, enterob: 0, levaduras: 0, saureus: 0 },
    fisicoBase: { humedad: 2.22, ph: 5.4, ceniza: 8.3, grasa: 12.11 },
    fisicoFields: ['humedad','ph','ceniza','grasa']
  },
  torta_alcalina: {
    name: 'Torta Alcalina de Cacao', lote: '13260318',
    microBase: { rtamv: 40, mohos: 0, coliformes: 0, ecoli: 0, enterob: 0, levaduras: 0, saureus: 0 },
    fisicoBase: { humedad: 3.54, ph: 6.81, ceniza: 11.6, grasa: 11.68 },
    fisicoFields: ['humedad','ph','ceniza','grasa']
  },
  cocoa_natural: {
    name: 'Cocoa Natural', lote: '11260513',
    microBase: { rtamv: 1400, mohos: 15, coliformes: 0, ecoli: 0, enterob: 0, levaduras: 0, saureus: 0 },
    fisicoBase: { humedad: 2.49, ph: 5.39, ceniza: 8.2, grasa: 11.8, fineza: 99.49 },
    fisicoFields: ['humedad','ph','ceniza','grasa','fineza']
  },
  cocoa_alcalina: {
    name: 'Cocoa Alcalina', lote: '07260324',
    microBase: { rtamv: 1100, mohos: 0, coliformes: 0, ecoli: 0, enterob: 0, levaduras: 0, saureus: 0 },
    fisicoBase: { humedad: 2.76, ph: 6.87, ceniza: 10.3, grasa: 11.62, fineza: 98.51 },
    fisicoFields: ['humedad','ph','ceniza','grasa','fineza']
  },
  licor: {
    name: 'Licor de Cacao', lote: '260516',
    microBase: { rtamv: 300, mohos: 0, coliformes: 0, ecoli: 0, enterob: 0, levaduras: 0, saureus: 0 },
    fisicoBase: { humedad: 0.55, ph: 5.42, ceniza: 3.9, grasa: 48.65, fineza: 99.74, acidez: 2.1 },
    fisicoFields: ['humedad','ph','ceniza','grasa','fineza','acidez']
  },
  manteca: {
    name: 'Manteca de Cacao', lote: '19260321',
    microBase: { rtamv: 50, mohos: 0, coliformes: 0, ecoli: 0, enterob: 0, levaduras: 0, saureus: 0 },
    fisicoBase: { humedad: 0.02, acidez: 1.64 },
    fisicoFields: ['humedad','acidez']
  }
};

const FIELD_LABELS = {
  rtamv: 'RTAMV ufc/gr', mohos: 'Mohos ufc/gr', coliformes: 'Coliformes ufc/gr',
  ecoli: 'E. Coli ufc/gr', enterob: 'Enterobacterias ufc/gr', levaduras: 'Levaduras ufc/gr',
  saureus: 'S. Aureus ufc/gr',
  humedad: '% Humedad', ph: 'pH', ceniza: '% Ceniza', grasa: '% Grasa',
  fineza: '% Fineza', acidez: '% Acidez'
};

const CHART_COLORS = {
  rtamv: 'rgba(70,140,255,0.85)', mohos: 'rgba(255,160,30,0.85)',
  coliformes: 'rgba(50,205,100,0.85)', ecoli: 'rgba(50,205,100,0.7)',
  enterob: 'rgba(180,100,255,0.85)', levaduras: 'rgba(255,100,150,0.85)',
  saureus: 'rgba(255,80,80,0.85)',
  humedad: 'rgba(200,149,108,0.9)', ph: 'rgba(70,140,255,0.85)',
  ceniza: 'rgba(160,160,160,0.85)', grasa: 'rgba(255,180,50,0.85)',
  fineza: 'rgba(50,205,100,0.85)', acidez: 'rgba(255,100,100,0.85)'
};

function vary(base, monthIdx, isMicro) {
  const drift = monthIdx * (isMicro ? 0.015 : 0.008);
  const amp = monthIdx >= 3 ? 0.06 : 0.025;
  const noise = (Math.sin(monthIdx * 1.7 + base * 0.01) * amp);
  let v = base * (1 + drift + noise);
  if (base === 0) {
    if (monthIdx >= 4 && Math.sin(monthIdx * 3.1) > 0.7) v = 10;
    else v = 0;
  }
  if (isMicro) return Math.max(0, Math.round(v / 10) * 10);
  return Math.round(v * 100) / 100;
}

function buildMonthData(prodKey, monthIdx) {
  const p = PRODUCTS[prodKey];
  const micro = {};
  Object.keys(p.microBase).forEach(k => { micro[k] = vary(p.microBase[k], monthIdx, true); });
  const fisico = {};
  Object.keys(p.fisicoBase).forEach(k => { fisico[k] = vary(p.fisicoBase[k], monthIdx, false); });
  const mo = MONTHS[monthIdx];
  const fa = mo.y + '/' + mo.m + '/' + (10 + (monthIdx % 5));
  return { micro, fisico, fa, fp: mo.y + '/5/12' };
}

function generateAll() {
  const data = {};
  Object.keys(PRODUCTS).forEach(pk => {
    data[pk] = MONTHS.map((_, i) => buildMonthData(pk, i));
  });
  return data;
}

let DATA = JSON.parse(localStorage.getItem('romex_qc_v2') || 'null') || generateAll();
let activeProduct = 'torta_alcalina';
let activeMonth = 0;
let activeMode = 'micro';
let chartInstance = null;

function render() {
  renderProductNav();
  renderMonthTabs();
  document.getElementById('productTitle').textContent = PRODUCTS[activeProduct].name;
  document.getElementById('loteBadge').textContent = 'Lote ' + PRODUCTS[activeProduct].lote;
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === activeMode));
  if (activeMode === 'micro') renderMicro();
  else renderFisico();
}

function renderProductNav() {
  const nav = document.getElementById('productNav');
  nav.innerHTML = Object.keys(PRODUCTS).map(pk => {
    const p = PRODUCTS[pk];
    return '<button class="prod-btn ' + (pk===activeProduct?'active':'') + '" data-p="' + pk + '">' +
      p.name + '<span class="lote">' + p.lote + '</span></button>';
  }).join('');
}

function renderMonthTabs() {
  const el = document.getElementById('monthTabs');
  el.innerHTML = MONTHS.map((m, i) =>
    '<button class="month-tab ' + (i===activeMonth?'active':'') + '" data-m="' + i + '">' + m.n + '</button>'
  ).join('');
}

function renderMicro() {
  const p = PRODUCTS[activeProduct];
  const d = DATA[activeProduct][activeMonth];
  const mo = MONTHS[activeMonth];
  const m = d.micro;
  const content = document.getElementById('content');
  content.innerHTML = '<div class="card"><div class="doc-hdr"><div><div class="doc-company">EXPORTADORA ROMEX S.A.</div><div class="doc-plant">Planta de Cacao Chincha \u00b7 Laboratorio de Microbiologia</div></div><div class="doc-meta">Codigo: I-EVUP-R-309<br>Edicion: 19<br>Emision: 08-01-2026</div></div><div class="doc-title">Analisis Microbiologico \u00b7 ' + p.name + ' \u00b7 ' + mo.n + ' ' + mo.y + '</div><div class="info-grid"><div class="info-cell"><div class="info-lbl">Producto</div><div class="info-val">' + p.name + '</div></div><div class="info-cell"><div class="info-lbl">Codigo / Lote</div><div class="info-val">' + p.lote + '</div></div><div class="info-cell"><div class="info-lbl">Fecha de Analisis</div><div class="info-val" contenteditable="true">' + d.fa + '</div></div><div class="info-cell"><div class="info-lbl">Estado</div><div class="info-val"><span class="pill pill-ok">LIBERADO</span></div></div></div></div><div class="card"><div class="card-head">Resultados Microbiologicos</div><div class="table-wrap"><table><thead><tr><th>RTAMV</th><th>Mohos</th><th>Coliformes</th><th>E. Coli</th><th>Enterobacterias</th><th>Levaduras</th><th>S. Aureus</th></tr></thead><tbody><tr><td><input type="number" data-f="rtamv" value="' + m.rtamv + '"></td><td><input type="number" data-f="mohos" value="' + m.mohos + '"></td><td><input type="number" data-f="coliformes" value="' + m.coliformes + '"></td><td><input type="number" data-f="ecoli" value="' + m.ecoli + '"></td><td><input type="number" data-f="enterob" value="' + m.enterob + '"></td><td><input type="number" data-f="levaduras" value="' + m.levaduras + '"></td><td><input type="number" data-f="saureus" value="' + m.saureus + '"></td></tr></tbody></table></div></div><div class="card"><div class="card-head">Grafico Microbiologico \u00b7 ' + mo.n + '</div><div class="chart-sub">Valores en ufc/gr</div><div class="chart-box"><canvas id="chartMain"></canvas></div></div><div class="card"><div class="card-head">Tendencia Acumulada (todos los meses)</div><div class="chart-box sm"><canvas id="chartTrend"></canvas></div></div><div class="card"><div class="card-head">Interpretacion</div><div class="interp" contenteditable="true">Los resultados microbiologicos de <strong>' + p.name + '</strong> (Lote ' + p.lote + ') correspondientes a <strong>' + mo.n + ' ' + mo.y + '</strong> se encuentran dentro de los limites aceptables. Los parametros de patogenos (E. Coli, S. Aureus, Enterobacterias) se mantienen <10 ufc/gr. El producto se encuentra <strong>LIBERADO</strong>. Analista: ZORKA \u00b7 Liberado por: NEREYDA HUACHUA FLORES.</div><div class="sig"><div class="sig-box"><div class="sig-lbl">Analista de Microbiologia</div><div class="sig-line"></div><div class="sig-name">Nereyda Huachua Flores</div></div></div></div>';
  setTimeout(function(){ drawMicroBar(m); drawMicroTrend(); }, 40);
}

function renderFisico() {
  const p = PRODUCTS[activeProduct];
  const d = DATA[activeProduct][activeMonth];
  const mo = MONTHS[activeMonth];
  const f = d.fisico;
  const fields = p.fisicoFields;
  const ths = fields.map(function(k){ return '<th>' + FIELD_LABELS[k] + '</th>'; }).join('');
  const tds = fields.map(function(k){ return '<td><input type="number" step="0.01" data-f="' + k + '" value="' + f[k] + '"></td>'; }).join('');
  const content = document.getElementById('content');
  content.innerHTML = '<div class="card"><div class="doc-hdr"><div><div class="doc-company">EXPORTADORA ROMEX S.A.</div><div class="doc-plant">Planta de Cacao Chincha \u00b7 Laboratorio Fisicoquimico</div></div><div class="doc-meta">Codigo: I-EVUP-R-309<br>Edicion: 19<br>Emision: 08-01-2026</div></div><div class="doc-title">Analisis Fisicoquimico \u00b7 ' + p.name + ' \u00b7 ' + mo.n + ' ' + mo.y + '</div><div class="info-grid"><div class="info-cell"><div class="info-lbl">Producto</div><div class="info-val">' + p.name + '</div></div><div class="info-cell"><div class="info-lbl">Codigo / Lote</div><div class="info-val">' + p.lote + '</div></div><div class="info-cell"><div class="info-lbl">Fecha de Analisis</div><div class="info-val" contenteditable="true">' + d.fa + '</div></div><div class="info-cell"><div class="info-lbl">Estado</div><div class="info-val"><span class="pill pill-ok">CONFORME</span></div></div></div></div><div class="card"><div class="card-head">Resultados Fisicoquimicos</div><div class="table-wrap"><table><thead><tr>' + ths + '</tr></thead><tbody><tr>' + tds + '</tr></tbody></table></div></div><div class="card"><div class="card-head">Grafico Fisicoquimico \u00b7 ' + mo.n + '</div><div class="chart-box"><canvas id="chartMain"></canvas></div></div><div class="card"><div class="card-head">Tendencia de % Humedad (todos los meses)</div><div class="chart-box sm"><canvas id="chartTrend"></canvas></div></div><div class="card"><div class="card-head">Interpretacion</div><div class="interp" contenteditable="true">Los parametros fisicoquimicos de <strong>' + p.name + '</strong> (Lote ' + p.lote + ') en <strong>' + mo.n + ' ' + mo.y + '</strong> se encuentran dentro de las especificaciones de calidad. La humedad y demas indicadores no presentan desviaciones significativas respecto al patron de referencia de mayo. El producto se declara <strong>CONFORME</strong>.</div><div class="sig"><div class="sig-box"><div class="sig-lbl">Analista de Laboratorio</div><div class="sig-line"></div><div class="sig-name">Nereyda Huachua Flores</div></div></div></div>';
  setTimeout(function(){ drawFisicoBar(f, fields); drawHumedadTrend(); }, 40);
}

function destroyCharts() {
  if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
  if (window._trendChart) { window._trendChart.destroy(); window._trendChart = null; }
}

function drawMicroBar(m) {
  destroyCharts();
  const keys = ['rtamv','mohos','coliformes','ecoli','enterob','levaduras','saureus'];
  const cv = document.getElementById('chartMain');
  if (!cv) return;
  chartInstance = new Chart(cv.getContext('2d'), {
    type: 'bar',
    data: { labels: keys.map(function(k){ return FIELD_LABELS[k].replace(' ufc/gr',''); }), datasets: [{ data: keys.map(function(k){ return m[k]; }), backgroundColor: keys.map(function(k){ return CHART_COLORS[k]; }), borderRadius: { topLeft: 4, topRight: 4 }, borderSkipped: false, barPercentage: 0.55 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, datalabels: { color: '#ccc', anchor: 'end', align: 'end', offset: 2, font: { family: 'Inter', size: 11, weight: '700' }, formatter: function(v){ return v === 0 ? '0' : v.toLocaleString(); } } }, scales: { x: { grid: { display: false }, ticks: { color: '#777', font: { size: 9, weight: '600' } } }, y: { grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: '#555', font: { size: 9 } }, beginAtZero: true } } }
  });
}

function drawMicroTrend() {
  const cv = document.getElementById('chartTrend');
  if (!cv) return;
  const labs = MONTHS.map(function(m){ return m.n; });
  const rtamv = DATA[activeProduct].map(function(d){ return d.micro.rtamv; });
  const mohos = DATA[activeProduct].map(function(d){ return d.micro.mohos; });
  window._trendChart = new Chart(cv.getContext('2d'), {
    type: 'line',
    data: { labels: labs, datasets: [
      { label: 'RTAMV', data: rtamv, borderColor: 'rgba(70,140,255,1)', backgroundColor: 'rgba(70,140,255,.08)', borderWidth: 2.5, tension: .35, fill: true, pointRadius: 4, yAxisID: 'y' },
      { label: 'Mohos', data: mohos, borderColor: 'rgba(255,160,30,1)', backgroundColor: 'rgba(255,160,30,.08)', borderWidth: 2.5, tension: .35, fill: true, pointRadius: 4, yAxisID: 'y1' }
    ] },
    options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { position: 'bottom', labels: { color: '#888', font: { size: 10 }, usePointStyle: true } }, datalabels: { display: false } }, scales: { x: { ticks: { color: '#555', font: { size: 8 } }, grid: { color: 'rgba(255,255,255,.03)' } }, y: { position: 'left', ticks: { color: 'rgba(70,140,255,.7)', font: { size: 8 } }, grid: { color: 'rgba(255,255,255,.04)' }, title: { display: true, text: 'RTAMV', color: 'rgba(70,140,255,.6)', font: { size: 9 } } }, y1: { position: 'right', ticks: { color: 'rgba(255,160,30,.7)', font: { size: 8 } }, grid: { drawOnChartArea: false }, title: { display: true, text: 'Mohos', color: 'rgba(255,160,30,.6)', font: { size: 9 } }, beginAtZero: true } } }
  });
}

function drawFisicoBar(f, fields) {
  destroyCharts();
  const cv = document.getElementById('chartMain');
  if (!cv) return;
  chartInstance = new Chart(cv.getContext('2d'), {
    type: 'bar',
    data: { labels: fields.map(function(k){ return FIELD_LABELS[k]; }), datasets: [{ data: fields.map(function(k){ return f[k]; }), backgroundColor: fields.map(function(k){ return CHART_COLORS[k] || 'rgba(200,149,108,.85)'; }), borderRadius: { topLeft: 4, topRight: 4 }, borderSkipped: false, barPercentage: 0.5 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, datalabels: { color: '#ccc', anchor: 'end', align: 'end', offset: 2, font: { family: 'Inter', size: 12, weight: '700' }, formatter: function(v){ return typeof v === 'number' ? v.toFixed(2) : v; } } }, scales: { x: { grid: { display: false }, ticks: { color: '#777', font: { size: 10, weight: '600' } } }, y: { grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: '#555', font: { size: 9 } }, beginAtZero: true } } }
  });
}

function drawHumedadTrend() {
  const cv = document.getElementById('chartTrend');
  if (!cv) return;
  const labs = MONTHS.map(function(m){ return m.n; });
  const hum = DATA[activeProduct].map(function(d){ return d.fisico.humedad || 0; });
  window._trendChart = new Chart(cv.getContext('2d'), {
    type: 'line',
    data: { labels: labs, datasets: [{ label: '% Humedad', data: hum, borderColor: 'rgba(200,149,108,1)', backgroundColor: 'rgba(200,149,108,.12)', borderWidth: 2.5, tension: .3, fill: true, pointRadius: 5, pointBackgroundColor: '#c8956c' }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, datalabels: { color: '#c8956c', anchor: 'end', align: 'top', offset: 4, font: { size: 10, weight: '700' }, formatter: function(v){ return v.toFixed(2) + '%'; } } }, scales: { x: { ticks: { color: '#555', font: { size: 8 } }, grid: { color: 'rgba(255,255,255,.03)' } }, y: { ticks: { color: '#c8956c', font: { size: 9 }, callback: function(v){ return v.toFixed(1) + '%'; } }, grid: { color: 'rgba(255,255,255,.04)' }, title: { display: true, text: '% Humedad', color: '#c8956c', font: { size: 9 } } } } }
  });
}

document.addEventListener('click', function(e) {
  const pb = e.target.closest('.prod-btn');
  if (pb) { activeProduct = pb.dataset.p; activeMonth = 0; render(); return; }
  const mt = e.target.closest('.month-tab');
  if (mt) { activeMonth = parseInt(mt.dataset.m); render(); return; }
  const mb = e.target.closest('.mode-btn');
  if (mb) { activeMode = mb.dataset.mode; render(); return; }
});

document.addEventListener('input', function(e) {
  const el = e.target;
  const f = el.dataset.f;
  if (!f) return;
  const d = DATA[activeProduct][activeMonth];
  if (activeMode === 'micro' && d.micro[f] !== undefined) {
    d.micro[f] = parseFloat(el.value) || 0;
    drawMicroBar(d.micro);
  } else if (activeMode === 'fisico' && d.fisico[f] !== undefined) {
    d.fisico[f] = parseFloat(el.value) || 0;
    drawFisicoBar(d.fisico, PRODUCTS[activeProduct].fisicoFields);
  }
});

function saveData() {
  localStorage.setItem('romex_qc_v2', JSON.stringify(DATA));
  toast('Datos guardados');
}

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(function(){ t.classList.remove('show'); }, 2200);
}

render();
