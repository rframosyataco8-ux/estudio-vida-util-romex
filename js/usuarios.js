/* Gestión de usuarios — solo visible para admin y rodrigo */
'use strict';

(function () {
  function $(id) { return document.getElementById(id); }

  var cachedUser = null;

  async function getLoginUser() {
    if (cachedUser) return cachedUser;
    // Preferir lo que devuelve el servidor (usuario real, no el nombre)
    try {
      if (typeof api === 'function') {
        var me = await api('/me');
        if (me && me.user) {
          cachedUser = String(me.user).toLowerCase();
          // Guardar también el usuario real para la próxima vez
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
    // Si guardaron el nombre en vez del usuario, mapear casos conocidos
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
    var ok = await isSuperUser();
    btn.hidden = !ok;
  }

  window.openUsersModal = async function () {
    var ok = await isSuperUser();
    if (!ok) {
      if (typeof snack === 'function') snack('Sin permiso');
      return;
    }
    if (typeof openModal === 'function') openModal('modalUsers');
    await loadUsersList();
  };

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
      var html = '<table class="audit-table" style="width:100%;font-size:13px"><thead><tr>' +
        '<th>Usuario</th><th>Nombre</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>';
      rows.forEach(function (r) {
        var activo = r.activo === true || r.activo === 1 || r.activo === '1';
        html += '<tr data-id="' + r.id + '">' +
          '<td><strong>' + (r.usuario || '') + '</strong></td>' +
          '<td>' + (r.nombre || '') + '</td>' +
          '<td>' +
          '<select class="user-rol" data-id="' + r.id + '">' +
          '<option value="ADMIN"' + (r.rol === 'ADMIN' ? ' selected' : '') + '>ADMIN</option>' +
          '<option value="LECTOR"' + (r.rol === 'LECTOR' ? ' selected' : '') + '>LECTOR</option>' +
          '</select></td>' +
          '<td>' + (activo ? '<span style="color:#2e7d32">Activo</span>' : '<span style="color:#c62828">Inactivo</span>') + '</td>' +
          '<td style="white-space:nowrap">' +
          '<button type="button" class="btn-ghost user-toggle" data-id="' + r.id + '" data-activo="' + (activo ? '1' : '0') + '" style="font-size:12px;padding:4px 8px">' +
          (activo ? 'Desactivar' : 'Activar') + '</button> ' +
          '<button type="button" class="btn-ghost user-pass" data-id="' + r.id + '" style="font-size:12px;padding:4px 8px">Clave</button>' +
          '</td></tr>';
      });
      html += '</tbody></table>';
      box.innerHTML = html;
    } catch (e) {
      box.innerHTML = '<p style="color:#c62828">' + (e.message || e) + '</p>';
    }
  }

  async function createUser() {
    var usuario = ($('newUserUser') || {}).value || '';
    var nombre = ($('newUserNombre') || {}).value || '';
    var password = ($('newUserPass') || {}).value || '';
    var rol = ($('newUserRol') || {}).value || 'LECTOR';
    try {
      await api('/usuarios', {
        method: 'POST',
        body: JSON.stringify({ usuario: usuario, nombre: nombre, password: password, rol: rol })
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
    if (e.target.closest('#usersBtn')) {
      window.openUsersModal();
      return;
    }
    if (e.target.closest('#saveNewUserBtn')) {
      createUser();
      return;
    }
    var tog = e.target.closest('.user-toggle');
    if (tog) {
      var id = tog.getAttribute('data-id');
      var activo = tog.getAttribute('data-activo') === '1';
      updateUser(id, { activo: !activo });
      return;
    }
    var passBtn = e.target.closest('.user-pass');
    if (passBtn) {
      var id2 = passBtn.getAttribute('data-id');
      var np = prompt('Nueva contraseña (mín. 4 caracteres):');
      if (np && np.length >= 4) updateUser(id2, { password: np });
      else if (np) alert('Mínimo 4 caracteres');
      return;
    }
  });

  document.addEventListener('change', function (e) {
    if (e.target && e.target.classList.contains('user-rol')) {
      var id = e.target.getAttribute('data-id');
      updateUser(id, { rol: e.target.value });
    }
  });

  setInterval(function () { showUsersBtn(); }, 2000);
  setTimeout(function () { showUsersBtn(); }, 600);
  setTimeout(function () { showUsersBtn(); }, 1500);
})();
