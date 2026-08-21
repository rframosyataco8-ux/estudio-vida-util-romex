/* Romex QC — app principal */
'use strict';

Chart.register(ChartDataLabels);

var API = (window.API_BASE || '') + '/api';
var MONTH_NAMES = ['', 'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
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
var userRol = localStorage.getItem('romex_rol') || 'LECTOR';
var isAdmin = userRol === 'ADMIN';

var MICRO_KEYS = ['rtamv', 'mohos', 'coliformes', 'ecoli', 'enterobacterias', 'levaduras', 'saureus'];
var MICRO_LABELS = {
  rtamv: 'RTAMV',
  mohos: 'Mohos',
  coliformes: 'Colif.',
  ecoli: 'E.Coli',
  enterobacterias: 'Enterob.',
  levaduras: 'Levad.',
  saureus: 'S.Aur.'
};
var FISICO_LABELS = {
  humedad: '% Humedad',
  ph: 'pH',
  ceniza: '% Ceniza',
  grasa: '% Grasa',
  fineza: '% Fineza',
  acidez: '% Acidez'
};
var COLORS = {
  rtamv: '#1565c0',
  mohos: '#ef6c00',
  coliformes: '#2e7d32',
  ecoli: '#43a047',
  enterobacterias: '#7b1fa2',
  levaduras: '#c2185b',
  saureus: '#c62828',
  humedad: '#1565c0',
  ph: '#0288d1',
  ceniza: '#78909c',
  grasa: '#f9a825',
  fineza: '#2e7d32',
  acidez: '#e53935'
};

function getToken() {
  return localStorage.getItem('romex_token') || sessionStorage.getItem('romex_token') || '';
}

function clearSession() {
  localStorage.removeItem('romex_token');
  localStorage.removeItem('romex_user');
  localStorage.removeItem('romex_rol');
  sessionStorage.removeItem('romex_token');
  sessionStorage.removeItem('romex_user');
  sessionStorage.removeItem('romex_rol');
}

function hideSplash() {
  var s = document.getElementById('splash');
  if (s) {
    setTimeout(function () {
      s.classList.add('hide');
    }, 1200);
  }
}

function showSplashReady() {
  document.documentElement.classList.remove('romex-boot');
  document.documentElement.classList.add('romex-ready');
}

async function api(path, opts) {
  opts = opts || {};
  opts.headers = opts.headers || {};
  opts.headers.Authorization = 'Bearer ' + getToken();
  if (opts.body && !opts.headers['Content-Type']) {
    opts.headers['Content-Type'] = 'application/json';
  }
  var r = await fetch(API + path, opts);
  if (r.status === 401) {
    clearSession();
    location.href = 'login.html';
    throw new Error('Sesión expirada');
  }
  if (!r.ok) {
    var t = await r.text();
    var msg = t;
    try {
      msg = JSON.parse(t).error || t;
    } catch (e) {
      /* ignore */
    }
    throw new Error(msg || r.statusText);
  }
  if (r.status === 204) return null;
  return r.json();
}

function setSaveInd(state, text) {
  var el = document.getElementById('saveInd');
  if (!el) return;
  el.className = 'save-indicator ' + (state || '');
  el.textContent = text || '';
}

function snack(msg) {
  var el = document.getElementById('snackbar');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(function () {
    el.classList.remove('show');
  }, 2800);
}

function applyRoleUI() {
  isAdmin = userRol === 'ADMIN';
  document.querySelectorAll('.admin-only').forEach(function (el) {
    el.hidden = !isAdmin;
  });
  var roleLabel = document.getElementById('userRoleLabel');
  if (roleLabel) {
    roleLabel.textContent = isAdmin
      ? 'Administrador · Planta Chincha'
      : 'Solo lectura · Planta Chincha';
  }
}

function toggleDrawer() {
  var drawer = document.getElementById('drawer');
  var app = document.getElementById('app');
  var open = !drawer.classList.contains('open');
  drawer.classList.toggle('open', open);
  drawer.classList.toggle('collapsed', !open);
  app.classList.toggle('drawer-collapsed', !open);
}

function toggleProductsMenu() {
  var btn = document.getElementById('productsToggle');
  var nav = document.getElementById('productNav');
  if (!btn || !nav) return;
  var open = !nav.classList.contains('open');
  nav.classList.toggle('open', open);
  btn.classList.toggle('open', open);
  btn.setAttribute('aria-expanded', open ? 'true' : 'false');
}

function openModal(id) {
  var el = document.getElementById(id);
  if (el) el.hidden = false;
}

function closeModal(id) {
  var el = document.getElementById(id);
  if (el) el.hidden = true;
}

async function init() {
  if (!getToken()) {
    location.replace('login.html');
    return;
  }

  showSplashReady();

  var un = localStorage.getItem('romex_user');
  if (un) document.getElementById('userName').textContent = un;
  applyRoleUI();

  var drawer = document.getElementById('drawer');
  var app = document.getElementById('app');
  if (window.innerWidth > 960) {
    drawer.classList.add('open');
    drawer.classList.remove('collapsed');
    app.classList.remove('drawer-collapsed');
  } else {
    drawer.classList.remove('open');
    drawer.classList.add('collapsed');
  }

  try {
    var me = await api('/me');
    userRol = me.rol || 'LECTOR';
    localStorage.setItem('romex_rol', userRol);
    document.getElementById('userName').textContent = me.nombre || me.user;
    applyRoleUI();

    await api('/health');
    products = await api('/productos');
    if (!products.length) {
      throw new Error('No hay productos. Ejecuta el script SQL.');
    }
    sqlReady = true;
    activeCodigo = products[0].codigo;
    document.getElementById('dbStatus').innerHTML =
      '<span class="dot"></span> SQL Server conectado';
    renderNav();
    await loadAndShow();
    hideSplash();
  } catch (e) {
    if (String(e.message).indexOf('Sesión') >= 0) return;
    hideSplash();
    document.getElementById('dbStatus').innerHTML =
      '<span class="dot" style="background:#c62828"></span> Sin conexión';
    document.getElementById('content').innerHTML =
      '<div class="loading"><strong>No se pudo conectar</strong><br><small>' +
      e.message +
      '</small><br><br>1. Ejecuta sql/02_roles_usuarios.sql en SSMS<br>2. npm install && npm start en server/<br>3. Revisa .env</div>';
  }
}

function renderNav() {
  document.getElementById('productNav').innerHTML = products.map(function (p) {
    return (
      '<button type="button" class="nav-item' +
      (p.codigo === activeCodigo ? ' active' : '') +
      '" data-c="' +
      p.codigo +
      '">' +
      p.nombre +
      '<span class="lote">Lote ' +
      p.lote +
      '</span></button>'
    );
  }).join('');
}

function renderTabs() {
  var months = [];
  microRows.concat(fisicoRows).forEach(function (r) {
    if (months.indexOf(r.mes) < 0) months.push(r.mes);
  });
  months.sort(function (a, b) {
    return a - b;
  });
  if (months.indexOf(activeMonth) < 0 && months.length) {
    activeMonth = months[0];
  }
  document.getElementById('monthTabs').innerHTML = months.map(function (m) {
    return (
      '<button type="button" class="tab' +
      (m === activeMonth ? ' active' : '') +
      '" data-m="' +
      m +
      '">' +
      MONTH_NAMES[m] +
      '</button>'
    );
  }).join('');
}

async function loadAndShow() {
  document.getElementById('content').innerHTML =
    '<div class="loading"><div class="spinner"></div> Cargando…</div>';
  var p = products.find(function (x) {
    return x.codigo === activeCodigo;
  });
  document.getElementById('productTitle').textContent = p.nombre;
  document.getElementById('loteBadge').textContent = 'Lote ' + p.lote;
  document.querySelectorAll('.seg').forEach(function (b) {
    b.classList.toggle('active', b.dataset.mode === activeMode);
  });
  microRows = await api('/productos/' + activeCodigo + '/micro?anio=2026');
  fisicoRows = await api('/productos/' + activeCodigo + '/fisico?anio=2026');
  renderTabs();
  if (activeMode === 'micro') renderMicro(p);
  else renderFisico(p);
}

function rowFor(mode) {
  var rows = mode === 'micro' ? microRows : fisicoRows;
  return rows.find(function (r) {
    return r.mes === activeMonth;
  }) || null;
}

function inputDisabledAttr() {
  return isAdmin ? '' : ' disabled';
}

function renderMicro(p) {
  var d = rowFor('micro');
  if (!d) {
    document.getElementById('content').innerHTML =
      '<div class="loading">Sin datos micro este mes</div>';
    return;
  }
  var date = d.fecha_analisis ? String(d.fecha_analisis).slice(0, 10) : '—';
  var dis = inputDisabledAttr();
  var headNote = isAdmin
    ? ' <span style="font-size:10px">auto-guarda</span>'
    : ' <span style="font-size:10px">solo lectura</span>';
  document.getElementById('content').innerHTML =
    '<div class="card full"><div class="doc-bar"><div><div class="doc-co">EXPORTADORA ROMEX S.A.</div><div class="doc-pl">Planta Cacao Chincha · Microbiología</div></div><div class="doc-meta">I-EVUP-R-309</div></div>' +
    '<div class="doc-head">Análisis Microbiológico · ' + p.nombre + ' · ' + MONTH_NAMES[activeMonth] + ' 2026</div>' +
    '<div class="info-grid"><div class="info-cell"><div class="info-lbl">Producto</div><div class="info-val">' + p.nombre + '</div></div>' +
    '<div class="info-cell"><div class="info-lbl">Lote</div><div class="info-val">' + p.lote + '</div></div>' +
    '<div class="info-cell"><div class="info-lbl">Fecha</div><div class="info-val">' + date + '</div></div>' +
    '<div class="info-cell"><div class="info-lbl">Estado</div><div class="info-val"><span class="badge">' + (d.estado || 'LIBERADO') + '</span></div></div></div></div>' +
    '<div class="card"><div class="card-title">Resultados (ufc/gr)' + headNote + '</div>' +
    '<div class="table-wrap"><table><thead><tr>' +
    MICRO_KEYS.map(function (k) {
      return '<th>' + MICRO_LABELS[k] + '</th>';
    }).join('') +
    '</tr></thead><tbody><tr>' +
    MICRO_KEYS.map(function (k) {
      return '<td><input type="number" data-f="' + k + '" value="' + (d[k] || 0) + '"' + dis + '></td>';
    }).join('') +
    '</tr></tbody></table></div></div>' +
    '<div class="card"><div class="card-title">Gráfico</div><div class="chart-box"><canvas id="cMain"></canvas></div></div>' +
    '<div class="card full"><div class="card-title">Tendencia</div><div class="chart-box sm"><canvas id="cTrend"></canvas></div></div>' +
    '<div class="card full"><div class="card-title">Interpretación</div><div class="interp"><strong>' +
    p.nombre +
    '</strong> · ' +
    MONTH_NAMES[activeMonth] +
    ' 2026 · <strong>LIBERADO</strong></div>' +
    '<div class="sig"><div class="sig-box"><div class="sig-lbl">Analista</div><div class="sig-line"></div><div class="sig-name">Nereyda Huachua Flores</div></div></div></div>';
  setTimeout(function () {
    drawMicroBar(d);
    drawMicroTrend();
  }, 20);
}

function fisicoFields(d) {
  return ['humedad', 'ph', 'ceniza', 'grasa', 'fineza', 'acidez'].filter(function (k) {
    return d[k] != null && d[k] !== '';
  });
}

function renderFisico(p) {
  var d = rowFor('fisico');
  if (!d) {
    document.getElementById('content').innerHTML =
      '<div class="loading">Sin datos físico este mes</div>';
    return;
  }
  var fields = fisicoFields(d);
  var date = d.fecha_analisis ? String(d.fecha_analisis).slice(0, 10) : '—';
  var dis = inputDisabledAttr();
  var headNote = isAdmin
    ? ' <span style="font-size:10px">auto-guarda</span>'
    : ' <span style="font-size:10px">solo lectura</span>';
  document.getElementById('content').innerHTML =
    '<div class="card full"><div class="doc-bar"><div><div class="doc-co">EXPORTADORA ROMEX S.A.</div><div class="doc-pl">Físicoquímico</div></div><div class="doc-meta">I-EVUP-R-309</div></div>' +
    '<div class="doc-head">Análisis Físicoquímico · ' + p.nombre + ' · ' + MONTH_NAMES[activeMonth] + ' 2026</div>' +
    '<div class="info-grid"><div class="info-cell"><div class="info-lbl">Producto</div><div class="info-val">' + p.nombre + '</div></div>' +
    '<div class="info-cell"><div class="info-lbl">Lote</div><div class="info-val">' + p.lote + '</div></div>' +
    '<div class="info-cell"><div class="info-lbl">Fecha</div><div class="info-val">' + date + '</div></div>' +
    '<div class="info-cell"><div class="info-lbl">Estado</div><div class="info-val"><span class="badge">' + (d.estado || 'CONFORME') + '</span></div></div></div></div>' +
    '<div class="card"><div class="card-title">Resultados' + headNote + '</div>' +
    '<div class="table-wrap"><table><thead><tr>' +
    fields.map(function (k) {
      return '<th>' + FISICO_LABELS[k] + '</th>';
    }).join('') +
    '</tr></thead><tbody><tr>' +
    fields.map(function (k) {
      return '<td><input type="number" step="0.01" data-f="' + k + '" value="' + d[k] + '"' + dis + '></td>';
    }).join('') +
    '</tr></tbody></table></div></div>' +
    '<div class="card"><div class="card-title">Gráfico</div><div class="chart-box"><canvas id="cMain"></canvas></div></div>' +
    '<div class="card full"><div class="card-title">Tendencia % Humedad</div><div class="chart-box sm"><canvas id="cTrend"></canvas></div></div>' +
    '<div class="card full"><div class="card-title">Interpretación</div><div class="interp"><strong>' +
    p.nombre +
    '</strong> · ' +
    MONTH_NAMES[activeMonth] +
    ' 2026 · <strong>CONFORME</strong></div>' +
    '<div class="sig"><div class="sig-box"><div class="sig-lbl">Analista</div><div class="sig-line"></div><div class="sig-name">Nereyda Huachua Flores</div></div></div></div>';
  setTimeout(function () {
    drawFisicoBar(d, fields);
    drawHumTrend();
  }, 20);
}

function destroyCharts() {
  if (chartMain) {
    chartMain.destroy();
    chartMain = null;
  }
  if (chartTrend) {
    chartTrend.destroy();
    chartTrend = null;
  }
}

function drawMicroBar(d) {
  destroyCharts();
  var cv = document.getElementById('cMain');
  if (!cv) return;
  chartMain = new Chart(cv, {
    type: 'bar',
    data: {
      labels: MICRO_KEYS.map(function (k) {
        return MICRO_LABELS[k];
      }),
      datasets: [
        {
          data: MICRO_KEYS.map(function (k) {
            return d[k] || 0;
          }),
          backgroundColor: MICRO_KEYS.map(function (k) {
            return COLORS[k];
          }),
          borderRadius: 6,
          barPercentage: 0.55
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        datalabels: {
          color: '#424242',
          anchor: 'end',
          align: 'end',
          font: { size: 10 },
          formatter: function (v) {
            return v || '0';
          }
        }
      },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true, grid: { color: '#eef1f5' } }
      }
    }
  });
}

function drawMicroTrend() {
  var cv = document.getElementById('cTrend');
  if (!cv) return;
  chartTrend = new Chart(cv, {
    type: 'line',
    data: {
      labels: microRows.map(function (r) {
        return MONTH_NAMES[r.mes];
      }),
      datasets: [
        {
          label: 'RTAMV',
          data: microRows.map(function (r) {
            return r.rtamv;
          }),
          borderColor: COLORS.rtamv,
          fill: true,
          tension: 0.35,
          pointRadius: 4
        },
        {
          label: 'Mohos',
          data: microRows.map(function (r) {
            return r.mohos;
          }),
          borderColor: COLORS.mohos,
          fill: true,
          tension: 0.35,
          pointRadius: 4,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' },
        datalabels: { display: false }
      },
      scales: {
        y: { position: 'left' },
        y1: {
          position: 'right',
          grid: { drawOnChartArea: false },
          beginAtZero: true
        }
      }
    }
  });
}

function drawFisicoBar(d, fields) {
  destroyCharts();
  var cv = document.getElementById('cMain');
  if (!cv) return;
  chartMain = new Chart(cv, {
    type: 'bar',
    data: {
      labels: fields.map(function (k) {
        return FISICO_LABELS[k];
      }),
      datasets: [
        {
          data: fields.map(function (k) {
            return +d[k];
          }),
          backgroundColor: fields.map(function (k) {
            return COLORS[k] || '#1565c0';
          }),
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        datalabels: {
          color: '#424242',
          anchor: 'end',
          align: 'end',
          formatter: function (v) {
            return (+v).toFixed(2);
          }
        }
      },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true }
      }
    }
  });
}

function drawHumTrend() {
  var cv = document.getElementById('cTrend');
  if (!cv) return;
  chartTrend = new Chart(cv, {
    type: 'line',
    data: {
      labels: fisicoRows.map(function (r) {
        return MONTH_NAMES[r.mes];
      }),
      datasets: [
        {
          data: fisicoRows.map(function (r) {
            return +r.humedad || 0;
          }),
          borderColor: COLORS.humedad,
          fill: true,
          tension: 0.35,
          pointRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        datalabels: {
          color: COLORS.humedad,
          anchor: 'end',
          align: 'top',
          formatter: function (v) {
            return v.toFixed(2) + '%';
          }
        }
      }
    }
  });
}

function scheduleAutoSave() {
  if (!sqlReady || !isAdmin) return;
  setSaveInd('saving', 'Guardando…');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(autoSave, 800);
}

async function autoSave() {
  var inputs = document.querySelectorAll('td input[data-f]');
  if (!inputs.length || !sqlReady || !isAdmin) return;
  var body = {};
  inputs.forEach(function (inp) {
    body[inp.dataset.f] = parseFloat(inp.value) || 0;
  });
  try {
    await api(
      '/productos/' + activeCodigo + '/' + activeMode + '/' + activeMonth + '?anio=2026',
      { method: 'PUT', body: JSON.stringify(body) }
    );
    setSaveInd('saved', 'Guardado');
    setTimeout(function () {
      setSaveInd('', '');
    }, 2500);
  } catch (e) {
    setSaveInd('', '');
    snack('Error al guardar: ' + e.message);
  }
}

function openAddMonthModal() {
  if (!isAdmin || !activeCodigo) return;
  var existing = {};
  microRows.forEach(function (r) {
    existing[r.mes] = true;
  });
  var next = null;
  for (var m = 1; m <= 12; m++) {
    if (!existing[m]) {
      next = m;
      break;
    }
  }
  if (!next) {
    snack('Ya existen los 12 meses');
    return;
  }
  document.getElementById('mesAnio').value = 2026;
  document.getElementById('mesNumero').value = String(next);
  document.getElementById('mesFecha').value =
    '2026-' + String(next).padStart(2, '0') + '-15';
  ['rtamv', 'mohos', 'coliformes', 'ecoli', 'enterobacterias', 'levaduras', 'saureus'].forEach(
    function (k) {
      document.getElementById('m_' + k).value = 0;
    }
  );
  document.getElementById('f_humedad').value = 0;
  document.getElementById('f_ph').value = 0;
  document.getElementById('f_ceniza').value = 0;
  document.getElementById('f_grasa').value = 0;
  document.getElementById('f_fineza').value = '';
  document.getElementById('f_acidez').value = '';
  openModal('modalMes');
}

async function saveMonth() {
  if (!isAdmin) return;
  var anio = parseInt(document.getElementById('mesAnio').value, 10);
  var mes = parseInt(document.getElementById('mesNumero').value, 10);
  var fecha = document.getElementById('mesFecha').value;

  if (!anio || anio < 2020 || anio > 2099) {
    snack('Año inválido');
    return;
  }
  if (!mes || mes < 1 || mes > 12) {
    snack('Selecciona un mes válido');
    return;
  }
  if (!fecha) {
    snack('Indica la fecha de análisis');
    return;
  }

  var body = {
    anio: anio,
    mes: mes,
    fecha: fecha,
    micro: {
      rtamv: +document.getElementById('m_rtamv').value || 0,
      mohos: +document.getElementById('m_mohos').value || 0,
      coliformes: +document.getElementById('m_coliformes').value || 0,
      ecoli: +document.getElementById('m_ecoli').value || 0,
      enterobacterias: +document.getElementById('m_enterobacterias').value || 0,
      levaduras: +document.getElementById('m_levaduras').value || 0,
      saureus: +document.getElementById('m_saureus').value || 0
    },
    fisico: {
      humedad: document.getElementById('f_humedad').value !== '' ? +document.getElementById('f_humedad').value : null,
      ph: document.getElementById('f_ph').value !== '' ? +document.getElementById('f_ph').value : null,
      ceniza: document.getElementById('f_ceniza').value !== '' ? +document.getElementById('f_ceniza').value : null,
      grasa: document.getElementById('f_grasa').value !== '' ? +document.getElementById('f_grasa').value : null,
      fineza: document.getElementById('f_fineza').value !== '' ? +document.getElementById('f_fineza').value : null,
      acidez: document.getElementById('f_acidez').value !== '' ? +document.getElementById('f_acidez').value : null
    }
  };
  try {
    await api('/productos/' + activeCodigo + '/mes', {
      method: 'POST',
      body: JSON.stringify(body)
    });
    closeModal('modalMes');
    snack('Mes ' + MONTH_NAMES[mes] + ' agregado');
    activeMonth = mes;
    await loadAndShow();
  } catch (e) {
    snack(e.message);
  }
}

async function saveProduct() {
  if (!isAdmin) return;
  var nombre = document.getElementById('prodNombre').value.trim();
  var lote = document.getElementById('prodLote').value.trim();
  var codigo = document.getElementById('prodCodigo').value.trim();

  if (!nombre || nombre.length < 2) {
    snack('Nombre obligatorio (mín. 2 caracteres)');
    document.getElementById('prodNombre').focus();
    return;
  }
  if (!lote || lote.length < 2) {
    snack('Lote obligatorio (mín. 2 caracteres)');
    document.getElementById('prodLote').focus();
    return;
  }
  if (codigo && !/^[a-zA-Z0-9_]+$/.test(codigo)) {
    snack('Código solo letras, números y _');
    document.getElementById('prodCodigo').focus();
    return;
  }

  try {
    var created = await api('/productos', {
      method: 'POST',
      body: JSON.stringify({
        nombre: nombre,
        lote: lote,
        codigo: codigo || undefined
      })
    });
    closeModal('modalProducto');
    snack('Producto creado');
    products = await api('/productos');
    activeCodigo = created.codigo;
    renderNav();
    document.getElementById('productNav').classList.add('open');
    document.getElementById('productsToggle').classList.add('open');
    await loadAndShow();
  } catch (e) {
    snack(e.message);
  }
}

document.addEventListener('click', function (e) {
  if (e.target.closest('#logoutBtn')) {
    var token = getToken();
    fetch(API + '/logout', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token }
    }).finally(function () {
      clearSession();
      location.href = 'login.html';
    });
    return;
  }
  if (e.target.closest('#menuBtn')) {
    toggleDrawer();
    return;
  }
  if (e.target.closest('#productsToggle')) {
    toggleProductsMenu();
    return;
  }
  if (e.target.closest('#addMonthBtn')) {
    openAddMonthModal();
    return;
  }
  if (e.target.closest('#addProductBtn')) {
    document.getElementById('prodNombre').value = '';
    document.getElementById('prodLote').value = '';
    document.getElementById('prodCodigo').value = '';
    openModal('modalProducto');
    return;
  }
  if (e.target.closest('#saveMesBtn')) {
    saveMonth();
    return;
  }
  if (e.target.closest('#saveProdBtn')) {
    saveProduct();
    return;
  }
  var closeId = e.target.getAttribute('data-close');
  if (closeId) {
    closeModal(closeId);
    return;
  }
  if (e.target.classList.contains('modal-backdrop')) {
    e.target.hidden = true;
    return;
  }

  var ni = e.target.closest('.nav-item');
  if (ni && sqlReady) {
    activeCodigo = ni.dataset.c;
    activeMonth = 5;
    renderNav();
    loadAndShow().catch(function (err) {
      snack(err.message);
    });
    return;
  }
  var tab = e.target.closest('.tab');
  if (tab && sqlReady) {
    activeMonth = +tab.dataset.m;
    var p = products.find(function (x) {
      return x.codigo === activeCodigo;
    });
    renderTabs();
    if (activeMode === 'micro') renderMicro(p);
    else renderFisico(p);
    return;
  }
  var seg = e.target.closest('.seg');
  if (seg && sqlReady) {
    activeMode = seg.dataset.mode;
    var p2 = products.find(function (x) {
      return x.codigo === activeCodigo;
    });
    document.querySelectorAll('.seg').forEach(function (b) {
      b.classList.toggle('active', b.dataset.mode === activeMode);
    });
    if (activeMode === 'micro') renderMicro(p2);
    else renderFisico(p2);
  }
});

document.addEventListener('input', function (e) {
  if (!isAdmin) return;
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
