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
let currentView = 'micro'; // 'micro' | 'humedad'

/* ═══════════════════════════════════ RENDER ═══════════════════════════════════ */
function render(){
  Object.keys(C).forEach(k=>{
    if(C[k].i){C[k].i.destroy();C[k].i=null;}
    if(C[k].e){C[k].e.destroy();C[k].e=null;}
  });
  if(C.globalH){C.globalH.destroy();C.globalH=null;}

  const bar = document.querySelector('.tab-bar');
  bar.innerHTML = '<div class="logo-tab">ROMEX</div>';
  const main = document.getElementById('mainArea');
  main.innerHTML = '';

  /* View panels */
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

  setTimeout(()=>{
    if(currentView==='micro'){
      if(M[active]==='i') drawIndep(active);
      else drawEval(active);
    } else {
      drawHumedadChart();
    }
  },60);
}

/* ═══════════════════════════════════ HTML HOJA MICRO ═══════════════════════════════════ */
function html(s){
  const idx=S.indexOf(s);
  const last=idx===S.length-1;
  let txt='';
  if(last&&S.length>1){
    txt=`<p>Los resultados microbiológicos obtenidos de la TORTA DE CACAO (Código/Lote: 44260304) expuesta a una temperatura de 18°C a 33°C aproximadamente, entre los meses de ${S[0].n} a ${s.n} no presenta una variación significativa con respecto a los resultados iniciales.</p><p>A partir del mes de AGOSTO se observa una tendencia de incremento mínimo en los parámetros evaluados, manteniéndose dentro de los límites aceptables y sin diferencias significativas entre los meses subsiguientes.</p><p>Podríamos decir que a condiciones extremas de temperatura durante el almacenamiento, en los meses que faltan para completar los 02 años, damos por concluido el estudio hasta el momento.</p><p>No se presentará deterioro, los otros estudios de vida útil de los demás productos respaldan la decisión optada.</p>`;
  } else {
    txt=`<p>Los resultados microbiológicos obtenidos de la TORTA DE CACAO (Código/Lote: 44260304) expuesta a una temperatura de 18°C a 33°C aproximadamente, en el mes de ${s.n} no presenta una variación significativa con respecto a los resultados iniciales.</p>${s.key==='agosto'?'<p>A partir de este mes se observa un ligero incremento en los valores, el cual se mantiene dentro de los límites aceptables.</p>':''}${['sept','oct','nov','dic'].includes(s.key)?'<p>Los valores se mantienen estables con variaciones mínimas respecto al mes anterior, confirmando la estabilidad del producto.</p>':''}<p>El estudio de vida útil continúa en seguimiento mensual.</p>`;
  }

  return `
<div class="doc-header">
  <div class="doc-header-top">
    <div class="doc-header-left">
      <div class="company-name">EXPORTADORA ROMEX S.A</div>
      <div class="plant-name">PLANTA DE CACAO CHINCHA</div>
      <div class="area-name">Área: Laboratorio de Microbiología</div>
    </div>
    <div class="doc-header-right">
      <div class="code-ref">Código: I-EVUP-R-309</div>
      <div class="edition">Edición: 19</div>
      <div class="edition">Fecha de emisión: 08-01-2026</div>
    </div>
  </div>
  <div class="doc-title-bar">
    <div class="doc-title">ESTUDIO DE VIDA ÚTIL DE TORTA ALCALINA DE CACAO <span class="badge">${s.n}</span></div>
  </div>
</div>

<div class="info-grid">
  <div><div class="info-label">Nombre del Producto</div><div class="info-value" contenteditable="true">Torta de Cacao</div></div>
  <div><div class="info-label">Código / Lote</div><div class="info-value" contenteditable="true">44260304</div></div>
  <div><div class="info-label">Fecha de Producción</div><div class="info-value" contenteditable="true" data-f="fp" data-k="${s.key}">${s.fp}</div></div>
  <div><div class="info-label">Peso de la Muestra</div><div class="info-value" contenteditable="true">2500 GR</div></div>
  <div class="full-span"><div class="info-label">Fecha de Siembra Microbiológica</div><div class="info-value" contenteditable="true" data-f="fs" data-k="${s.key}">${s.fs}</div></div>
</div>

<div class="section">
  <div class="section-title">Resultados Microbiológicos Iniciales de la Muestra</div>
  <div class="table-wrap"><table>
    <thead><tr><th>Fecha Inicial de Siembra</th><th>RTAMV ufc/gr</th><th>Mohos ufc/gr</th><th>E. Coli ufc/gr</th><th>Enterobacterias ufc/gr</th></tr></thead>
    <tbody><tr>
      <td><input type="text" value="${S[0].fs}"></td>
      <td><input type="number" value="${S[0].r}"></td>
      <td><input type="number" value="${S[0].m}"></td>
      <td><input type="number" value="${S[0].e}"></td>
      <td><input type="number" value="${S[0].en}"></td>
    </tr></tbody>
  </table></div>
</div>

<div class="section">
  <div class="section-title">Condiciones de Almacenamiento de la Muestra</div>
  <div class="storage-grid">
    <div class="storage-cell"><div class="storage-cell-label">Temperatura</div><div class="storage-cell-value" contenteditable="true">18°C a 33°C</div></div>
    <div class="storage-cell"><div class="storage-cell-label">Lugar de Almacenaje</div><div class="storage-cell-value" contenteditable="true">ALMACÉN DE EMPAQUE</div></div>
    <div class="storage-cell"><div class="storage-cell-label">Material de Empaque</div><div class="storage-cell-value" contenteditable="true">Bolsa de polietileno</div></div>
    <div class="storage-cell"><div class="storage-cell-label">Humedad Relativa</div><div class="storage-cell-value" contenteditable="true">60% - 75%</div></div>
  </div>
</div>

<div class="section">
  <div class="section-title">Resultados de Análisis Microbiológico de Estudio de Vida Útil</div>
  <div class="table-wrap"><table>
    <thead><tr><th>Fecha de Análisis</th><th>RTAMV ufc/gr</th><th>Mohos ufc/gr</th><th>E. Coli ufc/gr</th><th>Enterobacterias ufc/gr</th><th>% Humedad</th></tr></thead>
    <tbody><tr>
      <td><input type="text" value="${s.fa}" data-f="fa" data-k="${s.key}"></td>
      <td><input type="number" value="${s.r}" data-f="r" data-k="${s.key}"></td>
      <td><input type="number" value="${s.m}" data-f="m" data-k="${s.key}"></td>
      <td><input type="number" value="${s.e}" data-f="e" data-k="${s.key}"></td>
      <td><input type="number" value="${s.en}" data-f="en" data-k="${s.key}"></td>
      <td><input type="number" step="0.01" value="${s.h||0}" data-f="h" data-k="${s.key}"></td>
    </tr></tbody>
  </table></div>
  <div class="pack-note">MATERIAL DE EMPAQUE: BOLSA DE POLIETILENO DE PRIMER USO</div>
</div>

<div class="chart-section">
  <div class="chart-header">
    <div class="chart-header-title">Gráfico Microbiológico</div>
    <div class="toggle">
      <button class="toggle-btn ${M[s.key]==='i'?'active':''}" data-k="${s.key}" data-m="i">Independiente</button>
      <button class="toggle-btn ${M[s.key]==='e'?'active':''}" data-k="${s.key}" data-m="e">Evaluación / Comportamiento</button>
    </div>
  </div>
  <div id="wi-${s.key}" style="display:${M[s.key]==='i'?'block':'none'}">
    <div class="chart-sub">Estudio de Vida Útil de TORTA ALCALINA — Análisis Microbiológicos Realizados el ${s.fa}</div>
    <div class="chart-box"><canvas id="ci-${s.key}"></canvas></div>
  </div>
  <div id="we-${s.key}" style="display:${M[s.key]==='e'?'block':'none'}">
    <div class="chart-sub">Comportamiento Acumulado — Todos los Meses</div>
    <div class="chart-box sm"><canvas id="ce-${s.key}"></canvas></div>
  </div>
</div>

<div class="section">
  <div class="section-title">Interpretación</div>
  <div class="interp-content">
    <div class="interp-month">${s.nm}° MES DE ANÁLISIS DE ESTUDIO DE VIDA ÚTIL</div>
    <div class="interp-sub">RESULTADOS DEL PATRÓN</div>
    <div class="interp-text" contenteditable="true">${txt}</div>
  </div>
</div>

<div class="sig-area">
  <div class="sig-box">
    <div class="sig-label">Analista de Microbiología</div>
    <div class="sig-line"></div>
    <div class="sig-name">Nereyda Huachua Flores</div>
  </div>
</div>`;
}

/* ═══════════════════════════════════ RENDER HUMEDAD (formato imagen 1) ═══════════════════════════════════ */
function renderHumedad(){
  const initialH = S[0] ? (S[0].h || 2.06) : 2.06;
  const initialDate = S[0] ? S[0].fa : '2026/5/14';
  let rows = '';
  S.forEach((s,i)=>{
    rows += `<tr>
      <td contenteditable="true" data-hum-f="fa" data-i="${i}">${s.fa}</td>
      <td contenteditable="true" data-hum-f="h" data-i="${i}">${(s.h||0).toFixed(2)}%</td>
      <td><span class="del-hum" data-i="${i}" title="Eliminar">×</span></td>
    </tr>`;
  });

  return `
<div class="doc-header">
  <div class="doc-header-top">
    <div class="doc-header-left">
      <div class="company-name">EXPORTADORA ROMEX S.A</div>
      <div class="plant-name">PLANTA DE CACAO CHINCHA</div>
      <div class="area-name">Área: Laboratorio de Microbiología</div>
    </div>
    <div class="doc-header-right">
      <div class="code-ref">Código: I-EVUP-R-309</div>
      <div class="edition">Edición: 19</div>
      <div class="edition">Fecha de emisión: 08-01-2026</div>
    </div>
  </div>
  <div class="doc-title-bar">
    <div class="doc-title">ANÁLISIS DE % DE HUMEDAD DE PRODUCTO QUE ESTÁ EN ESTUDIO DE VIDA ÚTIL</div>
  </div>
</div>

<div class="hum-header-info">
  <div class="hum-info-item">
    <div class="hum-info-label">PRODUCTO</div>
    <div class="hum-info-value" contenteditable="true">TORTA ALCALINA DE CACAO</div>
  </div>
  <div class="hum-info-item">
    <div class="hum-info-label">CÓDIGO / LOTE</div>
    <div class="hum-info-value" contenteditable="true">44260304</div>
  </div>
  <div class="hum-info-item">
    <div class="hum-info-label">FECHA INICIAL DE ESTUDIO DE VIDA</div>
    <div class="hum-info-value" contenteditable="true">${initialDate}</div>
  </div>
  <div class="hum-info-item">
    <div class="hum-info-label">% HUMEDAD INICIAL</div>
    <div class="hum-info-value" contenteditable="true">${initialH.toFixed(2)}%</div>
  </div>
</div>

<div class="hum-table-wrap">
  <div class="hum-table-title">Registro de % Humedad Obtenida</div>
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th style="width:40%">FECHA</th>
          <th style="width:40%">% HUMEDAD OBTENIDA</th>
          <th style="width:20%"></th>
        </tr>
      </thead>
      <tbody id="hum-tbody">
        ${rows}
      </tbody>
    </table>
  </div>
  <div class="add-hum-row">
    <input type="text" id="newHumFecha" placeholder="Fecha (YYYY/M/D)">
    <input type="number" id="newHumValor" step="0.01" placeholder="% Humedad">
    <button class="add-hum-btn" onclick="addHumedadRow()">+ Agregar</button>
  </div>
</div>

<div class="chart-section">
  <div class="chart-header">
    <div class="chart-header-title">Evolución de % Humedad</div>
  </div>
  <div class="chart-sub">Comportamiento de humedad durante el estudio de vida útil</div>
  <div class="chart-box"><canvas id="chart-humedad"></canvas></div>
</div>

<div class="section">
  <div class="section-title">Interpretación de Humedad</div>
  <div class="interp-content">
    <div class="interp-text" contenteditable="true">
      <p>Los valores de % de humedad de la TORTA ALCALINA DE CACAO (Lote 44260304) se mantienen estables a lo largo del estudio de vida útil, con variaciones mínimas que no superan el rango de control establecido.</p>
      <p>La humedad inicial de ${initialH.toFixed(2)}% y los valores posteriores confirman que el producto no presenta cambios significativos que afecten su calidad ni su vida útil bajo las condiciones de almacenamiento evaluadas (18°C – 33°C / HR 60-75%).</p>
    </div>
  </div>
</div>

<div class="sig-area">
  <div class="sig-box">
    <div class="sig-label">Analista de Microbiología</div>
    <div class="sig-line"></div>
    <div class="sig-name">Nereyda Huachua Flores</div>
  </div>
</div>
`;
}
