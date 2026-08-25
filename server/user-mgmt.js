/**
 * Gestión de usuarios — solo admin y rodrigo
 * Se monta desde index.js sin alterar el resto de la API
 */
'use strict';

module.exports = function registerUserMgmt(app, deps) {
  var authRequired = deps.authRequired;
  var q = deps.q;
  var DB_TYPE = deps.DB_TYPE;
  var bcrypt = deps.bcrypt;
  var BCRYPT_ROUNDS = deps.BCRYPT_ROUNDS;
  var logAudit = deps.logAudit;
  var safeError = deps.safeError;

  function superUserRequired(req, res, next) {
    var u = String(req.user && req.user.usuario || '').toLowerCase();
    if (u !== 'admin' && u !== 'rodrigo') {
      return res.status(403).json({ error: 'Solo admin y rodrigo pueden gestionar usuarios' });
    }
    next();
  }

  app.get('/api/usuarios', authRequired, superUserRequired, async function (_req, res) {
    try {
      var r;
      if (DB_TYPE === 'mssql') {
        r = await q('SELECT Id as id, Usuario as usuario, Nombre as nombre, Rol as rol, Activo as activo, CreadoEn as creado_en FROM dbo.Usuarios ORDER BY Id');
      } else {
        r = await q('SELECT id, usuario, nombre, rol, activo, creado_en FROM usuarios ORDER BY id');
      }
      res.json(r.rows);
    } catch (e) { res.status(500).json({ error: safeError(e) }); }
  });

  app.post('/api/usuarios', authRequired, superUserRequired, async function (req, res) {
    try {
      var usuario = String(req.body.usuario || '').trim().toLowerCase();
      var password = String(req.body.password || '');
      var nombre = String(req.body.nombre || '').trim();
      var rol = String(req.body.rol || 'LECTOR').toUpperCase();
      if (!usuario || usuario.length < 3) return res.status(400).json({ error: 'Usuario inválido (mín. 3 caracteres)' });
      if (!/^[a-z0-9._-]+$/.test(usuario)) return res.status(400).json({ error: 'Usuario solo letras, números, . _ -' });
      if (!password || password.length < 4) return res.status(400).json({ error: 'Contraseña mín. 4 caracteres' });
      if (!nombre || nombre.length < 2) return res.status(400).json({ error: 'Nombre obligatorio' });
      if (rol !== 'ADMIN' && rol !== 'LECTOR') return res.status(400).json({ error: 'Rol debe ser ADMIN o LECTOR' });
      var hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      if (DB_TYPE === 'mssql') {
        var exists = await q('SELECT Id FROM dbo.Usuarios WHERE LOWER(Usuario)=@p0', [usuario]);
        if (exists.rows.length) return res.status(409).json({ error: 'Ese usuario ya existe' });
        await q('INSERT INTO dbo.Usuarios (Usuario, PasswordHash, Nombre, Rol) VALUES (@p0,@p1,@p2,@p3)', [usuario, hash, nombre, rol]);
        var r = await q('SELECT Id as id, Usuario as usuario, Nombre as nombre, Rol as rol, Activo as activo FROM dbo.Usuarios WHERE LOWER(Usuario)=@p0', [usuario]);
        await logAudit(req.user, 'CREATE', 'usuario', usuario, null, null, { nombre: nombre, rol: rol });
        return res.status(201).json(r.rows[0]);
      }
      var exists2 = await q('SELECT id FROM usuarios WHERE LOWER(usuario)=$1', [usuario]);
      if (exists2.rows.length) return res.status(409).json({ error: 'Ese usuario ya existe' });
      var r2 = await q('INSERT INTO usuarios (usuario, password_hash, nombre, rol) VALUES ($1,$2,$3,$4) RETURNING id, usuario, nombre, rol, activo', [usuario, hash, nombre, rol]);
      await logAudit(req.user, 'CREATE', 'usuario', usuario, null, null, { nombre: nombre, rol: rol });
      res.status(201).json(r2.rows[0]);
    } catch (e) { res.status(500).json({ error: safeError(e) }); }
  });

  app.put('/api/usuarios/:id', authRequired, superUserRequired, async function (req, res) {
    try {
      var id = parseInt(req.params.id, 10);
      if (!id) return res.status(400).json({ error: 'Id inválido' });
      var nombre = req.body.nombre != null ? String(req.body.nombre).trim() : null;
      var rol = req.body.rol != null ? String(req.body.rol).toUpperCase() : null;
      var activo = req.body.activo;
      var password = req.body.password != null ? String(req.body.password) : null;
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
        var cur = await q('SELECT Id as id, Usuario as usuario FROM dbo.Usuarios WHERE Id=@p0', [id]);
        if (!cur.rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
        if (nombre != null) await q('UPDATE dbo.Usuarios SET Nombre=@p0 WHERE Id=@p1', [nombre, id]);
        if (rol != null) await q('UPDATE dbo.Usuarios SET Rol=@p0 WHERE Id=@p1', [rol, id]);
        if (typeof activo === 'boolean') await q('UPDATE dbo.Usuarios SET Activo=@p0 WHERE Id=@p1', [activo ? 1 : 0, id]);
        if (hash) await q('UPDATE dbo.Usuarios SET PasswordHash=@p0 WHERE Id=@p1', [hash, id]);
        var r = await q('SELECT Id as id, Usuario as usuario, Nombre as nombre, Rol as rol, Activo as activo FROM dbo.Usuarios WHERE Id=@p0', [id]);
        await logAudit(req.user, 'UPDATE', 'usuario', cur.rows[0].usuario, null, null, { nombre: nombre, rol: rol, activo: activo });
        return res.json(r.rows[0]);
      }
      var cur2 = await q('SELECT id, usuario FROM usuarios WHERE id=$1', [id]);
      if (!cur2.rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
      if (nombre != null) await q('UPDATE usuarios SET nombre=$1 WHERE id=$2', [nombre, id]);
      if (rol != null) await q('UPDATE usuarios SET rol=$1 WHERE id=$2', [rol, id]);
      if (typeof activo === 'boolean') await q('UPDATE usuarios SET activo=$1 WHERE id=$2', [activo, id]);
      if (hash) await q('UPDATE usuarios SET password_hash=$1 WHERE id=$2', [hash, id]);
      var r2 = await q('SELECT id, usuario, nombre, rol, activo FROM usuarios WHERE id=$1', [id]);
      await logAudit(req.user, 'UPDATE', 'usuario', cur2.rows[0].usuario, null, null, { nombre: nombre, rol: rol, activo: activo });
      res.json(r2.rows[0]);
    } catch (e) { res.status(500).json({ error: safeError(e) }); }
  });
};
