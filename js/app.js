/* ROMEX QC — datos desde data/products.json + IndexedDB */
Chart.register(ChartDataLabels);

const DB_NAME = 'romex_qc_db';
const DB_STORE = 'results';
const DB_VER = 1;

const FIELD_LABELS = {
  rtamv:'RTAMV', mohos:'Mohos', coliformes:'Coliformes', ecoli:'E.Coli',
  enterob:'Enterob.', levaduras:'Levaduras', saureus:'S.Aureus',
  humedad:'% Humedad', ph:'pH', ceniza:'% Ceniza', grasa:'% Grasa',
  fineza:'% Fineza', acidez:'% Acidez'
};
const CHART_COLORS = {
  rtamv:'rgba(70,140,255,.85)', mohos:'rgba(255,160,30,.85)',
  coliformes:'rgba(50,205,100,.85)', ecoli:'rgba(50,205,100,.7)',
  enterob:'rgba(180,100,255,.85)', levaduras:'rgba(255,100,150,.85)',
  saureus:'rgba(255,80,80,.85)',
  humedad:'rgba(200,149,108,.9)', ph:'rgba(70,140,255,.85)',
  ceniza:'rgba(160,160,160,.85)', grasa:'rgba(255,180,50,.85)',
  fineza:'rgba(50,205,100,.85)', acidez:'rgba(255,100,100,.85)'
};

let META = {}, MONTHS = [], PRODUCTS = {};
let DATA = {};
let activeProduct = 'torta_alcalina';
let activeMonth = 0;
let activeMode = 'micro';
let chartInstance = null;

function openDB() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, DB_VER);
    r.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE);
    };
    r.onsuccess = e => res(e.target.result);
    r.onerror = e => rej(e.target.error);
  });
}

async function dbGet(key) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(DB_STORE, 'readonly');
    const req = tx.objectStore(DB_STORE).get(key);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

async function dbSet(key, val) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).put(val, key);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

function vary(base, monthIdx, isMicro) {
  const drift = monthIdx * (isMicro ? 0.015 : 0.008);
  const amp = monthIdx >= 3 ? 0.06 : 0.025;
  const noise = Math.sin(monthIdx * 1.7 + base * 0.01) * amp;
  let v = base * (1 + drift + noise);
  if (base === 0) v = (monthIdx >= 4 && Math.sin(monthIdx * 3.1) > 0.7) ? 10 : 0;
  return isMicro ? Math.max(0, Math.round(v / 10) * 10) : Math.round(v * 100) / 100;
}

function buildMonthData(prodKey, monthIdx) {
  const p = PRODUCTS[prodKey];
  const micro = {}, fisico = {};
  Object.keys(p.microBase).forEach(k => { micro[k] = vary(p.microBase[k], monthIdx, true); });
  Object.keys(p.fisicoBase).forEach(k => { fisico[k] = vary(p.fisicoBase[k], monthIdx, false); });
  const mo = MONTHS[monthIdx];
  return { micro, fisico, fa: mo.y + '/' + mo.m + '/' + (10 + monthIdx % 5), fp: mo.y + '/5/12' };
}

function generateAll() {
  const data = {};
  Object.keys(PRODUCTS).forEach(pk => { data[pk] = MONTHS.map((_, i) => buildMonthData(pk, i)); });
  return data;
}

async function init() {
  document.getElementById('content').innerHTML = '<div class="loading">Cargando base de datos…</div>';
  try {
    const res = await fetch('data/products.json');
    if (!res.ok) throw new Error('No se pudo cargar products.json');
    const seed = await res.json();
    META = seed.meta; MONTHS = seed.months; PRODUCTS = seed.products;
    const saved = await dbGet('results');
    if (saved && saved.version === 2) DATA = saved.data;
    else { DATA = generateAll(); await dbSet('results', { version: 2, data: DATA }); }
    render();
  } catch (err) {
    console.error(err);
    document.getElementById('content').innerHTML =
      '<div class="loading">Error al cargar datos. Usa un servidor local (no file://).<br><small>' + err.message + '</small></div>';
  }
}

function render() {
  renderProductNav(); renderMonthTabs();
  document.getElementById('productTitle').textContent = PRODUCTS[activeProduct].name;
  document.getElementById('loteBadge').textContent = 'Lote ' + PRODUCTS[activeProduct].lote;
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === activeMode));
  if (activeMode === 'micro') renderMicro(); else renderFisico();
}

function renderProductNav() {
  document.getElementById('productNav').innerHTML = Object.keys(PRODUCTS).map(pk => {
    const p = PRODUCTS[pk];
    return '<button class="prod-btn' + (pk === activeProduct ? ' active' : '') + '" data-p="' + pk + '">' +
      p.name + '<span class="lote">' + p.lote + '</span></button>';
  }).join('');
}

function renderMonthTabs() {
  document.getElementById('monthTabs').innerHTML = MONTHS.map((m, i) =>
    '<button class="month-tab' + (i === activeMonth ? ' active' : '') + '" data-m="' + i + '">' + m.n + '</button>'
  ).join('');
}

function renderMicro() {
  const p = PRODUCTS[activeProduct], d = DATA[activeProduct][activeMonth], mo = MONTHS[activeMonth], m = d.micro;
  document.getElementById('content').innerHTML =
    '<div class="card full"><div class="doc-hdr"><div><div class="doc-company">' + META.company + '</div><div class="doc-plant">' + META.plant + ' \u00b7 Microbiolog\u00eda</div></div><div class="doc-meta">C\u00f3digo: ' + META.code + '<br>Edici\u00f3n: ' + META.edition + '<br>' + META.emission + '</div></div>' +
    '<div class="doc-title">An\u00e1lisis Microbiol\u00f3gico \u00b7 ' + p.name + ' \u00b7 ' + mo.n + ' ' + mo.y + '</div>' +
    '<div class="info-grid"><div class="info-cell"><div class="info-lbl">Producto</div><div class="info-val">' + p.name + '</div></div>' +
    '<div class="info-cell"><div class="info-lbl">Lote</div><div class="info-val">' + p.lote + '</div></div>' +
    '<div class="info-cell"><div class="info-lbl">Fecha an\u00e1lisis</div><div class="info-val" contenteditable="true">' + d.fa + '</div></div>' +
    '<div class="info-cell"><div class="info-lbl">Estado</div><div class="info-val"><span class="pill pill-ok">LIBERADO</span></div></div></div></div>' +
    '<div class="card"><div class="card-head">Resultados</div><div class="table-wrap"><table><thead><tr><th>RTAMV</th><th>Mohos</th><th>Colif.</th><th>E.Coli</th><th>Enterob.</th><th>Levad.</th><th>S.Aur.</th></tr></thead><tbody><tr>' +
    ['rtamv','mohos','coliformes','ecoli','enterob','levaduras','saureus'].map(k =>
      '<td><input type="number" data-f="' + k + '" value="' + m[k] + '"></td>'
    ).join('') + '</tr></tbody></table></div></div>' +
    '<div class="card"><div class="card-head">Gr\u00e1fico \u00b7 ' + mo.n + '</div><div class="chart-box"><canvas id="chartMain"></canvas></div></div>' +
    '<div class="card full"><div class="card-head">Tendencia acumulada</div><div class="chart-box sm"><canvas id="chartTrend"></canvas></div></div>' +
    '<div class="card full"><div class="card-head">Interpretaci\u00f3n</div><div class="interp" contenteditable="true">Resultados de <strong>' + p.name + '</strong> (Lote ' + p.lote + ') \u2014 <strong>' + mo.n + ' ' + mo.y + '</strong>: dentro de l\u00edmites. Pat\u00f3genos <10 ufc/gr. <strong>LIBERADO</strong>. Analista: ZORKA \u00b7 Liberado: ' + META.analyst + '.</div>' +
    '<div class="sig"><div class="sig-box"><div class="sig-lbl">Analista</div><div class="sig-line"></div><div class="sig-name">' + META.analyst + '</div></div></div></div>';
  setTimeout(function(){ drawMicroBar(m); drawMicroTrend(); }, 30);
}

function renderFisico() {
  const p = PRODUCTS[activeProduct], d = DATA[activeProduct][activeMonth], mo = MONTHS[activeMonth], f = d.fisico, fields = p.fisicoFields;
  const ths = fields.map(function(k){ return '<th>' + FIELD_LABELS[k] + '</th>'; }).join('');
  const tds = fields.map(function(k){ return '<td><input type="number" step="0.01" data-f="' + k + '" value="' + f[k] + '"></td>'; }).join('');
  document.getElementById('content').innerHTML =
    '<div class="card full"><div class="doc-hdr"><div><div class="doc-company">' + META.company + '</div><div class="doc-plant">' + META.plant + ' \u00b7 F\u00edsicoqu\u00edmico</div></div><div class="doc-meta">C\u00f3digo: ' + META.code + '<br>Edici\u00f3n: ' + META.edition + '<br>' + META.emission + '</div></div>' +
    '<div class="doc-title">An\u00e1lisis F\u00edsicoqu\u00edmico \u00b7 ' + p.name + ' \u00b7 ' + mo.n + ' ' + mo.y + '</div>' +
    '<div class="info-grid"><div class="info-cell"><div class="info-lbl">Producto</div><div class="info-val">' + p.name + '</div></div>' +
    '<div class="info-cell"><div class="info-lbl">Lote</div><div class="info-val">' + p.lote + '</div></div>' +
    '<div class="info-cell"><div class="info-lbl">Fecha an\u00e1lisis</div><div class="info-val" contenteditable="true">' + d.fa + '</div></div>' +
    '<div class="info-cell"><div class="info-lbl">Estado</div><div class="info-val"><span class="pill pill-ok">CONFORME</span></div></div></div></div>' +
    '<div class="card"><div class="card-head">Resultados</div><div class="table-wrap"><table><thead><tr>' + ths + '</tr></thead><tbody><tr>' + tds + '</tr></tbody></table></div></div>' +
    '<div class="card"><div class="card-head">Gr\u00e1fico \u00b7 ' + mo.n + '</div><div class="chart-box"><canvas id="chartMain"></canvas></div></div>' +
    '<div class="card full"><div class="card-head">Tendencia % Humedad</div><div class="chart-box sm"><canvas id="chartTrend"></canvas></div></div>' +
    '<div class="card full"><div class="card-head">Interpretaci\u00f3n</div><div class="interp" contenteditable="true">Par\u00e1metros f\u00edsicoqu\u00edmicos de <strong>' + p.name + '</strong> (Lote ' + p.lote + ') en <strong>' + mo.n + ' ' + mo.y + '</strong> dentro de especificaci\u00f3n. <strong>CONFORME</strong>.</div>' +
    '<div class="sig"><div class="sig-box"><div class="sig-lbl">Analista</div><div class="sig-line"></div><div class="sig-name">' + META.analyst + '</div></div></div></div>';
  setTimeout(function(){ drawFisicoBar(f, fields); drawHumedadTrend(); }, 30);
}

function destroyCharts() {
  if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
  if (window._trendChart) { window._trendChart.destroy(); window._trendChart = null; }
}

function drawMicroBar(m) {
  destroyCharts();
  var keys = ['rtamv','mohos','coliformes','ecoli','enterob','levaduras','saureus'];
  var cv = document.getElementById('chartMain'); if (!cv) return;
  chartInstance = new Chart(cv.getContext('2d'), {
    type: 'bar',
    data: { labels: keys.map(function(k){ return FIELD_LABELS[k]; }), datasets: [{ data: keys.map(function(k){ return m[k]; }), backgroundColor: keys.map(function(k){ return CHART_COLORS[k]; }), borderRadius: { topLeft: 3, topRight: 3 }, borderSkipped: false, barPercentage: 0.55 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, datalabels: { color: '#bbb', anchor: 'end', align: 'end', offset: 1, font: { size: 10, weight: '700' }, formatter: function(v){ return v === 0 ? '0' : v.toLocaleString(); } } }, scales: { x: { grid: { display: false }, ticks: { color: '#666', font: { size: 8, weight: '600' } } }, y: { grid: { color: 'rgba(255,255,255,.03)' }, ticks: { color: '#555', font: { size: 8 } }, beginAtZero: true } } }
  });
}

function drawMicroTrend() {
  var cv = document.getElementById('chartTrend'); if (!cv) return;
  window._trendChart = new Chart(cv.getContext('2d'), {
    type: 'line',
    data: { labels: MONTHS.map(function(m){ return m.n; }), datasets: [
      { label: 'RTAMV', data: DATA[activeProduct].map(function(d){ return d.micro.rtamv; }), borderColor: 'rgba(70,140,255,1)', backgroundColor: 'rgba(70,140,255,.08)', borderWidth: 2, tension: .35, fill: true, pointRadius: 3, yAxisID: 'y' },
      { label: 'Mohos', data: DATA[activeProduct].map(function(d){ return d.micro.mohos; }), borderColor: 'rgba(255,160,30,1)', backgroundColor: 'rgba(255,160,30,.08)', borderWidth: 2, tension: .35, fill: true, pointRadius: 3, yAxisID: 'y1' }
    ] },
    options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { position: 'bottom', labels: { color: '#777', font: { size: 9 }, usePointStyle: true, boxWidth: 8 } }, datalabels: { display: false } }, scales: { x: { ticks: { color: '#555', font: { size: 7 } }, grid: { color: 'rgba(255,255,255,.02)' } }, y: { position: 'left', ticks: { color: 'rgba(70,140,255,.6)', font: { size: 7 } }, grid: { color: 'rgba(255,255,255,.03)' } }, y1: { position: 'right', ticks: { color: 'rgba(255,160,30,.6)', font: { size: 7 } }, grid: { drawOnChartArea: false }, beginAtZero: true } } }
  });
}

function drawFisicoBar(f, fields) {
  destroyCharts();
  var cv = document.getElementById('chartMain'); if (!cv) return;
  chartInstance = new Chart(cv.getContext('2d'), {
    type: 'bar',
    data: { labels: fields.map(function(k){ return FIELD_LABELS[k]; }), datasets: [{ data: fields.map(function(k){ return f[k]; }), backgroundColor: fields.map(function(k){ return CHART_COLORS[k] || 'rgba(200,149,108,.85)'; }), borderRadius: { topLeft: 3, topRight: 3 }, borderSkipped: false, barPercentage: 0.5 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, datalabels: { color: '#bbb', anchor: 'end', align: 'end', offset: 1, font: { size: 11, weight: '700' }, formatter: function(v){ return typeof v === 'number' ? v.toFixed(2) : v; } } }, scales: { x: { grid: { display: false }, ticks: { color: '#666', font: { size: 9, weight: '600' } } }, y: { grid: { color: 'rgba(255,255,255,.03)' }, ticks: { color: '#555', font: { size: 8 } }, beginAtZero: true } } }
  });
}

function drawHumedadTrend() {
  var cv = document.getElementById('chartTrend'); if (!cv) return;
  window._trendChart = new Chart(cv.getContext('2d'), {
    type: 'line',
    data: { labels: MONTHS.map(function(m){ return m.n; }), datasets: [{ label: '% Humedad', data: DATA[activeProduct].map(function(d){ return d.fisico.humedad || 0; }), borderColor: 'rgba(200,149,108,1)', backgroundColor: 'rgba(200,149,108,.1)', borderWidth: 2, tension: .3, fill: true, pointRadius: 4, pointBackgroundColor: '#c8956c' }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, datalabels: { color: '#c8956c', anchor: 'end', align: 'top', offset: 2, font: { size: 9, weight: '700' }, formatter: function(v){ return v.toFixed(2) + '%'; } } }, scales: { x: { ticks: { color: '#555', font: { size: 7 } }, grid: { color: 'rgba(255,255,255,.02)' } }, y: { ticks: { color: '#c8956c', font: { size: 8 }, callback: function(v){ return v.toFixed(1) + '%'; } }, grid: { color: 'rgba(255,255,255,.03)' } } } }
  });
}

document.addEventListener('click', function(e) {
  var pb = e.target.closest('.prod-btn');
  if (pb) { activeProduct = pb.dataset.p; activeMonth = 0; render(); return; }
  var mt = e.target.closest('.month-tab');
  if (mt) { activeMonth = +mt.dataset.m; render(); return; }
  var mb = e.target.closest('.mode-btn');
  if (mb) { activeMode = mb.dataset.mode; render(); return; }
});

document.addEventListener('input', function(e) {
  var f = e.target.dataset.f; if (!f) return;
  var d = DATA[activeProduct][activeMonth];
  if (activeMode === 'micro' && d.micro[f] !== undefined) {
    d.micro[f] = parseFloat(e.target.value) || 0; drawMicroBar(d.micro);
  } else if (activeMode === 'fisico' && d.fisico[f] !== undefined) {
    d.fisico[f] = parseFloat(e.target.value) || 0; drawFisicoBar(d.fisico, PRODUCTS[activeProduct].fisicoFields);
  }
});

async function saveData() {
  await dbSet('results', { version: 2, data: DATA });
  toast('Guardado en base de datos local');
}

function toast(msg) {
  var t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(function(){ t.classList.remove('show'); }, 2000);
}

init();
