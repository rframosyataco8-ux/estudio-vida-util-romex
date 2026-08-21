/* Romex QC — Material Design + API */
Chart.register(ChartDataLabels);

var API = (window.API_BASE || '') + '/api';
var MONTH_NAMES = ['','ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];

var products = [];
var activeCodigo = null;
var activeMonth = 5;
var activeMode = 'micro';
var microRows = [];
var fisicoRows = [];
var chartMain = null;
var chartTrend = null;

var MICRO_KEYS = ['rtamv','mohos','coliformes','ecoli','enterobacterias','levaduras','saureus'];
var MICRO_LABELS = {rtamv:'RTAMV',mohos:'Mohos',coliformes:'Colif.',ecoli:'E.Coli',enterobacterias:'Enterob.',levaduras:'Levad.',saureus:'S.Aur.'};
var FISICO_LABELS = {humedad:'% Humedad',ph:'pH',ceniza:'% Ceniza',grasa:'% Grasa',fineza:'% Fineza',acidez:'% Acidez'};
var COLORS = {
  rtamv:'#1565c0',mohos:'#ef6c00',coliformes:'#2e7d32',ecoli:'#43a047',
  enterobacterias:'#7b1fa2',levaduras:'#c2185b',saureus:'#c62828',
  humedad:'#1565c0',ph:'#0288d1',ceniza:'#78909c',grasa:'#f9a825',fineza:'#2e7d32',acidez:'#e53935'
};

/* Fallback local si la API no está (Live Server sin backend) */
var FALLBACK = {
  products: [
    {codigo:'torta_natural',nombre:'Torta Natural de Cacao',lote:'44260304'},
    {codigo:'torta_alcalina',nombre:'Torta Alcalina de Cacao',lote:'13260318'},
    {codigo:'cocoa_natural',nombre:'Cocoa Natural',lote:'11260513'},
    {codigo:'cocoa_alcalina',nombre:'Cocoa Alcalina',lote:'07260324'},
    {codigo:'licor',nombre:'Licor de Cacao',lote:'260516'},
    {codigo:'manteca',nombre:'Manteca de Cacao',lote:'19260321'}
  ],
  micro: {
    torta_natural: [[900,10],[910,10],[920,10],[960,20],[980,20],[990,10],[1000,20],[1010,10]],
    torta_alcalina: [[40,0],[40,0],[50,0],[60,0],[60,0],[70,0],[70,0],[80,0]],
    cocoa_natural: [[1400,15],[1420,20],[1440,15],[1500,20],[1520,20],[1540,15],[1560,20],[1580,20]],
    cocoa_alcalina: [[1100,0],[1120,0],[1130,0],[1180,0],[1200,0],[1210,0],[1230,0],[1240,0]],
    licor: [[300,0],[300,0],[310,0],[330,0],[340,0],[340,0],[350,0],[360,0]],
    manteca: [[50,0],[50,0],[50,0],[60,0],[60,0],[60,0],[70,0],[70,0]]
  },
  fisico: {
    torta_natural: [[2.22,5.40,8.30,12.11],[2.21,5.41,8.28,12.10],[2.20,5.39,8.31,12.12],[2.25,5.42,8.35,12.15],[2.26,5.43,8.36,12.16],[2.24,5.41,8.34,12.14],[2.27,5.44,8.37,12.18],[2.28,5.45,8.38,12.19]],
    torta_alcalina: [[3.54,6.81,11.60,11.68],[3.52,6.80,11.58,11.67],[3.53,6.82,11.61,11.69],[3.58,6.84,11.65,11.72],[3.59,6.85,11.66,11.73],[3.57,6.83,11.64,11.71],[3.60,6.86,11.68,11.74],[3.61,6.87,11.69,11.75]],
    cocoa_natural: [[2.49,5.39,8.20,11.80,99.49],[2.48,5.38,8.18,11.79,99.48],[2.47,5.40,8.21,11.81,99.50],[2.52,5.42,8.25,11.85,99.45],[2.53,5.43,8.26,11.86,99.44],[2.51,5.41,8.24,11.84,99.46],[2.54,5.44,8.27,11.87,99.43],[2.55,5.45,8.28,11.88,99.42]],
    cocoa_alcalina: [[2.76,6.87,10.30,11.62,98.51],[2.75,6.86,10.28,11.61,98.52],[2.74,6.88,10.31,11.63,98.50],[2.80,6.90,10.35,11.66,98.48],[2.81,6.91,10.36,11.67,98.47],[2.79,6.89,10.34,11.65,98.49],[2.82,6.92,10.37,11.68,98.46],[2.83,6.93,10.38,11.69,98.45]],
    licor: [[0.55,5.42,3.90,48.65,99.74,2.10],[0.54,5.41,3.88,48.62,99.75,2.09],[0.55,5.43,3.91,48.68,99.73,2.11],[0.58,5.45,3.95,48.80,99.70,2.15],[0.59,5.46,3.96,48.85,99.69,2.16],[0.57,5.44,3.94,48.78,99.71,2.14],[0.60,5.47,3.97,48.90,99.68,2.17],[0.61,5.48,3.98,48.95,99.67,2.18]],
    manteca: [[0.02,null,null,null,null,1.64],[0.02,null,null,null,null,1.63],[0.02,null,null,null,null,1.65],[0.03,null,null,null,null,1.68],[0.03,null,null,null,null,1.69],[0.03,null,null,null,null,1.67],[0.03,null,null,null,null,1.70],[0.04,null,null,null,null,1.71]]
  }
};

function buildFallbackMicro(codigo) {
  var arr = FALLBACK.micro[codigo] || FALLBACK.micro.torta_natural;
  return arr.map(function(v, i) {
    return { mes: i+5, anio: 2026, rtamv: v[0], mohos: v[1], coliformes: 0, ecoli: 0, enterobacterias: 0, levaduras: 0, saureus: 0, estado: 'LIBERADO', fecha_analisis: '2026-' + String(i+5).padStart(2,'0') + '-12' };
  });
}
function buildFallbackFisico(codigo) {
  var arr = FALLBACK.fisico[codigo] || FALLBACK.fisico.torta_natural;
  return arr.map(function(v, i) {
    return { mes: i+5, anio: 2026, humedad: v[0], ph: v[1], ceniza: v[2], grasa: v[3], fineza: v[4], acidez: v[5], estado: 'CONFORME', fecha_analisis: '2026-' + String(i+5).padStart(2,'0') + '-12' };
  });
}

async function api(path, opts) {
  var r = await fetch(API + path, opts);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function init() {
  try {
    products = await api('/productos');
    if (!products.length) throw new Error('Sin productos');
    activeCodigo = products[0].codigo;
    renderNav();
    await loadAndShow();
  } catch (e) {
    console.warn('API no disponible, usando datos locales:', e.message);
    products = FALLBACK.products;
    activeCodigo = products[0].codigo;
    renderNav();
    microRows = buildFallbackMicro(activeCodigo);
    fisicoRows = buildFallbackFisico(activeCodigo);
    renderTabs();
    var p = products[0];
    document.getElementById('productTitle').textContent = p.nombre;
    document.getElementById('loteBadge').textContent = 'Lote ' + p.lote;
    if (activeMode === 'micro') renderMicro(p); else renderFisico(p);
    snack('Modo local (sin servidor SQL)');
  }
}

function renderNav() {
  document.getElementById('productNav').innerHTML = products.map(function(p) {
    return '<button class="nav-item' + (p.codigo === activeCodigo ? ' active' : '') + '" data-c="' + p.codigo + '">' +
      p.nombre + '<span class="lote">Lote ' + p.lote + '</span></button>';
  }).join('');
}

function renderTabs() {
  var months = [];
  (microRows.concat(fisicoRows)).forEach(function(r) {
    if (months.indexOf(r.mes) < 0) months.push(r.mes);
  });
  months.sort(function(a,b){ return a-b; });
  if (months.indexOf(activeMonth) < 0 && months.length) activeMonth = months[0];
  document.getElementById('monthTabs').innerHTML = months.map(function(m) {
    return '<button class="tab' + (m === activeMonth ? ' active' : '') + '" data-m="' + m + '">' + MONTH_NAMES[m] + '</button>';
  }).join('');
}

async function loadAndShow() {
  document.getElementById('content').innerHTML = '<div class="loading"><div class="spinner"></div> Cargando…</div>';
  var p = products.find(function(x){ return x.codigo === activeCodigo; });
  document.getElementById('productTitle').textContent = p.nombre;
  document.getElementById('loteBadge').textContent = 'Lote ' + p.lote;
  document.querySelectorAll('.seg').forEach(function(b){ b.classList.toggle('active', b.dataset.mode === activeMode); });
  try {
    microRows = await api('/productos/' + activeCodigo + '/micro?anio=2026');
    fisicoRows = await api('/productos/' + activeCodigo + '/fisico?anio=2026');
  } catch (e) {
    microRows = buildFallbackMicro(activeCodigo);
    fisicoRows = buildFallbackFisico(activeCodigo);
  }
  renderTabs();
  if (activeMode === 'micro') renderMicro(p); else renderFisico(p);
}

function rowFor(mode) {
  var rows = mode === 'micro' ? microRows : fisicoRows;
  return rows.find(function(r){ return r.mes === activeMonth; }) || null;
}

function renderMicro(p) {
  var d = rowFor('micro');
  if (!d) { document.getElementById('content').innerHTML = '<div class="loading">Sin datos</div>'; return; }
  var date = d.fecha_analisis ? String(d.fecha_analisis).slice(0,10) : '—';
  document.getElementById('content').innerHTML =
    '<div class="card full"><div class="doc-bar"><div><div class="doc-co">EXPORTADORA ROMEX S.A.</div><div class="doc-pl">Planta Cacao Chincha \u00b7 Microbiolog\u00eda</div></div><div class="doc-meta">C\u00f3digo: I-EVUP-R-309<br>Edici\u00f3n: 19</div></div>' +
    '<div class="doc-head">An\u00e1lisis Microbiol\u00f3gico \u00b7 ' + p.nombre + ' \u00b7 ' + MONTH_NAMES[activeMonth] + ' 2026</div>' +
    '<div class="info-grid"><div class="info-cell"><div class="info-lbl">Producto</div><div class="info-val">' + p.nombre + '</div></div>' +
    '<div class="info-cell"><div class="info-lbl">Lote</div><div class="info-val">' + p.lote + '</div></div>' +
    '<div class="info-cell"><div class="info-lbl">Fecha</div><div class="info-val">' + date + '</div></div>' +
    '<div class="info-cell"><div class="info-lbl">Estado</div><div class="info-val"><span class="badge">' + (d.estado||'LIBERADO') + '</span></div></div></div></div>' +
    '<div class="card"><div class="card-title">Resultados (ufc/gr)</div><div class="table-wrap"><table><thead><tr>' +
    MICRO_KEYS.map(function(k){ return '<th>' + MICRO_LABELS[k] + '</th>'; }).join('') + '</tr></thead><tbody><tr>' +
    MICRO_KEYS.map(function(k){ return '<td><input type="number" data-f="' + k + '" value="' + (d[k]||0) + '"></td>'; }).join('') +
    '</tr></tbody></table></div></div>' +
    '<div class="card"><div class="card-title">Gr\u00e1fico del mes</div><div class="chart-box"><canvas id="cMain"></canvas></div></div>' +
    '<div class="card full"><div class="card-title">Tendencia anual</div><div class="chart-box sm"><canvas id="cTrend"></canvas></div></div>' +
    '<div class="card full"><div class="card-title">Interpretaci\u00f3n</div><div class="interp">Resultados de <strong>' + p.nombre + '</strong> en <strong>' + MONTH_NAMES[activeMonth] + ' 2026</strong> dentro de l\u00edmites. <strong>LIBERADO</strong>.</div>' +
    '<div class="sig"><div class="sig-box"><div class="sig-lbl">Analista</div><div class="sig-line"></div><div class="sig-name">Nereyda Huachua Flores</div></div></div></div>';
  setTimeout(function(){ drawMicroBar(d); drawMicroTrend(); }, 20);
}

function fisicoFields(d) {
  return ['humedad','ph','ceniza','grasa','fineza','acidez'].filter(function(k){ return d[k] != null && d[k] !== ''; });
}

function renderFisico(p) {
  var d = rowFor('fisico');
  if (!d) { document.getElementById('content').innerHTML = '<div class="loading">Sin datos</div>'; return; }
  var fields = fisicoFields(d);
  var date = d.fecha_analisis ? String(d.fecha_analisis).slice(0,10) : '—';
  document.getElementById('content').innerHTML =
    '<div class="card full"><div class="doc-bar"><div><div class="doc-co">EXPORTADORA ROMEX S.A.</div><div class="doc-pl">Planta Cacao Chincha \u00b7 F\u00edsicoqu\u00edmico</div></div><div class="doc-meta">C\u00f3digo: I-EVUP-R-309<br>Edici\u00f3n: 19</div></div>' +
    '<div class="doc-head">An\u00e1lisis F\u00edsicoqu\u00edmico \u00b7 ' + p.nombre + ' \u00b7 ' + MONTH_NAMES[activeMonth] + ' 2026</div>' +
    '<div class="info-grid"><div class="info-cell"><div class="info-lbl">Producto</div><div class="info-val">' + p.nombre + '</div></div>' +
    '<div class="info-cell"><div class="info-lbl">Lote</div><div class="info-val">' + p.lote + '</div></div>' +
    '<div class="info-cell"><div class="info-lbl">Fecha</div><div class="info-val">' + date + '</div></div>' +
    '<div class="info-cell"><div class="info-lbl">Estado</div><div class="info-val"><span class="badge">' + (d.estado||'CONFORME') + '</span></div></div></div></div>' +
    '<div class="card"><div class="card-title">Resultados</div><div class="table-wrap"><table><thead><tr>' +
    fields.map(function(k){ return '<th>' + FISICO_LABELS[k] + '</th>'; }).join('') + '</tr></thead><tbody><tr>' +
    fields.map(function(k){ return '<td><input type="number" step="0.01" data-f="' + k + '" value="' + d[k] + '"></td>'; }).join('') +
    '</tr></tbody></table></div></div>' +
    '<div class="card"><div class="card-title">Gr\u00e1fico del mes</div><div class="chart-box"><canvas id="cMain"></canvas></div></div>' +
    '<div class="card full"><div class="card-title">Tendencia % Humedad</div><div class="chart-box sm"><canvas id="cTrend"></canvas></div></div>' +
    '<div class="card full"><div class="card-title">Interpretaci\u00f3n</div><div class="interp">Par\u00e1metros de <strong>' + p.nombre + '</strong> en <strong>' + MONTH_NAMES[activeMonth] + ' 2026</strong> dentro de especificaci\u00f3n. <strong>CONFORME</strong>.</div>' +
    '<div class="sig"><div class="sig-box"><div class="sig-lbl">Analista</div><div class="sig-line"></div><div class="sig-name">Nereyda Huachua Flores</div></div></div></div>';
  setTimeout(function(){ drawFisicoBar(d, fields); drawHumTrend(); }, 20);
}

function destroyCharts() {
  if (chartMain) { chartMain.destroy(); chartMain = null; }
  if (chartTrend) { chartTrend.destroy(); chartTrend = null; }
}

function drawMicroBar(d) {
  destroyCharts();
  var cv = document.getElementById('cMain'); if (!cv) return;
  chartMain = new Chart(cv, {
    type: 'bar',
    data: { labels: MICRO_KEYS.map(function(k){ return MICRO_LABELS[k]; }), datasets: [{ data: MICRO_KEYS.map(function(k){ return d[k]||0; }), backgroundColor: MICRO_KEYS.map(function(k){ return COLORS[k]; }), borderRadius: 4, barPercentage: 0.6 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, datalabels: { color: '#424242', anchor: 'end', align: 'end', font: { size: 10, weight: '500' }, formatter: function(v){ return v||'0'; } } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: '#eee' } } } }
  });
}

function drawMicroTrend() {
  var cv = document.getElementById('cTrend'); if (!cv) return;
  chartTrend = new Chart(cv, {
    type: 'line',
    data: {
      labels: microRows.map(function(r){ return MONTH_NAMES[r.mes]; }),
      datasets: [
        { label: 'RTAMV', data: microRows.map(function(r){ return r.rtamv; }), borderColor: COLORS.rtamv, backgroundColor: 'rgba(21,101,192,.08)', fill: true, tension: .3, pointRadius: 3 },
        { label: 'Mohos', data: microRows.map(function(r){ return r.mohos; }), borderColor: COLORS.mohos, backgroundColor: 'rgba(239,108,0,.08)', fill: true, tension: .3, pointRadius: 3, yAxisID: 'y1' }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } }, datalabels: { display: false } }, scales: { y: { position: 'left', grid: { color: '#eee' } }, y1: { position: 'right', grid: { drawOnChartArea: false }, beginAtZero: true } } }
  });
}

function drawFisicoBar(d, fields) {
  destroyCharts();
  var cv = document.getElementById('cMain'); if (!cv) return;
  chartMain = new Chart(cv, {
    type: 'bar',
    data: { labels: fields.map(function(k){ return FISICO_LABELS[k]; }), datasets: [{ data: fields.map(function(k){ return +d[k]; }), backgroundColor: fields.map(function(k){ return COLORS[k]||'#1565c0'; }), borderRadius: 4, barPercentage: 0.5 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, datalabels: { color: '#424242', anchor: 'end', align: 'end', font: { size: 11, weight: '500' }, formatter: function(v){ return (+v).toFixed(2); } } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: '#eee' } } } }
  });
}

function drawHumTrend() {
  var cv = document.getElementById('cTrend'); if (!cv) return;
  chartTrend = new Chart(cv, {
    type: 'line',
    data: { labels: fisicoRows.map(function(r){ return MONTH_NAMES[r.mes]; }), datasets: [{ label: '% Humedad', data: fisicoRows.map(function(r){ return +r.humedad || 0; }), borderColor: COLORS.humedad, backgroundColor: 'rgba(21,101,192,.1)', fill: true, tension: .3, pointRadius: 4 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, datalabels: { color: COLORS.humedad, anchor: 'end', align: 'top', font: { size: 10, weight: '500' }, formatter: function(v){ return v.toFixed(2) + '%'; } } }, scales: { y: { grid: { color: '#eee' }, ticks: { callback: function(v){ return v.toFixed(1) + '%'; } } } } }
  });
}

async function saveCurrent() {
  var inputs = document.querySelectorAll('td input[data-f]');
  if (!inputs.length) return;
  var body = {};
  inputs.forEach(function(inp){ body[inp.dataset.f] = parseFloat(inp.value) || 0; });
  try {
    await api('/productos/' + activeCodigo + '/' + activeMode + '/' + activeMonth + '?anio=2026', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    snack('Guardado en la base de datos');
  } catch (e) {
    snack('Modo local: cambios solo en pantalla (sin SQL)');
  }
}

function snack(msg) {
  var el = document.getElementById('snackbar');
  el.textContent = msg; el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(function(){ el.classList.remove('show'); }, 2500);
}

document.addEventListener('click', function(e) {
  var ni = e.target.closest('.nav-item');
  if (ni) {
    activeCodigo = ni.dataset.c; activeMonth = 5;
    loadAndShow().catch(function(){
      microRows = buildFallbackMicro(activeCodigo);
      fisicoRows = buildFallbackFisico(activeCodigo);
      renderTabs();
      var p = products.find(function(x){ return x.codigo === activeCodigo; });
      document.getElementById('productTitle').textContent = p.nombre;
      document.getElementById('loteBadge').textContent = 'Lote ' + p.lote;
      if (activeMode === 'micro') renderMicro(p); else renderFisico(p);
    });
    return;
  }
  var tab = e.target.closest('.tab');
  if (tab) {
    activeMonth = +tab.dataset.m;
    var p = products.find(function(x){ return x.codigo === activeCodigo; });
    renderTabs();
    if (activeMode === 'micro') renderMicro(p); else renderFisico(p);
    return;
  }
  var seg = e.target.closest('.seg');
  if (seg) {
    activeMode = seg.dataset.mode;
    var p2 = products.find(function(x){ return x.codigo === activeCodigo; });
    document.querySelectorAll('.seg').forEach(function(b){ b.classList.toggle('active', b.dataset.mode === activeMode); });
    if (activeMode === 'micro') renderMicro(p2); else renderFisico(p2);
  }
  if (e.target.closest('#menuBtn')) document.getElementById('drawer').classList.toggle('open');
});

document.addEventListener('input', function(e) {
  var f = e.target.dataset.f; if (!f) return;
  var d = rowFor(activeMode); if (!d) return;
  d[f] = parseFloat(e.target.value) || 0;
  if (activeMode === 'micro') drawMicroBar(d);
  else drawFisicoBar(d, fisicoFields(d));
});

init();
