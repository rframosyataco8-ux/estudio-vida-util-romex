/* ═══════════════════════════════════════════════════
   ESTUDIO DE VIDA ÚTIL — Torta Alcalina de Cacao
   Exportadora Romex S.A. | Laboratorio de Microbiología
   ═══════════════════════════════════════════════════ */

Chart.register(ChartDataLabels);

/* ── Datos iniciales ── */
const INIT = [
  {key:'mayo',  n:'MAYO',       nm:1, r:3200,m:20, e:0,en:0, h:2.06, fs:'2026/5/14',  fp:'2026/5/12',  fa:'2026/5/14'},
  {key:'junio', n:'JUNIO',      nm:2, r:3500,m:25, e:0,en:0, h:2.01, fs:'2026/6/13',  fp:'2026/5/12',  fa:'2026/6/13'},
  {key:'julio', n:'JULIO',      nm:3, r:3300,m:15, e:0,en:10,h:2.03, fs:'2026/7/13',  fp:'2026/5/12',  fa:'2026/7/13'},
  {key:'agosto',n:'AGOSTO',     nm:4, r:3600,m:30, e:0,en:0, h:2.05, fs:'2026/8/12',  fp:'2026/5/12',  fa:'2026/8/12'},
  {key:'sept',  n:'SEPTIEMBRE', nm:5, r:3700,m:25, e:0,en:10,h:2.04, fs:'2026/9/12',  fp:'2026/5/12',  fa:'2026/9/12'},
  {key:'oct',   n:'OCTUBRE',    nm:6, r:3800,m:20, e:0,en:0, h:2.02, fs:'2026/10/13', fp:'2026/5/12',  fa:'2026/10/13'},
  {key:'nov',   n:'NOVIEMBRE',  nm:7, r:3900,m:30, e:0,en:0, h:2.00, fs:'2026/11/12', fp:'2026/5/12',  fa:'2026/11/12'},
  {key:'dic',   n:'DICIEMBRE',  nm:8, r:3950,m:20, e:0,en:10,h:1.98, fs:'2026/12/14', fp:'2026/5/12',  fa:'2026/12/14'},
  {key:'ene',   n:'ENERO',      nm:9, r:4000,m:10, e:0,en:0, h:1.97, fs:'2027/1/13',  fp:'2026/5/12',  fa:'2027/1/13'}
];

let S = JSON.parse(localStorage.getItem('romex_vida_util') || 'null') || JSON.parse(JSON.stringify(INIT));
let active = S[0] ? S[0].key : 'mayo';
let C = {};
let M = {};
let cnt = 0;
let currentView = 'micro';

function render(){
  Object.keys(C).forEach(k=>{ if(C[k].i){C[k].i.destroy();C[k].i=null;} if(C[k].e){C[k].e.destroy();C[k].e=null;} });
  if(C.globalH){C.globalH.destroy();C.globalH=null;}
  const bar = document.querySelector('.tab-bar');
  bar.innerHTML = '<div class="logo-tab">ROMEX</div>';
  const main = document.getElementById('mainArea');
  main.innerHTML = '';
  const microPanel = document.createElement('div');
  microPanel.className = 'view-panel' + (currentView==='micro'?' active':'');
  microPanel.id = 'view-micro';
  main.appendChild(microPanel);
  const humPanel = document.createElement('div');
  humPanel.className = 'view-panel' + (currentView==='humedad'?' active':'');
  humPanel.id = 'view-humedad';
  humPanel.innerHTML = renderHumedad();
  main.appendChild(humPanel);
  S.forEach((s,i)=>{
    if(!M[s.key]) M[s.key]='i';
    if(!C[s.key]) C[s.key]={i:null,e:null};
    const b = document.createElement('button');
    b.className = 'tab-btn'+(s.key===active?' active':'');
    b.dataset.k = s.key;
    b.innerHTML = s.n+'<span class="x" data-i="'+i+'">&times;</span>';
    b.addEventListener('click',ev=>{if(!ev.target.classList.contains('x'))switchTo(s.key);});
    bar.appendChild(b);
    b.querySelector('.x').addEventListener('click',ev=>{ev.stopPropagation();removeSheet(i);});
    const d = document.createElement('div');
    d.className = 'sheet'+(s.key===active?' active':'');
    d.id = 's-'+s.key;
    d.innerHTML = html(s);
    microPanel.appendChild(d);
  });
  const ab = document.createElement('button');
  ab.className='add-btn';ab.textContent='+';ab.title='Agregar hoja';
  ab.addEventListener('click',openModal);
  bar.appendChild(ab);
  setTimeout(()=>{ if(currentView==='micro'){ if(M[active]==='i') drawIndep(active); else drawEval(active); } else { drawHumedadChart(); } },60);
}

function html(s){
  const idx=S.indexOf(s);
  const last=idx===S.length-1;
  let txt='';
  if(last&&S.length>1){
    txt=`<p>Los resultados microbiológicos obtenidos de la TORTA DE CACAO (Código/Lote: 44260304) expuesta a una temperatura de 18°C a 33°C aproximadamente, entre los meses de ${S[0].n} a ${s.n} no presenta una variación significativa con respecto a los resultados iniciales.</p><p>A partir del mes de AGOSTO se observa una tendencia de incremento mínimo en los parámetros evaluados, manteniéndose dentro de los límites aceptables y sin diferencias significativas entre los meses subsiguientes.</p><p>Podríamos decir que a condiciones extremas de temperatura durante el almacenamiento, en los meses que faltan para completar los 02 años, damos por concluido el estudio hasta el momento.</p><p>No se presentará deterioro, los otros estudios de vida útil de los demás productos respaldan la decisión optada.</p>`;
  } else {
    txt=`<p>Los resultados microbiológicos obtenidos de la TORTA DE CACAO (Código/Lote: 44260304) expuesta a una temperatura de 18°C a 33°C aproximadamente, en el mes de ${s.n} no presenta una variación significativa con respecto a los resultados iniciales.</p>${s.key==='agosto'?'<p>A partir de este mes se observa un ligero incremento en los valores, el cual se mantiene dentro de los límites aceptables.</p>':''}${['sept','oct','nov','dic'].includes(s.key)?'<p>Los valores se mantienen estables con variaciones mínimas respecto al mes anterior, confirmando la estabilidad del producto.</p>':''}<p>El estudio de vida útil continúa en seguimiento mensual.</p>`;
  }
  return `<div class="doc-header"><div class="doc-header-top"><div class="doc-header-left"><div class="company-name">EXPORTADORA ROMEX S.A</div><div class="plant-name">PLANTA DE CACAO CHINCHA</div><div class="area-name">Área: Laboratorio de Microbiología</div></div><div class="doc-header-right"><div class="code-ref">Código: I-EVUP-R-309</div><div class="edition">Edición: 19</div><div class="edition">Fecha de emisión: 08-01-2026</div></div></div><div class="doc-title-bar"><div class="doc-title">ESTUDIO DE VIDA ÚTIL DE TORTA ALCALINA DE CACAO <span class="badge">${s.n}</span></div></div></div><div class="info-grid"><div><div class="info-label">Nombre del Producto</div><div class="info-value" contenteditable="true">Torta de Cacao</div></div><div><div class="info-label">Código / Lote</div><div class="info-value" contenteditable="true">44260304</div></div><div><div class="info-label">Fecha de Producción</div><div class="info-value" contenteditable="true" data-f="fp" data-k="${s.key}">${s.fp}</div></div><div><div class="info-label">Peso de la Muestra</div><div class="info-value" contenteditable="true">2500 GR</div></div><div class="full-span"><div class="info-label">Fecha de Siembra Microbiológica</div><div class="info-value" contenteditable="true" data-f="fs" data-k="${s.key}">${s.fs}</div></div></div><div class="section"><div class="section-title">Resultados Microbiológicos Iniciales de la Muestra</div><div class="table-wrap"><table><thead><tr><th>Fecha Inicial de Siembra</th><th>RTAMV ufc/gr</th><th>Mohos ufc/gr</th><th>E. Coli ufc/gr</th><th>Enterobacterias ufc/gr</th></tr></thead><tbody><tr><td><input type="text" value="${S[0].fs}"></td><td><input type="number" value="${S[0].r}"></td><td><input type="number" value="${S[0].m}"></td><td><input type="number" value="${S[0].e}"></td><td><input type="number" value="${S[0].en}"></td></tr></tbody></table></div></div><div class="section"><div class="section-title">Condiciones de Almacenamiento de la Muestra</div><div class="storage-grid"><div class="storage-cell"><div class="storage-cell-label">Temperatura</div><div class="storage-cell-value" contenteditable="true">18°C a 33°C</div></div><div class="storage-cell"><div class="storage-cell-label">Lugar de Almacenaje</div><div class="storage-cell-value" contenteditable="true">ALMACÉN DE EMPAQUE</div></div><div class="storage-cell"><div class="storage-cell-label">Material de Empaque</div><div class="storage-cell-value" contenteditable="true">Bolsa de polietileno</div></div><div class="storage-cell"><div class="storage-cell-label">Humedad Relativa</div><div class="storage-cell-value" contenteditable="true">60% - 75%</div></div></div></div><div class="section"><div class="section-title">Resultados de Análisis Microbiológico de Estudio de Vida Útil</div><div class="table-wrap"><table><thead><tr><th>Fecha de Análisis</th><th>RTAMV ufc/gr</th><th>Mohos ufc/gr</th><th>E. Coli ufc/gr</th><th>Enterobacterias ufc/gr</th><th>% Humedad</th></tr></thead><tbody><tr><td><input type="text" value="${s.fa}" data-f="fa" data-k="${s.key}"></td><td><input type="number" value="${s.r}" data-f="r" data-k="${s.key}"></td><td><input type="number" value="${s.m}" data-f="m" data-k="${s.key}"></td><td><input type="number" value="${s.e}" data-f="e" data-k="${s.key}"></td><td><input type="number" value="${s.en}" data-f="en" data-k="${s.key}"></td><td><input type="number" step="0.01" value="${s.h||0}" data-f="h" data-k="${s.key}"></td></tr></tbody></table></div><div class="pack-note">MATERIAL DE EMPAQUE: BOLSA DE POLIETILENO DE PRIMER USO</div></div><div class="chart-section"><div class="chart-header"><div class="chart-header-title">Gráfico Microbiológico</div><div class="toggle"><button class="toggle-btn ${M[s.key]==='i'?'active':''}" data-k="${s.key}" data-m="i">Independiente</button><button class="toggle-btn ${M[s.key]==='e'?'active':''}" data-k="${s.key}" data-m="e">Evaluación / Comportamiento</button></div></div><div id="wi-${s.key}" style="display:${M[s.key]==='i'?'block':'none'}"><div class="chart-sub">Estudio de Vida Útil de TORTA ALCALINA — Análisis Microbiológicos Realizados el ${s.fa}</div><div class="chart-box"><canvas id="ci-${s.key}"></canvas></div></div><div id="we-${s.key}" style="display:${M[s.key]==='e'?'block':'none'}"><div class="chart-sub">Comportamiento Acumulado — Todos los Meses</div><div class="chart-box sm"><canvas id="ce-${s.key}"></canvas></div></div></div><div class="section"><div class="section-title">Interpretación</div><div class="interp-content"><div class="interp-month">${s.nm}° MES DE ANÁLISIS DE ESTUDIO DE VIDA ÚTIL</div><div class="interp-sub">RESULTADOS DEL PATRÓN</div><div class="interp-text" contenteditable="true">${txt}</div></div></div><div class="sig-area"><div class="sig-box"><div class="sig-label">Analista de Microbiología</div><div class="sig-line"></div><div class="sig-name">Nereyda Huachua Flores</div></div></div>`;
}

function renderHumedad(){
  const initialH = S[0] ? (S[0].h || 2.06) : 2.06;
  const initialDate = S[0] ? S[0].fa : '2026/5/14';
  let rows = '';
  S.forEach((s,i)=>{ rows += `<tr><td contenteditable="true" data-hum-f="fa" data-i="${i}">${s.fa}</td><td contenteditable="true" data-hum-f="h" data-i="${i}">${(s.h||0).toFixed(2)}%</td><td><span class="del-hum" data-i="${i}" title="Eliminar">×</span></td></tr>`; });
  return `<div class="doc-header"><div class="doc-header-top"><div class="doc-header-left"><div class="company-name">EXPORTADORA ROMEX S.A</div><div class="plant-name">PLANTA DE CACAO CHINCHA</div><div class="area-name">Área: Laboratorio de Microbiología</div></div><div class="doc-header-right"><div class="code-ref">Código: I-EVUP-R-309</div><div class="edition">Edición: 19</div><div class="edition">Fecha de emisión: 08-01-2026</div></div></div><div class="doc-title-bar"><div class="doc-title">ANÁLISIS DE % DE HUMEDAD DE PRODUCTO QUE ESTÁ EN ESTUDIO DE VIDA ÚTIL</div></div></div><div class="hum-header-info"><div class="hum-info-item"><div class="hum-info-label">PRODUCTO</div><div class="hum-info-value" contenteditable="true">TORTA ALCALINA DE CACAO</div></div><div class="hum-info-item"><div class="hum-info-label">CÓDIGO / LOTE</div><div class="hum-info-value" contenteditable="true">44260304</div></div><div class="hum-info-item"><div class="hum-info-label">FECHA INICIAL DE ESTUDIO DE VIDA</div><div class="hum-info-value" contenteditable="true">${initialDate}</div></div><div class="hum-info-item"><div class="hum-info-label">% HUMEDAD INICIAL</div><div class="hum-info-value" contenteditable="true">${initialH.toFixed(2)}%</div></div></div><div class="hum-table-wrap"><div class="hum-table-title">Registro de % Humedad Obtenida</div><div class="table-wrap"><table><thead><tr><th style="width:40%">FECHA</th><th style="width:40%">% HUMEDAD OBTENIDA</th><th style="width:20%"></th></tr></thead><tbody id="hum-tbody">${rows}</tbody></table></div><div class="add-hum-row"><input type="text" id="newHumFecha" placeholder="Fecha (YYYY/M/D)"><input type="number" id="newHumValor" step="0.01" placeholder="% Humedad"><button class="add-hum-btn" onclick="addHumedadRow()">+ Agregar</button></div></div><div class="chart-section"><div class="chart-header"><div class="chart-header-title">Evolución de % Humedad</div></div><div class="chart-sub">Comportamiento de humedad durante el estudio de vida útil</div><div class="chart-box"><canvas id="chart-humedad"></canvas></div></div><div class="section"><div class="section-title">Interpretación de Humedad</div><div class="interp-content"><div class="interp-text" contenteditable="true"><p>Los valores de % de humedad de la TORTA ALCALINA DE CACAO (Lote 44260304) se mantienen estables a lo largo del estudio de vida útil, con variaciones mínimas que no superan el rango de control establecido.</p><p>La humedad inicial de ${initialH.toFixed(2)}% y los valores posteriores confirman que el producto no presenta cambios significativos que afecten su calidad ni su vida útil bajo las condiciones de almacenamiento evaluadas (18°C – 33°C / HR 60-75%).</p></div></div></div><div class="sig-area"><div class="sig-box"><div class="sig-label">Analista de Microbiología</div><div class="sig-line"></div><div class="sig-name">Nereyda Huachua Flores</div></div></div>`;
}

function drawIndep(key){
  const cv=document.getElementById('ci-'+key); if(!cv) return;
  if(C[key].i){C[key].i.destroy();C[key].i=null;}
  const s=S.find(x=>x.key===key); if(!s) return;
  const vals=[s.r, s.m, s.e, s.en];
  const labs=['RTAMV ufc/gr','MOHOS ufc/gr','E. COLI ufc/gr','ENTEROBACTERIAS ufc/gr'];
  const bgs=['rgba(70,140,255,0.85)','rgba(255,160,30,0.85)','rgba(50,205,100,0.85)','rgba(180,100,255,0.85)'];
  const bds=['rgba(70,140,255,1)','rgba(255,160,30,1)','rgba(50,205,100,1)','rgba(180,100,255,1)'];
  const lcs=['#a0c4ff','#ffd080','#80e8a8','#d0b8ff'];
  C[key].i = new Chart(cv.getContext('2d'),{ type:'bar', data:{ labels:labs, datasets:[{ label:s.n+' — '+s.fa, data:vals, backgroundColor:bgs, borderColor:bds, borderWidth:1.5, borderRadius:{topLeft:4,topRight:4}, borderSkipped:false, barPercentage:0.5 }] }, options:{ responsive:true, maintainAspectRatio:false, animation:{duration:400}, layout:{padding:{top:30}}, plugins:{ datalabels:{ display:true, color:function(ctx){return lcs[ctx.dataIndex];}, anchor:'end',align:'end',offset:3, font:{family:'Inter',size:14,weight:'800'}, formatter:function(v){return v===0?'0':v.toLocaleString();} }, legend:{ display:true,position:'bottom', labels:{color:'#888',font:{family:'Inter',size:10,weight:'600'},padding:14,usePointStyle:true,pointStyleWidth:10} }, tooltip:{ backgroundColor:'rgba(0,0,0,.92)',titleColor:'#fff',bodyColor:'#ccc', titleFont:{family:'Inter',size:11,weight:'700'},bodyFont:{family:'Inter',size:10}, padding:10,cornerRadius:6, callbacks:{label:function(ctx){return ' '+ctx.parsed.y.toLocaleString()+' ufc/gr';}} } }, scales:{ x:{ grid:{display:false}, ticks:{color:'#777',font:{family:'Inter',size:9,weight:'700'},maxRotation:0} }, y:{ grid:{color:'rgba(255,255,255,.04)'}, ticks:{color:'#555',font:{family:'Inter',size:9},callback:function(v){return v.toLocaleString();}}, beginAtZero:true, suggestedMax:Math.max(s.r*1.15,500) } } } });
}

function drawEval(key){
  const cv=document.getElementById('ce-'+key); if(!cv) return;
  if(C[key].e){C[key].e.destroy();C[key].e=null;}
  const labs=[],rv=[],mo=[],ec=[],en=[];
  S.forEach(s=>{labs.push(s.n);rv.push(s.r);mo.push(s.m);ec.push(s.e);en.push(s.en);});
  const mk=(label,data,color,bg,yid)=>({ label,data,borderColor:color,backgroundColor:bg, borderWidth:2.5,pointBackgroundColor:color,pointBorderColor:'#141414', pointBorderWidth:2,pointRadius:5,pointHoverRadius:8, tension:.35,fill:true,yAxisID:yid });
  C[key].e = new Chart(cv.getContext('2d'),{ type:'line', data:{ labels:labs, datasets:[ mk('RTAMV ufc/gr',rv,'rgba(70,140,255,1)','rgba(70,140,255,.08)','y'), mk('MOHOS ufc/gr',mo,'rgba(255,160,30,1)','rgba(255,160,30,.08)','y1'), mk('E. COLI ufc/gr',ec,'rgba(50,205,100,1)','rgba(50,205,100,.08)','y1'), mk('ENTEROBACTERIAS ufc/gr',en,'rgba(180,100,255,1)','rgba(180,100,255,.08)','y1') ] }, options:{ responsive:true, maintainAspectRatio:false, interaction:{mode:'index',intersect:false}, animation:{duration:500}, layout:{padding:{top:14}}, plugins:{ datalabels:{ display:function(ctx){return ctx.dataset.data[ctx.dataIndex]>0;}, color:function(ctx){return ctx.dataset.borderColor;}, anchor:'end',align:'top',offset:4, font:{family:'Inter',size:8,weight:'700'}, formatter:function(v){return v===0?'':v.toLocaleString();} }, legend:{ position:'bottom', labels:{color:'#888',font:{family:'Inter',size:9,weight:'600'},padding:12,usePointStyle:true,pointStyleWidth:10} }, tooltip:{ backgroundColor:'rgba(0,0,0,.92)',titleColor:'#fff',bodyColor:'#ccc', titleFont:{family:'Inter',size:11,weight:'700'},bodyFont:{family:'Inter',size:10}, padding:10,cornerRadius:6, callbacks:{label:function(ctx){return ' '+ctx.dataset.label+': '+ctx.parsed.y.toLocaleString()+' ufc/gr';}} } }, scales:{ x:{grid:{color:'rgba(255,255,255,.03)'},ticks:{color:'#555',font:{family:'Inter',size:8,weight:'600'},maxRotation:45}}, y:{position:'left',grid:{color:'rgba(255,255,255,.04)'},ticks:{color:'rgba(70,140,255,.6)',font:{family:'Inter',size:8},callback:function(v){return v.toLocaleString();}},title:{display:true,text:'RTAMV (ufc/gr)',color:'rgba(70,140,255,.6)',font:{family:'Inter',size:8,weight:'700'}},beginAtZero:false,suggestedMin:2000,suggestedMax:5000}, y1:{position:'right',grid:{drawOnChartArea:false},ticks:{color:'rgba(255,160,30,.6)',font:{family:'Inter',size:8}},title:{display:true,text:'Mohos / E.Coli / Enterob. (ufc/gr)',color:'rgba(255,160,30,.6)',font:{family:'Inter',size:7,weight:'700'}},beginAtZero:true,suggestedMax:50} } } });
}

function drawHumedadChart(){
  const cv = document.getElementById('chart-humedad'); if(!cv) return;
  if(C.globalH){C.globalH.destroy();C.globalH=null;}
  const labs = S.map(s=>s.n); const data = S.map(s=>s.h||0);
  C.globalH = new Chart(cv.getContext('2d'),{ type:'line', data:{ labels:labs, datasets:[{ label:'% Humedad', data:data, borderColor:'rgba(200,149,108,1)', backgroundColor:'rgba(200,149,108,0.12)', borderWidth:2.5, pointBackgroundColor:'#c8956c', pointBorderColor:'#141414', pointBorderWidth:2, pointRadius:6, pointHoverRadius:9, tension:0.3, fill:true }] }, options:{ responsive:true, maintainAspectRatio:false, animation:{duration:500}, layout:{padding:{top:20}}, plugins:{ datalabels:{ display:true, color:'#c8956c', anchor:'end',align:'top',offset:4, font:{family:'Inter',size:11,weight:'700'}, formatter:v=>v.toFixed(2)+'%' }, legend:{display:false}, tooltip:{ backgroundColor:'rgba(0,0,0,.92)',titleColor:'#fff',bodyColor:'#ccc', callbacks:{label:ctx=>' '+ctx.parsed.y.toFixed(2)+' %'} } }, scales:{ x:{grid:{color:'rgba(255,255,255,.03)'},ticks:{color:'#555',font:{family:'Inter',size:9,weight:'600'}}}, y:{grid:{color:'rgba(255,255,255,.04)'},ticks:{color:'#c8956c',font:{family:'Inter',size:9},callback:v=>v.toFixed(1)+'%'},beginAtZero:false,suggestedMin:1.5,suggestedMax:2.5,title:{display:true,text:'% Humedad',color:'#c8956c',font:{family:'Inter',size:9,weight:'700'}}} } } });
}

document.addEventListener('click',function(ev){
  const btn=ev.target.closest('.toggle-btn');
  if(btn){ const key=btn.dataset.k; const mode=btn.dataset.m; if(!key||!mode) return; M[key]=mode; document.querySelectorAll('.toggle-btn[data-k="'+key+'"]').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); const wi=document.getElementById('wi-'+key); const we=document.getElementById('we-'+key); if(mode==='i'){ wi.style.display='block';we.style.display='none'; drawIndep(key); } else { wi.style.display='none';we.style.display='block'; drawEval(key); } }
  const nav=ev.target.closest('.nav-btn');
  if(nav){ currentView = nav.dataset.view; document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.view===currentView)); document.querySelectorAll('.view-panel').forEach(p=>p.classList.toggle('active',p.id==='view-'+currentView)); if(currentView==='humedad') setTimeout(drawHumedadChart,50); else if(M[active]==='i') drawIndep(active); else drawEval(active); }
  const del=ev.target.closest('.del-hum');
  if(del){ const i = parseInt(del.dataset.i); if(S.length<=1){toast('Debe quedar al menos un registro');return;} S.splice(i,1); S.forEach((s,j)=>s.nm=j+1); saveData(true); render(); toast('Registro eliminado'); }
});

document.addEventListener('input',function(ev){
  const el=ev.target; const f=el.dataset.f; const k=el.dataset.k;
  if(f&&k){ const s=S.find(x=>x.key===k); if(!s) return; if(['r','m','e','en'].includes(f)){ s[f]=parseInt(el.value)||0; if(M[k]==='i'&&C[k]) drawIndep(k); } else if(f==='h'){ s.h = parseFloat(el.value)||0; } else if(['fa','fs','fp'].includes(f)){ s[f]=el.value; } }
  const hf = el.dataset.humF; const hi = el.dataset.i;
  if(hf!==undefined && hi!==undefined){ const idx = parseInt(hi); if(S[idx]){ if(hf==='h'){ let v = el.textContent.replace('%','').trim(); S[idx].h = parseFloat(v)||0; } else if(hf==='fa'){ S[idx].fa = el.textContent.trim(); } } }
});

function switchTo(key){ if(!S.find(s=>s.key===key)) return; active=key; document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active',b.dataset.k===key)); document.querySelectorAll('.sheet').forEach(d=>d.classList.toggle('active',d.id==='s-'+key)); setTimeout(()=>{ if(M[key]==='i') drawIndep(key); else drawEval(key); },30); }
function openModal(){ document.getElementById('modal').classList.add('show'); ['mNombre','mFecha'].forEach(id=>document.getElementById(id).value=''); document.getElementById('mRtamv').value='4000'; document.getElementById('mMohos').value='15'; document.getElementById('mEcoli').value='0'; document.getElementById('mEnterob').value='0'; document.getElementById('mHumedad').value='2.00'; setTimeout(()=>document.getElementById('mNombre').focus(),100); }
function closeModal(){document.getElementById('modal').classList.remove('show');}
function addSheet(){ const nombre=document.getElementById('mNombre').value.trim().toUpperCase(); const fecha=document.getElementById('mFecha').value.trim(); if(!nombre){toast('Ingresa el nombre del mes');return;} if(!fecha){toast('Ingresa la fecha de análisis');return;} cnt++; const ns={ key:'c'+cnt+'_'+Date.now(),n:nombre,nm:S.length+1, r:parseInt(document.getElementById('mRtamv').value)||0, m:parseInt(document.getElementById('mMohos').value)||0, e:parseInt(document.getElementById('mEcoli').value)||0, en:parseInt(document.getElementById('mEnterob').value)||0, h:parseFloat(document.getElementById('mHumedad').value)||0, fs:fecha,fp:S[0]?S[0].fp:fecha,fa:fecha }; S.push(ns); M[ns.key]='i';C[ns.key]={i:null,e:null}; active=ns.key; closeModal(); saveData(true); render(); toast('Hoja "'+nombre+'" agregada'); }
function addHumedadRow(){ const fecha = document.getElementById('newHumFecha').value.trim(); const val = parseFloat(document.getElementById('newHumValor').value); if(!fecha){toast('Ingresa la fecha');return;} if(isNaN(val)){toast('Ingresa el % de humedad');return;} cnt++; const ns = { key:'h'+cnt+'_'+Date.now(), n: 'MES '+(S.length+1), nm: S.length+1, r:4000,m:15,e:0,en:0, h:val, fs:fecha,fp:S[0]?S[0].fp:fecha,fa:fecha }; S.push(ns); saveData(true); render(); toast('Registro de humedad agregado'); }
function removeSheet(i){ if(S.length<=1){toast('Debe quedar al menos una hoja');return;} const rm=S[i]; if(C[rm.key]){if(C[rm.key].i)C[rm.key].i.destroy();if(C[rm.key].e)C[rm.key].e.destroy();delete C[rm.key];} delete M[rm.key]; S.splice(i,1); S.forEach((s,j)=>s.nm=j+1); if(active===rm.key) active=S[Math.min(i,S.length-1)].key; saveData(true); render(); toast('Hoja "'+rm.n+'" eliminada'); }
function saveData(silent){ localStorage.setItem('romex_vida_util', JSON.stringify(S)); if(!silent) toast('Datos guardados localmente'); }
function toast(msg){ const t=document.getElementById('toast'); t.textContent=msg;t.classList.add('show'); clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove('show'),2500); }
document.addEventListener('keydown',function(ev){ if(ev.key==='Escape') closeModal(); if(ev.key==='Enter'&&document.getElementById('modal').classList.contains('show')) addSheet(); });
render();
