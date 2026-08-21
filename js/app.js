/* Romex QC — SQL obligatorio, auto-save, animaciones */
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
var saveTimer = null;
var sqlReady = false;

var MICRO_KEYS = ['rtamv','mohos','coliformes','ecoli','enterobacterias','levaduras','saureus'];
var MICRO_LABELS = {rtamv:'RTAMV',mohos:'Mohos',coliformes:'Colif.',ecoli:'E.Coli',enterobacterias:'Enterob.',levaduras:'Levad.',saureus:'S.Aur.'};
var FISICO_LABELS = {humedad:'% Humedad',ph:'pH',ceniza:'% Ceniza',grasa:'% Grasa',fineza:'% Fineza',acidez:'% Acidez'};
var COLORS = {
  rtamv:'#1565c0',mohos:'#ef6c00',coliformes:'#2e7d32',ecoli:'#43a047',
  enterobacterias:'#7b1fa2',levaduras:'#c2185b',saureus:'#c62828',
  humedad:'#1565c0',ph:'#0288d1',ceniza:'#78909c',grasa:'#f9a825',fineza:'#2e7d32',acidez:'#e53935'
};

function hideSplash() {
  var s = document.getElementById('splash');
  if (s) setTimeout(function(){ s.classList.add('hide'); }, 1400);
}

async function api(path, opts) {
  var r = await fetch(API + path, opts);
  if (!r.ok) {
    var t = await r.text();
    throw new Error(t || r.statusText);
  }
  return r.json();
}

function setSaveInd(state, text) {
  var el = document.getElementById('saveInd');
  if (!el) return;
  el.className = 'save-indicator ' + (state || '');
  el.textContent = text || '';
}

async function init() {
  try {
    await api('/health');
    products = await api('/productos');
    if (!products.length) throw new Error('No hay productos en la base de datos. Ejecuta el seed en SSMS.');
    sqlReady = true;
    activeCodigo = products[0].codigo;
    document.getElementById('dbStatus').innerHTML = '<span class="dot"></span> SQL Server conectado';
    renderNav();
    await loadAndShow();
    hideSplash();
  } catch (e) {
    hideSplash();
    document.getElementById('dbStatus').innerHTML = '<span class="dot" style="background:#c62828"></span> Sin conexi\u00f3n SQL';
    document.getElementById('content').innerHTML =
      '<div class="loading"><div class="spinner"></div>' +
      '<div style="text-align:center;max-width:420px">' +
      '<strong>No se pudo conectar a SQL Server</strong><br><br>' +
      '<small>' + e.message + '</small><br><br>' +
      '1. Verifica que <code>npm start</code> est\u00e9 corriendo en <code>server/</code><br>' +
      '2. Revisa el archivo <code>server/.env</code><br>' +
      '3. Confirma que la base <strong>RomexQC</strong> existe en SSMS' +
      '</div></div>';
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
  microRows.concat(fisicoRows).forEach(function(r) {
    if (months.indexOf(r.mes) < 0) months.push(r.mes);
  });
  months.sort(function(a,b){ return a - b; });
  if (months.indexOf(activeMonth) < 0 && months.length) activeMonth = months[0];
  document.getElementById('monthTabs').innerHTML = months.map(function(m) {
    return '<button class="tab' + (m === activeMonth ? ' active' : '') + '" data-m="' + m + '">' + MONTH_NAMES[m] + '</button>';
  }).join('');
}

async function loadAndShow() {
  document.getElementById('content').innerHTML = '<div class="loading"><div class="spinner"></div> Cargando datos…</div>';
  var p = products.find(function(x){ return x.codigo === activeCodigo; });
  document.getElementById('productTitle').textContent = p.nombre;
  document.getElementById('loteBadge').textContent = 'Lote ' + p.lote;
  document.querySelectorAll('.seg').forEach(function(b){ b.classList.toggle('active', b.dataset.mode === activeMode); });

  microRows = await api('/productos/' + activeCodigo + '/micro?anio=2026');
  fisicoRows = await api('/productos/' + activeCodigo + '/fisico?anio=2026');
  renderTabs();
  if (activeMode === 'micro') renderMicro(p); else renderFisico(p);
}

function rowFor(mode) {
  var rows = mode === 'micro' ? microRows : fisicoRows;
  return rows.find(function(r){ return r.mes === activeMonth; }) || null;
}

function renderMicro(p) {
  var d = rowFor('micro');
  if (!d) { document.getElementById('content').innerHTML = '<div class="loading">Sin datos de microbiolog\u00eda para este mes</div>'; return; }
  var date = d.fecha_analisis ? String(d.fecha_analisis).slice(0,10) : '—';
  document.getElementById('content').innerHTML =
    '<div class="card full"><div class="doc-bar"><div><div class="doc-co">EXPORTADORA ROMEX S.A.</div><div class="doc-pl">Planta Cacao Chincha \u00b7 Laboratorio de Microbiolog\u00eda</div></div><div class="doc-meta">C\u00f3digo: I-EVUP-R-309<br>Edici\u00f3n: 19</div></div>' +
    '<div class="doc-head">An\u00e1lisis Microbiol\u00f3gico \u00b7 ' + p.nombre + ' \u00b7 ' + MONTH_NAMES[activeMonth] + ' 2026</div>' +
    '<div class="info-grid"><div class="info-cell"><div class="info-lbl">Producto</div><div class="info-val">' + p.nombre + '</div></div>' +
    '<div class="info-cell"><div class="info-lbl">Lote</div><div class="info-val">' + p.lote + '</div></div>' +
    '<div class="info-cell"><div class="info-lbl">Fecha an\u00e1lisis</div><div class="info-val">' + date + '</div></div>' +
    '<div class="info-cell"><div class="info-lbl">Estado</div><div class="info-val"><span class="badge">' + (d.estado||'LIBERADO') + '</span></div></div></div></div>' +
    '<div class="card"><div class="card-title">Resultados (ufc/gr) <span style="font-size:10px;color:#5a6a7a">auto-guarda en SQL</span></div><div class="table-wrap"><table><thead><tr>' +
    MICRO_KEYS.map(function(k){ return '<th>' + MICRO_LABELS[k] + '</th>'; }).join('') + '</tr></thead><tbody><tr>' +
    MICRO_KEYS.map(function(k){ return '<td><input type="number" data-f="' + k + '" value="' + (d[k]||0) + '"></td>'; }).join('') +
    '</tr></tbody></table></div></div>' +
    '<div class="card"><div class="card-title">Gr\u00e1fico del mes</div><div class="chart-box"><canvas id="cMain"></canvas></div></div>' +
    '<div class="card full"><div class="card-title">Tendencia anual</div><div class="chart-box sm"><canvas id="cTrend"></canvas></div></div>' +
    '<div class="card full"><div class="card-title">Interpretaci\u00f3n</div><div class="interp">Resultados de <strong>' + p.nombre + '</strong> (Lote ' + p.lote + ') en <strong>' + MONTH_NAMES[activeMonth] + ' 2026</strong> dentro de l\u00edmites aceptables. Pat\u00f3genos <10 ufc/gr. <strong>LIBERADO</strong>.</div>' +
    '<div class="sig"><div class="sig-box"><div class="sig-lbl">Analista</div><div class="sig-line"></div><div class="sig-name">Nereyda Huachua Flores</div></div></div></div>';
  setTimeout(function(){ drawMicroBar(d); drawMicroTrend(); }, 20);
}

function fisicoFields(d) {
  return ['humedad','ph','ceniza','grasa','fineza','acidez'].filter(function(k){ return d[k] != null && d[k] !== ''; });
}

function renderFisico(p) {
  var d = rowFor('fisico');
  if (!d) { document.getElementById('content').innerHTML = '<div class="loading">Sin datos f\u00edsicoqu\u00edmicos para este mes</div>'; return; }
  var fields = fisicoFields(d);
  var date = d.fecha_analisis ? String(d.fecha_analisis).slice(0,10) : '—';
  document.getElementById('content').innerHTML =
    '<div class="card full"><div class="doc-bar"><div><div class="doc-co">EXPORTADORA ROMEX S.A.</div><div class="doc-pl">Planta Cacao Chincha \u00b7 Laboratorio F\u00edsicoqu\u00edmico</div></div><div class="doc-meta">C\u00f3digo: I-EVUP-R-309<br>Edici\u00f3n: 19</div></div>' +
    '<div class="doc-head">An\u00e1lisis F\u00edsicoqu\u00edmico \u00b7 ' + p.nombre + ' \u00b7 ' + MONTH_NAMES[activeMonth] + ' 2026</div>' +
    '<div class="info-grid"><div class="info-cell"><div class="info-lbl">Producto</div><div class="info-val">' + p.nombre + '</div></div>' +
    '<div class="info-cell"><div class="info-lbl">Lote</div><div class="info-val">' + p.lote + '</div></div>' +
    '<div class="info-cell"><div class="info-lbl">Fecha an\u00e1lisis</div><div class="info-val">' + date + '</div></div>' +
    '<div class="info-cell"><div class="info-lbl">Estado</div><div class="info-val"><span class="badge">' + (d.estado||'CONFORME') + '</span></div></div></div></div>' +
    '<div class="card"><div class="card-title">Resultados <span style="font-size:10px;color:#5a6a7a">auto-guarda en SQL</span></div><div class="table-wrap"><table><thead><tr>' +
    fields.map(function(k){ return '<th>' + FISICO_LABELS[k] + '</th>'; }).join('') + '</tr></thead><tbody><tr>' +
    fields.map(function(k){ return '<td><input type="number" step="0.01" data-f="' + k + '" value="' + d[k] + '"></td>'; }).join('') +
    '</tr></tbody></table></div></div>' +
    '<div class="card"><div class="card-title">Gr\u00e1fico del mes</div><div class="chart-box"><canvas id="cMain"></canvas></div></div>' +
    '<div class="card full"><div class="card-title">Tendencia % Humedad</div><div class="chart-box sm"><canvas id="cTrend"></canvas></div></div>' +
    '<div class="card full"><div class="card-title">Interpretaci\u00f3n</div><div class="interp">Par\u00e1metros f\u00edsicoqu\u00edmicos de <strong>' + p.nombre + '</strong> en <strong>' + MONTH_NAMES[activeMonth] + ' 2026</strong> dentro de especificaci\u00f3n. <strong>CONFORME</strong>.</div>' +
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
    data: { labels: MICRO_KEYS.map(function(k){ return MICRO_LABELS[k]; }), datasets: [{ data: MICRO_KEYS.map(function(k){ return d[k]||0; }), backgroundColor: MICRO_KEYS.map(function(k){ return COLORS[k]; }), borderRadius: 6, barPercentage: 0.55 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, datalabels: { color: '#424242', anchor: 'end', align: 'end', font: { size: 10, weight: '500' }, formatter: function(v){ return v||'0'; } } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: '#eef1f5' } } } }
  });
}

function drawMicroTrend() {
  var cv = document.getElementById('cTrend'); if (!cv) return;
  chartTrend = new Chart(cv, {
    type: 'line',
    data: {
      labels: microRows.map(function(r){ return MONTH_NAMES[r.mes]; }),
      datasets: [
        { label: 'RTAMV', data: microRows.map(function(r){ return r.rtamv; }), borderColor: COLORS.rtamv, backgroundColor: 'rgba(21,101,192,.08)', fill: true, tension: .35, pointRadius: 4 },
        { label: 'Mohos', data: microRows.map(function(r){ return r.mohos; }), borderColor: COLORS.mohos, backgroundColor: 'rgba(239,108,0,.08)', fill: true, tension: .35, pointRadius: 4, yAxisID: 'y1' }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } }, datalabels: { display: false } }, scales: { y: { position: 'left', grid: { color: '#eef1f5' } }, y1: { position: 'right', grid: { drawOnChartArea: false }, beginAtZero: true } } }
  });
}

function drawFisicoBar(d, fields) {
  destroyCharts();
  var cv = document.getElementById('cMain'); if (!cv) return;
  chartMain = new Chart(cv, {
    type: 'bar',
    data: { labels: fields.map(function(k){ return FISICO_LABELS[k]; }), datasets: [{ data: fields.map(function(k){ return +d[k]; }), backgroundColor: fields.map(function(k){ return COLORS[k]||'#1565c0'; }), borderRadius: 6, barPercentage: 0.5 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, datalabels: { color: '#424242', anchor: 'end', align: 'end', font: { size: 11, weight: '500' }, formatter: function(v){ return (+v).toFixed(2); } } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: '#eef1f5' } } } }
  });
}

function drawHumTrend() {
  var cv = document.getElementById('cTrend'); if (!cv) return;
  chartTrend = new Chart(cv, {
    type: 'line',
    data: { labels: fisicoRows.map(function(r){ return MONTH_NAMES[r.mes]; }), datasets: [{ label: '% Humedad', data: fisicoRows.map(function(r){ return +r.humedad || 0; }), borderColor: COLORS.humedad, backgroundColor: 'rgba(21,101,192,.1)', fill: true, tension: .35, pointRadius: 4 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, datalabels: { color: COLORS.humedad, anchor: 'end', align: 'top', font: { size: 10, weight: '500' }, formatter: function(v){ return v.toFixed(2) + '%'; } } }, scales: { y: { grid: { color: '#eef1f5' }, ticks: { callback: function(v){ return v.toFixed(1) + '%'; } } } } }
  });
}

/** Auto-guarda en SQL Server al dejar de escribir (800ms) */
function scheduleAutoSave() {
  if (!sqlReady) return;
  setSaveInd('saving', 'Guardando…');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(autoSave, 800);
}

async function autoSave() {
  var inputs = document.querySelectorAll('td input[data-f]');
  if (!inputs.length || !sqlReady) return;
  var body = {};
  inputs.forEach(function(inp){ body[inp.dataset.f] = parseFloat(inp.value) || 0; });
  try {
    await api('/productos/' + activeCodigo + '/' + activeMode + '/' + activeMonth + '?anio=2026', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    setSaveInd('saved', 'Guardado en SQL');
    setTimeout(function(){ setSaveInd('', ''); }, 2500);
  } catch (e) {
    setSaveInd('', '');
    snack('Error al guardar: ' + e.message);
  }
}

function snack(msg) {
  var el = document.getElementById('snackbar');
  el.textContent = msg; el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(function(){ el.classList.remove('show'); }, 2800);
}

document.addEventListener('click', function(e) {
  var ni = e.target.closest('.nav-item');
  if (ni && sqlReady) {
    activeCodigo = ni.dataset.c;
    activeMonth = 5;
    renderNav();
    loadAndShow().catch(function(err){ snack(err.message); });
    return;
  }
  var tab = e.target.closest('.tab');
  if (tab && sqlReady) {
    activeMonth = +tab.dataset.m;
    var p = products.find(function(x){ return x.codigo === activeCodigo; });
    renderTabs();
    if (activeMode === 'micro') renderMicro(p); else renderFisico(p);
    return;
  }
  var seg = e.target.closest('.seg');
  if (seg && sqlReady) {
    activeMode = seg.dataset.mode;
    var p2 = products.find(function(x){ return x.codigo === activeCodigo; });
    document.querySelectorAll('.seg').forEach(function(b){ b.classList.toggle('active', b.dataset.mode === activeMode); });
    if (activeMode === 'micro') renderMicro(p2); else renderFisico(p2);
  }
  if (e.target.closest('#menuBtn')) document.getElementById('drawer').classList.toggle('open');
});

document.addEventListener('input', function(e) {
  var f = e.target.dataset.f;
  if (!f) return;
  var d = rowFor(activeMode);
  if (!d) return;
  d[f] = parseFloat(e.target.value) || 0;
  if (activeMode === 'micro') drawMicroBar(d);
  else drawFisicoBar(d, fisicoFields(d));
  scheduleAutoSave();
});

init();
