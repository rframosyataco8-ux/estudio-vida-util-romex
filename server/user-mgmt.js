/**
 * Gestión de usuarios + permisos granulares
 * Solo admin y rodrigo
 *
 * permisos JSON:
 * {
 *   ver_micro: true|false,
 *   ver_fisico: true|false,
 *   editar: true|false,
 *   mes_desde: 1-12,
 *   mes_hasta: 1-12
 * }
 */
'use strict';

function defaultPermisos(rol) {
  if (String(rol).toUpperCase() === 'ADMIN') {
    return { ver_micro: true, ver_fisico: true, editar: true, mes_desde: 1, mes_hasta: 12 };
  }
  return { ver_micro: true, ver_fisico: true, editar: false, mes_desde: 1, mes_hasta: 12 };
}

function normalizePermisos(p, rol) {
  var d = defaultPermisos(rol);
  if (!p) return d;
  if (typeof p === 'string') {
    try { p = JSON.parse(p); } catch (e) { return d; }
  }
  if (typeof p !== 'object') return d;
  var md = parseInt(p.mes_desde, 10);
  var mh = parseInt(p.mes_hasta, 10);
  if (!Number.isFinite(md) || md < 1) md = 1;
  if (md > 12) md = 12;
  if (!Number.isFinite(mh) || mh > 12) mh = 12;
  if (mh < 1) mh = 1;
  if (mh < md) mh = md;
  return {
    ver_micro: p.ver_micro !== false,
    ver_fisico: p.ver_fisico !== false,
    editar: p.editar === true,
    mes_desde: md,
    mes_hasta: mh
  };
}

module.exports = function registerUserMgmt(app, deps) {
  var authRequired = deps.authRequired;
  var q = deps.q;
  var DB_TYPE = deps.DB_TYPE;
  var bcrypt = deps.bcrypt;
  var BCRYPT_ROUNDS = deps.BCRYPT_ROUNDS;
  var logAudit = deps.logAudit;
  var safeError = deps.safeError;
  var schemaReady = false;
  var PROTECTED_USERS = { admin: true, rodrigo: true };

  function superUserRequired(req, res, next) {
    var u = String(req.user && req.user.usuario || '').toLowerCase();
    if (u !== 'admin' && u !== 'rodrigo') {
      return res.status(403).json({ error: 'Solo admin y rodrigo pueden gestionar usuarios' });
    }
    next();
  }

  async function ensurePermisosColumn() {
    if (schemaReady) return;
    try {
      if (DB_TYPE === 'mssql') {
        await q("IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Usuarios') AND name = 'Permisos') ALTER TABLE dbo.Usuarios ADD Permisos NVARCHAR(500) NULL");
      } else {
        await q('ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS permisos TEXT NULL');
      }
      schemaReady = true;
    } catch (e) {
      console.warn('ensurePermisosColumn:', e.message);
      schemaReady = true;
    }
  }

  app.get('/api/usuarios', authRequired, superUserRequired, async function (_req, res) {
    try {
      await ensurePermisosColumn();
      var r;
      if (DB_TYPE === 'mssql') {
        r = await q('SELECT Id as id, Usuario as usuario, Nombre as nombre, Rol as rol, Activo as activo, CreadoEn as creado_en, Permisos as permisos FROM dbo.Usuarios ORDER BY Id');
      } else {
        r = await q('SELECT id, usuario, nombre, rol, activo, creado_en, permisos FROM usuarios ORDER BY id');
      }
      res.json(r.rows.map(function (row) {
        row.permisos = normalizePermisos(row.permisos, row.rol);
        return row;
      }));
    } catch (e) { res.status(500).json({ error: safeError(e) }); }
  });

  app.post('/api/usuarios', authRequired, superUserRequired, async function (req, res) {
    try {
      await ensurePermisosColumn();
      var usuario = String(req.body.usuario || '').trim().toLowerCase();
      var password = String(req.body.password || '');
      var nombre = String(req.body.nombre || '').trim();
      var rol = String(req.body.rol || 'LECTOR').toUpperCase();
      var permisos = normalizePermisos(req.body.permisos, rol);
      if (!usuario || usuario.length < 3) return res.status(400).json({ error: 'Usuario inválido (mín. 3 caracteres)' });
      if (!/^[a-z0-9._-]+$/.test(usuario)) return res.status(400).json({ error: 'Usuario solo letras, números, . _ -' });
      if (!password || password.length < 4) return res.status(400).json({ error: 'Contraseña mín. 4 caracteres' });
      if (!nombre || nombre.length < 2) return res.status(400).json({ error: 'Nombre obligatorio' });
      if (rol !== 'ADMIN' && rol !== 'LECTOR') return res.status(400).json({ error: 'Rol debe ser ADMIN o LECTOR' });
      var hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      var permStr = JSON.stringify(permisos);
      if (DB_TYPE === 'mssql') {
        var exists = await q('SELECT Id FROM dbo.Usuarios WHERE LOWER(Usuario)=@p0', [usuario]);
        if (exists.rows.length) return res.status(409).json({ error: 'Ese usuario ya existe' });
        await q('INSERT INTO dbo.Usuarios (Usuario, PasswordHash, Nombre, Rol, Permisos) VALUES (@p0,@p1,@p2,@p3,@p4)', [usuario, hash, nombre, rol, permStr]);
        var r = await q('SELECT Id as id, Usuario as usuario, Nombre as nombre, Rol as rol, Activo as activo, Permisos as permisos FROM dbo.Usuarios WHERE LOWER(Usuario)=@p0', [usuario]);
        var out = r.rows[0];
        out.permisos = normalizePermisos(out.permisos, out.rol);
        await logAudit(req.user, 'CREATE', 'usuario', usuario, null, null, { nombre: nombre, rol: rol, permisos: permisos });
        return res.status(201).json(out);
      }
      var exists2 = await q('SELECT id FROM usuarios WHERE LOWER(usuario)=$1', [usuario]);
      if (exists2.rows.length) return res.status(409).json({ error: 'Ese usuario ya existe' });
      var r2 = await q('INSERT INTO usuarios (usuario, password_hash, nombre, rol, permisos) VALUES ($1,$2,$3,$4,$5) RETURNING id, usuario, nombre, rol, activo, permisos', [usuario, hash, nombre, rol, permStr]);
      var out2 = r2.rows[0];
      out2.permisos = normalizePermisos(out2.permisos, out2.rol);
      await logAudit(req.user, 'CREATE', 'usuario', usuario, null, null, { nombre: nombre, rol: rol, permisos: permisos });
      res.status(201).json(out2);
    } catch (e) { res.status(500).json({ error: safeError(e) }); }
  });

  app.put('/api/usuarios/:id', authRequired, superUserRequired, async function (req, res) {
    try {
      await ensurePermisosColumn();
      var id = parseInt(req.params.id, 10);
      if (!id) return res.status(400).json({ error: 'Id inválido' });
      var nombre = req.body.nombre != null ? String(req.body.nombre).trim() : null;
      var rol = req.body.rol != null ? String(req.body.rol).toUpperCase() : null;
      var activo = req.body.activo;
      var password = req.body.password != null ? String(req.body.password) : null;
      var permisosIn = req.body.permisos;
      if (rol && rol !== 'ADMIN' && rol !== 'LECTOR') return res.status(400).json({ error: 'Rol inválido' });
      if (password !== null && password.length > 0 && password.length < 4) {
        return res.status(400).json({ error: 'Contraseña mín. 4 caracteres' });
      }
      if (req.user.id === id && activo === false) {
        return res.status(400).json({ error: 'No puedes desactivar tu propio usuario' });
      }
      var hash = null;
      if (password && password.length >= 4) hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

      if (DB_TYPE === 'mssql') {
        var cur = await q('SELECT Id as id, Usuario as usuario, Rol as rol FROM dbo.Usuarios WHERE Id=@p0', [id]);
        if (!cur.rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
        if (nombre != null) await q('UPDATE dbo.Usuarios SET Nombre=@p0 WHERE Id=@p1', [nombre, id]);
        if (rol != null) await q('UPDATE dbo.Usuarios SET Rol=@p0 WHERE Id=@p1', [rol, id]);
        if (typeof activo === 'boolean') await q('UPDATE dbo.Usuarios SET Activo=@p0 WHERE Id=@p1', [activo ? 1 : 0, id]);
        if (hash) await q('UPDATE dbo.Usuarios SET PasswordHash=@p0 WHERE Id=@p1', [hash, id]);
        if (permisosIn != null) {
          var pr = normalizePermisos(permisosIn, rol || cur.rows[0].rol);
          await q('UPDATE dbo.Usuarios SET Permisos=@p0 WHERE Id=@p1', [JSON.stringify(pr), id]);
        }
        var r = await q('SELECT Id as id, Usuario as usuario, Nombre as nombre, Rol as rol, Activo as activo, Permisos as permisos FROM dbo.Usuarios WHERE Id=@p0', [id]);
        var out = r.rows[0];
        out.permisos = normalizePermisos(out.permisos, out.rol);
        await logAudit(req.user, 'UPDATE', 'usuario', cur.rows[0].usuario, null, null, { nombre: nombre, rol: rol, activo: activo, permisos: out.permisos });
        return res.json(out);
      }
      var cur2 = await q('SELECT id, usuario, rol FROM usuarios WHERE id=$1', [id]);
      if (!cur2.rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
      if (nombre != null) await q('UPDATE usuarios SET nombre=$1 WHERE id=$2', [nombre, id]);
      if (rol != null) await q('UPDATE usuarios SET rol=$1 WHERE id=$2', [rol, id]);
      if (typeof activo === 'boolean') await q('UPDATE usuarios SET activo=$1 WHERE id=$2', [activo, id]);
      if (hash) await q('UPDATE usuarios SET password_hash=$1 WHERE id=$2', [hash, id]);
      if (permisosIn != null) {
        var pr2 = normalizePermisos(permisosIn, rol || cur2.rows[0].rol);
        await q('UPDATE usuarios SET permisos=$1 WHERE id=$2', [JSON.stringify(pr2), id]);
      }
      var r2 = await q('SELECT id, usuario, nombre, rol, activo, permisos FROM usuarios WHERE id=$1', [id]);
      var out2 = r2.rows[0];
      out2.permisos = normalizePermisos(out2.permisos, out2.rol);
      await logAudit(req.user, 'UPDATE', 'usuario', cur2.rows[0].usuario, null, null, { nombre: nombre, rol: rol, activo: activo, permisos: out2.permisos });
      res.json(out2);
    } catch (e) { res.status(500).json({ error: safeError(e) }); }
  });

  app.delete('/api/usuarios/:id', authRequired, superUserRequired, async function (req, res) {
    try {
      var id = parseInt(req.params.id, 10);
      if (!id) return res.status(400).json({ error: 'Id inválido' });
      if (req.user.id === id) {
        return res.status(400).json({ error: 'No puedes eliminar tu propio usuario' });
      }
      var cur;
      if (DB_TYPE === 'mssql') {
        cur = await q('SELECT Id as id, Usuario as usuario FROM dbo.Usuarios WHERE Id=@p0', [id]);
      } else {
        cur = await q('SELECT id, usuario FROM usuarios WHERE id=$1', [id]);
      }
      if (!cur.rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
      var usuario = String(cur.rows[0].usuario || '').toLowerCase();
      if (PROTECTED_USERS[usuario]) {
        return res.status(403).json({ error: 'No se puede eliminar el usuario protegido «' + usuario + '»' });
      }
      if (DB_TYPE === 'mssql') {
        await q('DELETE FROM dbo.Sesiones WHERE UsuarioId=@p0', [id]);
        await q('DELETE FROM dbo.Usuarios WHERE Id=@p0', [id]);
      } else {
        await q('DELETE FROM sesiones WHERE usuario_id=$1', [id]);
        await q('DELETE FROM usuarios WHERE id=$1', [id]);
      }
      await logAudit(req.user, 'DELETE', 'usuario', usuario, null, null, {});
      res.json({ ok: true, usuario: usuario });
    } catch (e) { res.status(500).json({ error: safeError(e) }); }
  });

  app.get('/api/me/permisos', authRequired, async function (req, res) {
    try {
      await ensurePermisosColumn();
      var id = req.user.id;
      var r;
      if (DB_TYPE === 'mssql') {
        r = await q('SELECT Rol as rol, Permisos as permisos FROM dbo.Usuarios WHERE Id=@p0', [id]);
      } else {
        r = await q('SELECT rol, permisos FROM usuarios WHERE id=$1', [id]);
      }
      var row = r.rows[0] || {};
      var u = String(req.user.usuario || '').toLowerCase();
      var isSuper = (u === 'admin' || u === 'rodrigo');
      var permisos = isSuper
        ? { ver_micro: true, ver_fisico: true, editar: true, mes_desde: 1, mes_hasta: 12 }
        : normalizePermisos(row.permisos, row.rol || req.user.rol);
      if (String(row.rol || req.user.rol).toUpperCase() === 'ADMIN' && !isSuper && row.permisos == null) {
        permisos = defaultPermisos('ADMIN');
      }
      res.json({
        user: req.user.usuario,
        nombre: req.user.nombre,
        rol: req.user.rol,
        permisos: permisos,
        super_user: isSuper
      });
    } catch (e) { res.status(500).json({ error: safeError(e) }); }
  });
};
