/* Gestión de usuarios + permisos granulares — solo admin y rodrigo */
'use strict';

(function () {
  function $(id) { return document.getElementById(id); }

  var cachedUser = null;

  async function getLoginUser() {
    if (cachedUser) return cachedUser;
    try {
      if (typeof api === 'function') {
        var me = await api('/me');
        if (me && me.user) {
          cachedUser = String(me.user).toLowerCase();
          var store = localStorage.getItem('romex_token') ? localStorage : sessionStorage;
          store.setItem('romex_user_login', cachedUser);
          return cachedUser;
        }
      }
    } catch (e) {}
    var u = (localStorage.getItem('romex_user_login') ||
             localStorage.getItem('romex_user') ||
             sessionStorage.getItem('romex_user_login') ||
             sessionStorage.getItem('romex_user') || '').toLowerCase();
    if (u === 'administrador') u = 'admin';
    if (u.indexOf('rodrigo') === 0) u = 'rodrigo';
    cachedUser = u;
    return u;
  }

  async function isSuperUser() {
    var u = await getLoginUser();
    return u === 'admin' || u === 'rodrigo';
  }

  async function showUsersBtn() {
    var btn = $('usersBtn');
    if (!btn) return;
    btn.hidden = !(await isSuperUser());
  }

  window.openUsersModal = async function () {
    if (!(await isSuperUser())) {
      if (typeof snack === 'function') snack('Sin permiso');
      return;
    }
    if (typeof openModal === 'function') openModal('modalUsers');
    await loadUsersList();
  };

  function permFromRow(r) {
    var p = r.permisos || {};
    return {
      ver_micro: p.ver_micro !== false,
      ver_fisico: p.ver_fisico !== false,
      editar: p.editar === true || (r.rol === 'ADMIN' && p.editar !== false),
      mes_desde: p.mes_desde || 1,
      mes_hasta: p.mes_hasta || 12
    };
  }

  function monthOpts(sel) {
    var names = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    var h = '';
    for (var i = 1; i <= 12; i++) {
      h += '<option value="' + i + '"' + (i === sel ? ' selected' : '') + '>' + names[i] + '</option>';
    }
    return h;
  }

  async function loadUsersList() {
    var box = $('usersList');
    if (!box) return;
    box.innerHTML = 'Cargando…';
    try {
      var rows = await api('/usuarios');
      if (!rows.length) {
        box.innerHTML = '<p>No hay usuarios.</p>';
        return;
      }
      var html = '';
      rows.forEach(function (r) {
        var activo = r.activo === true || r.activo === 1 || r.activo === '1';
        var p = permFromRow(r);
        html += '<div class="user-card" data-id="' + r.id + '" style="border:1px solid #e0e0e0;border-radius:12px;padding:12px 14px;margin-bottom:12px;background:var(--md-surface-1,#fff)">' +
          '<div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:10px">' +
          '<strong style="min-width:90px">' + (r.usuario || '') + '</strong>' +
          '<span style="color:#666;font-size:13px">' + (r.nombre || '') + '</span>' +
          '<select class="user-rol" data-id="' + r.id + '" style="font-size:12px;padding:4px 8px;border-radius:6px">' +
          '<option value="ADMIN"' + (r.rol === 'ADMIN' ? ' selected' : '') + '>ADMIN</option>' +
          '<option value="LECTOR"' + (r.rol === 'LECTOR' ? ' selected' : '') + '>LECTOR</option>' +
          '</select>' +
          '<span style="font-size:12px">' + (activo ? '<span style="color:#2e7d32">● Activo</span>' : '<span style="color:#c62828">● Inactivo</span>') + '</span>' +
          '<button type="button" class="btn-ghost user-toggle" data-id="' + r.id + '" data-activo="' + (activo ? '1' : '0') + '" style="font-size:12px;padding:4px 8px">' +
          (activo ? 'Desactivar' : 'Activar') + '</button>' +
          '<button type="button" class="btn-ghost user-pass" data-id="' + r.id + '" style="font-size:12px;padding:4px 8px">Clave</button>' +
          '</div>' +
          '<div style="display:flex;flex-wrap:wrap;gap:12px 18px;font-size:13px;align-items:center;padding:8px 0;border-top:1px solid #eee">' +
          '<label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" class="perm-check" data-id="' + r.id + '" data-k="ver_micro"' + (p.ver_micro ? ' checked' : '') + '> Microbiología</label>' +
          '<label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" class="perm-check" data-id="' + r.id + '" data-k="ver_fisico"' + (p.ver_fisico ? ' checked' : '') + '> Físicoquímico</label>' +
          '<label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" class="perm-check" data-id="' + r.id + '" data-k="editar"' + (p.editar ? ' checked' : '') + '> Puede editar</label>' +
          '<label style="display:flex;align-items:center;gap:6px">Meses: ' +
          '<select class="perm-mes" data-id="' + r.id + '" data-k="mes_desde">' + monthOpts(p.mes_desde) + '</select>' +
          ' → ' +
          '<select class="perm-mes" data-id="' + r.id + '" data-k="mes_hasta">' + monthOpts(p.mes_hasta) + '</select>' +
          '</label>' +
          '<button type="button" class="btn-primary perm-save" data-id="' + r.id + '" style="font-size:12px;padding:6px 12px">Guardar permisos</button>' +
          '</div></div>';
      });
      box.innerHTML = html;
    } catch (e) {
      box.innerHTML = '<p style="color:#c62828">' + (e.message || e) + '</p>';
    }
  }

  function collectPermisos(id) {
    var card = document.querySelector('.user-card[data-id="' + id + '"]');
    if (!card) return null;
    var get = function (k) {
      var el = card.querySelector('.perm-check[data-k="' + k + '"]');
      return el ? el.checked : true;
    };
    var getMes = function (k) {
      var el = card.querySelector('.perm-mes[data-k="' + k + '"]');
      return el ? parseInt(el.value, 10) : (k === 'mes_desde' ? 1 : 12);
    };
    return {
      ver_micro: get('ver_micro'),
      ver_fisico: get('ver_fisico'),
      editar: get('editar'),
      mes_desde: getMes('mes_desde'),
      mes_hasta: getMes('mes_hasta')
    };
  }

  async function createUser() {
    var usuario = ($('newUserUser') || {}).value || '';
    var nombre = ($('newUserNombre') || {}).value || '';
    var password = ($('newUserPass') || {}).value || '';
    var rol = ($('newUserRol') || {}).value || 'LECTOR';
    var permisos = {
      ver_micro: ($('newPermMicro') || {}).checked !== false,
      ver_fisico: ($('newPermFisico') || {}).checked !== false,
      editar: ($('newPermEdit') || {}).checked === true,
      mes_desde: parseInt(($('newPermDesde') || {}).value || '1', 10),
      mes_hasta: parseInt(($('newPermHasta') || {}).value || '12', 10)
    };
    try {
      await api('/usuarios', {
        method: 'POST',
        body: JSON.stringify({ usuario: usuario, nombre: nombre, password: password, rol: rol, permisos: permisos })
      });
      if (typeof snack === 'function') snack('Usuario creado');
      $('newUserUser').value = '';
      $('newUserNombre').value = '';
      $('newUserPass').value = '';
      await loadUsersList();
    } catch (e) {
      if (typeof snack === 'function') snack(e.message);
      else alert(e.message);
    }
  }

  async function updateUser(id, body) {
    try {
      await api('/usuarios/' + id, { method: 'PUT', body: JSON.stringify(body) });
      if (typeof snack === 'function') snack('Actualizado');
      await loadUsersList();
    } catch (e) {
      if (typeof snack === 'function') snack(e.message);
      else alert(e.message);
    }
  }

  document.addEventListener('click', function (e) {
    if (e.target.closest('#usersBtn')) { window.openUsersModal(); return; }
    if (e.target.closest('#saveNewUserBtn')) { createUser(); return; }
    var tog = e.target.closest('.user-toggle');
    if (tog) {
      updateUser(tog.getAttribute('data-id'), { activo: tog.getAttribute('data-activo') !== '1' });
      return;
    }
    var passBtn = e.target.closest('.user-pass');
    if (passBtn) {
      var np = prompt('Nueva contraseña (mín. 4 caracteres):');
      if (np && np.length >= 4) updateUser(passBtn.getAttribute('data-id'), { password: np });
      else if (np) alert('Mínimo 4 caracteres');
      return;
    }
    var saveP = e.target.closest('.perm-save');
    if (saveP) {
      var id = saveP.getAttribute('data-id');
      var permisos = collectPermisos(id);
      if (permisos) updateUser(id, { permisos: permisos });
      return;
    }
  });

  document.addEventListener('change', function (e) {
    if (e.target && e.target.classList.contains('user-rol')) {
      updateUser(e.target.getAttribute('data-id'), { rol: e.target.value });
    }
  });

  setInterval(function () { showUsersBtn(); }, 2000);
  setTimeout(function () { showUsersBtn(); }, 600);
  setTimeout(function () { showUsersBtn(); }, 1500);
})();
