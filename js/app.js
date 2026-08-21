/* Romex QC — SQL, auto-save, login, agregar mes, menú colapsable */
Chart.register(ChartDataLabels);

var API = (window.API_BASE || '') + '/api';
var MONTH_NAMES = ['','ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
var products = [], activeCodigo = null, activeMonth = 5, activeMode = 'micro';
var microRows = [], fisicoRows = [], chartMain = null, chartTrend = null, saveTimer = null, sqlReady = false;

var MICRO_KEYS = ['rtamv','mohos','coliformes','ecoli','enterobacterias','levaduras','saureus'];
var MICRO_LABELS = {rtamv:'RTAMV',mohos:'Mohos',coliformes:'Colif.',ecoli:'E.Coli',enterobacterias:'Enterob.',levaduras:'Levad.',saureus:'S.Aur.'};
var FISICO_LABELS = {humedad:'% Humedad',ph:'pH',ceniza:'% Ceniza',grasa:'% Grasa',fineza:'% Fineza',acidez:'% Acidez'};
var COLORS = {rtamv:'#1565c0',mohos:'#ef6c00',coliformes:'#2e7d32',ecoli:'#43a047',enterobacterias:'#7b1fa2',levaduras:'#c2185b',saureus:'#c62828',humedad:'#1565c0',ph:'#0288d1',ceniza:'#78909c',grasa:'#f9a825',fineza:'#2e7d32',acidez:'#e53935'};

function hideSplash(){ var s=document.getElementById('splash'); if(s) setTimeout(function(){s.classList.add('hide');},1200); }
async function api(path, opts){
  var r = await fetch(API + path, opts);
  if(!r.ok){ var t=await r.text(); throw new Error(t||r.statusText); }
  return r.json();
}
function setSaveInd(state,text){ var el=document.getElementById('saveInd'); if(!el)return; el.className='save-indicator '+(state||''); el.textContent=text||''; }
function snack(msg){ var el=document.getElementById('snackbar'); el.textContent=msg; el.classList.add('show'); clearTimeout(el._t); el._t=setTimeout(function(){el.classList.remove('show');},2800); }

function toggleProductsMenu(){
  var btn = document.getElementById('productsToggle');
  var nav = document.getElementById('productNav');
  if(!btn || !nav) return;
  var open = !nav.classList.contains('open');
  nav.classList.toggle('open', open);
  btn.classList.toggle('open', open);
  btn.setAttribute('aria-expanded', open ? 'true' : 'false');
}

async function init(){
  var un = localStorage.getItem('romex_user');
  if(un) document.getElementById('userName').textContent = un;
  try {
    await api('/health');
    products = await api('/productos');
    if(!products.length) throw new Error('No hay productos. Ejecuta el script SQL completo en SSMS.');
    sqlReady = true;
    activeCodigo = products[0].codigo;
    document.getElementById('dbStatus').innerHTML = '<span class="dot"></span> SQL Server conectado';
    renderNav();
    await loadAndShow();
    hideSplash();
  } catch(e){
    hideSplash();
    document.getElementById('dbStatus').innerHTML = '<span class="dot" style="background:#c62828"></span> Sin conexi\u00f3n SQL';
    document.getElementById('content').innerHTML = '<div class="loading"><strong>No se pudo conectar a SQL Server</strong><br><small>'+e.message+'</small><br><br>1. npm start en server/<br>2. .env correcto<br>3. Base RomexQC con datos</div>';
  }
}

function renderNav(){
  document.getElementById('productNav').innerHTML = products.map(function(p){
    return '<button type="button" class="nav-item'+(p.codigo===activeCodigo?' active':'')+'" data-c="'+p.codigo+'">'+p.nombre+'<span class="lote">Lote '+p.lote+'</span></button>';
  }).join('');
}

function renderTabs(){
  var months=[];
  microRows.concat(fisicoRows).forEach(function(r){ if(months.indexOf(r.mes)<0) months.push(r.mes); });
  months.sort(function(a,b){return a-b;});
  if(months.indexOf(activeMonth)<0 && months.length) activeMonth=months[0];
  document.getElementById('monthTabs').innerHTML = months.map(function(m){
    return '<button class="tab'+(m===activeMonth?' active':'')+'" data-m="'+m+'">'+MONTH_NAMES[m]+'</button>';
  }).join('');
}

async function loadAndShow(){
  document.getElementById('content').innerHTML='<div class="loading"><div class="spinner"></div> Cargando…</div>';
  var p=products.find(function(x){return x.codigo===activeCodigo;});
  document.getElementById('productTitle').textContent=p.nombre;
  document.getElementById('loteBadge').textContent='Lote '+p.lote;
  document.querySelectorAll('.seg').forEach(function(b){b.classList.toggle('active',b.dataset.mode===activeMode);});
  microRows=await api('/productos/'+activeCodigo+'/micro?anio=2026');
  fisicoRows=await api('/productos/'+activeCodigo+'/fisico?anio=2026');
  renderTabs();
  if(activeMode==='micro') renderMicro(p); else renderFisico(p);
}

function rowFor(mode){
  var rows=mode==='micro'?microRows:fisicoRows;
  return rows.find(function(r){return r.mes===activeMonth;})||null;
}

function renderMicro(p){
  var d=rowFor('micro');
  if(!d){document.getElementById('content').innerHTML='<div class="loading">Sin datos micro este mes</div>';return;}
  var date=d.fecha_analisis?String(d.fecha_analisis).slice(0,10):'—';
  document.getElementById('content').innerHTML=
    '<div class="card full"><div class="doc-bar"><div><div class="doc-co">EXPORTADORA ROMEX S.A.</div><div class="doc-pl">Planta Cacao Chincha \u00b7 Microbiolog\u00eda</div></div><div class="doc-meta">I-EVUP-R-309</div></div>'+
    '<div class="doc-head">An\u00e1lisis Microbiol\u00f3gico \u00b7 '+p.nombre+' \u00b7 '+MONTH_NAMES[activeMonth]+' 2026</div>'+
    '<div class="info-grid"><div class="info-cell"><div class="info-lbl">Producto</div><div class="info-val">'+p.nombre+'</div></div><div class="info-cell"><div class="info-lbl">Lote</div><div class="info-val">'+p.lote+'</div></div><div class="info-cell"><div class="info-lbl">Fecha</div><div class="info-val">'+date+'</div></div><div class="info-cell"><div class="info-lbl">Estado</div><div class="info-val"><span class="badge">'+(d.estado||'LIBERADO')+'</span></div></div></div></div>'+
    '<div class="card"><div class="card-title">Resultados (ufc/gr) <span style="font-size:10px">auto-guarda SQL</span></div><div class="table-wrap"><table><thead><tr>'+MICRO_KEYS.map(function(k){return '<th>'+MICRO_LABELS[k]+'</th>';}).join('')+'</tr></thead><tbody><tr>'+MICRO_KEYS.map(function(k){return '<td><input type="number" data-f="'+k+'" value="'+(d[k]||0)+'"></td>';}).join('')+'</tr></tbody></table></div></div>'+
    '<div class="card"><div class="card-title">Gr\u00e1fico</div><div class="chart-box"><canvas id="cMain"></canvas></div></div>'+
    '<div class="card full"><div class="card-title">Tendencia</div><div class="chart-box sm"><canvas id="cTrend"></canvas></div></div>'+
    '<div class="card full"><div class="card-title">Interpretaci\u00f3n</div><div class="interp"><strong>'+p.nombre+'</strong> \u00b7 '+MONTH_NAMES[activeMonth]+' 2026 \u00b7 <strong>LIBERADO</strong></div><div class="sig"><div class="sig-box"><div class="sig-lbl">Analista</div><div class="sig-line"></div><div class="sig-name">Nereyda Huachua Flores</div></div></div></div>';
  setTimeout(function(){drawMicroBar(d);drawMicroTrend();},20);
}

function fisicoFields(d){return ['humedad','ph','ceniza','grasa','fineza','acidez'].filter(function(k){return d[k]!=null&&d[k]!=='';});}

function renderFisico(p){
  var d=rowFor('fisico');
  if(!d){document.getElementById('content').innerHTML='<div class="loading">Sin datos f\u00edsico este mes</div>';return;}
  var fields=fisicoFields(d);
  var date=d.fecha_analisis?String(d.fecha_analisis).slice(0,10):'—';
  document.getElementById('content').innerHTML=
    '<div class="card full"><div class="doc-bar"><div><div class="doc-co">EXPORTADORA ROMEX S.A.</div><div class="doc-pl">F\u00edsicoqu\u00edmico</div></div><div class="doc-meta">I-EVUP-R-309</div></div>'+
    '<div class="doc-head">An\u00e1lisis F\u00edsicoqu\u00edmico \u00b7 '+p.nombre+' \u00b7 '+MONTH_NAMES[activeMonth]+' 2026</div>'+
    '<div class="info-grid"><div class="info-cell"><div class="info-lbl">Producto</div><div class="info-val">'+p.nombre+'</div></div><div class="info-cell"><div class="info-lbl">Lote</div><div class="info-val">'+p.lote+'</div></div><div class="info-cell"><div class="info-lbl">Fecha</div><div class="info-val">'+date+'</div></div><div class="info-cell"><div class="info-lbl">Estado</div><div class="info-val"><span class="badge">'+(d.estado||'CONFORME')+'</span></div></div></div></div>'+
    '<div class="card"><div class="card-title">Resultados <span style="font-size:10px">auto-guarda SQL</span></div><div class="table-wrap"><table><thead><tr>'+fields.map(function(k){return '<th>'+FISICO_LABELS[k]+'</th>';}).join('')+'</tr></thead><tbody><tr>'+fields.map(function(k){return '<td><input type="number" step="0.01" data-f="'+k+'" value="'+d[k]+'"></td>';}).join('')+'</tr></tbody></table></div></div>'+
    '<div class="card"><div class="card-title">Gr\u00e1fico</div><div class="chart-box"><canvas id="cMain"></canvas></div></div>'+
    '<div class="card full"><div class="card-title">Tendencia % Humedad</div><div class="chart-box sm"><canvas id="cTrend"></canvas></div></div>'+
    '<div class="card full"><div class="card-title">Interpretaci\u00f3n</div><div class="interp"><strong>'+p.nombre+'</strong> \u00b7 '+MONTH_NAMES[activeMonth]+' 2026 \u00b7 <strong>CONFORME</strong></div><div class="sig"><div class="sig-box"><div class="sig-lbl">Analista</div><div class="sig-line"></div><div class="sig-name">Nereyda Huachua Flores</div></div></div></div>';
  setTimeout(function(){drawFisicoBar(d,fields);drawHumTrend();},20);
}

function destroyCharts(){if(chartMain){chartMain.destroy();chartMain=null;}if(chartTrend){chartTrend.destroy();chartTrend=null;}}
function drawMicroBar(d){destroyCharts();var cv=document.getElementById('cMain');if(!cv)return;chartMain=new Chart(cv,{type:'bar',data:{labels:MICRO_KEYS.map(function(k){return MICRO_LABELS[k];}),datasets:[{data:MICRO_KEYS.map(function(k){return d[k]||0;}),backgroundColor:MICRO_KEYS.map(function(k){return COLORS[k];}),borderRadius:6,barPercentage:.55}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},datalabels:{color:'#424242',anchor:'end',align:'end',font:{size:10},formatter:function(v){return v||'0';}}},scales:{x:{grid:{display:false}},y:{beginAtZero:true,grid:{color:'#eef1f5'}}}}});}
function drawMicroTrend(){var cv=document.getElementById('cTrend');if(!cv)return;chartTrend=new Chart(cv,{type:'line',data:{labels:microRows.map(function(r){return MONTH_NAMES[r.mes];}),datasets:[{label:'RTAMV',data:microRows.map(function(r){return r.rtamv;}),borderColor:COLORS.rtamv,fill:true,tension:.35,pointRadius:4},{label:'Mohos',data:microRows.map(function(r){return r.mohos;}),borderColor:COLORS.mohos,fill:true,tension:.35,pointRadius:4,yAxisID:'y1'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'},datalabels:{display:false}},scales:{y:{position:'left'},y1:{position:'right',grid:{drawOnChartArea:false},beginAtZero:true}}}});}
function drawFisicoBar(d,fields){destroyCharts();var cv=document.getElementById('cMain');if(!cv)return;chartMain=new Chart(cv,{type:'bar',data:{labels:fields.map(function(k){return FISICO_LABELS[k];}),datasets:[{data:fields.map(function(k){return +d[k];}),backgroundColor:fields.map(function(k){return COLORS[k]||'#1565c0';}),borderRadius:6}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},datalabels:{color:'#424242',anchor:'end',align:'end',formatter:function(v){return (+v).toFixed(2);}}},scales:{x:{grid:{display:false}},y:{beginAtZero:true}}}});}
function drawHumTrend(){var cv=document.getElementById('cTrend');if(!cv)return;chartTrend=new Chart(cv,{type:'line',data:{labels:fisicoRows.map(function(r){return MONTH_NAMES[r.mes];}),datasets:[{data:fisicoRows.map(function(r){return +r.humedad||0;}),borderColor:COLORS.humedad,fill:true,tension:.35,pointRadius:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},datalabels:{color:COLORS.humedad,anchor:'end',align:'top',formatter:function(v){return v.toFixed(2)+'%';}}}}});}

function scheduleAutoSave(){if(!sqlReady)return;setSaveInd('saving','Guardando…');clearTimeout(saveTimer);saveTimer=setTimeout(autoSave,800);}
async function autoSave(){
  var inputs=document.querySelectorAll('td input[data-f]');if(!inputs.length||!sqlReady)return;
  var body={};inputs.forEach(function(inp){body[inp.dataset.f]=parseFloat(inp.value)||0;});
  try{
    await api('/productos/'+activeCodigo+'/'+activeMode+'/'+activeMonth+'?anio=2026',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    setSaveInd('saved','Guardado en SQL');setTimeout(function(){setSaveInd('','');},2500);
  }catch(e){setSaveInd('','');snack('Error al guardar: '+e.message);}
}

async function addMonth(){
  if(!sqlReady||!activeCodigo)return;
  var existing={};
  microRows.forEach(function(r){existing[r.mes]=true;});
  var next=null;
  for(var m=1;m<=12;m++){ if(!existing[m]){ next=m; break; } }
  if(!next){ snack('Ya existen los 12 meses del a\u00f1o'); return; }
  try{
    await api('/productos/'+activeCodigo+'/mes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({anio:2026,mes:next})});
    snack('Mes '+MONTH_NAMES[next]+' agregado en SQL');
    activeMonth=next;
    await loadAndShow();
  }catch(e){ snack(e.message); }
}

document.addEventListener('click',function(e){
  if(e.target.closest('#logoutBtn')){ localStorage.removeItem('romex_token'); localStorage.removeItem('romex_user'); location.href='login.html'; return; }
  if(e.target.closest('#addMonthBtn')){ addMonth(); return; }
  if(e.target.closest('#productsToggle')){ toggleProductsMenu(); return; }
  var ni=e.target.closest('.nav-item');
  if(ni&&sqlReady){ activeCodigo=ni.dataset.c; activeMonth=5; renderNav(); loadAndShow().catch(function(err){snack(err.message);}); return; }
  var tab=e.target.closest('.tab');
  if(tab&&sqlReady){ activeMonth=+tab.dataset.m; var p=products.find(function(x){return x.codigo===activeCodigo;}); renderTabs(); if(activeMode==='micro')renderMicro(p);else renderFisico(p); return; }
  var seg=e.target.closest('.seg');
  if(seg&&sqlReady){ activeMode=seg.dataset.mode; var p2=products.find(function(x){return x.codigo===activeCodigo;}); document.querySelectorAll('.seg').forEach(function(b){b.classList.toggle('active',b.dataset.mode===activeMode);}); if(activeMode==='micro')renderMicro(p2);else renderFisico(p2); }
  if(e.target.closest('#menuBtn')) document.getElementById('drawer').classList.toggle('open');
});

document.addEventListener('input',function(e){
  var f=e.target.dataset.f; if(!f)return;
  var d=rowFor(activeMode); if(!d)return;
  d[f]=parseFloat(e.target.value)||0;
  if(activeMode==='micro') drawMicroBar(d); else drawFisicoBar(d,fisicoFields(d));
  scheduleAutoSave();
});

init();
