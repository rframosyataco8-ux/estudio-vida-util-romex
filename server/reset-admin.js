'use strict';
/**
 * Reset de contraseña admin si RESET_ADMIN_PASS está definido.
 * Úsalo una sola vez en Render, luego borra la variable.
 */
module.exports = async function maybeResetAdminPassword(deps) {
  var plain = process.env.RESET_ADMIN_PASS;
  if (!plain || String(plain).trim().length < 4) return;
  plain = String(plain).trim();
  var bcrypt = deps.bcrypt;
  var BCRYPT_ROUNDS = deps.BCRYPT_ROUNDS;
  var DB_TYPE = deps.DB_TYPE;
  var q = deps.q;
  try {
    var hash = await bcrypt.hash(plain, BCRYPT_ROUNDS);
    if (DB_TYPE === 'mssql') {
      var r = await q("SELECT Id as id FROM dbo.Usuarios WHERE LOWER(Usuario)='admin'");
      if (r.rows.length) {
        await q('UPDATE dbo.Usuarios SET PasswordHash=@p0, Activo=1 WHERE Id=@p1', [hash, r.rows[0].id]);
        console.log('[RESET] Contraseña de admin actualizada (MSSQL). BORRA RESET_ADMIN_PASS del entorno.');
      } else {
        await q("INSERT INTO dbo.Usuarios (Usuario, PasswordHash, Nombre, Rol, Activo) VALUES ('admin', @p0, N'Administrador', 'ADMIN', 1)", [hash]);
        console.log('[RESET] Usuario admin creado (MSSQL). BORRA RESET_ADMIN_PASS del entorno.');
      }
    } else {
      var r2 = await q("SELECT id FROM usuarios WHERE LOWER(usuario)='admin'");
      if (r2.rows.length) {
        await q('UPDATE usuarios SET password_hash=$1, activo=true WHERE id=$2', [hash, r2.rows[0].id]);
        console.log('[RESET] Contraseña de admin actualizada (Postgres). BORRA RESET_ADMIN_PASS del entorno.');
      } else {
        await q("INSERT INTO usuarios (usuario, password_hash, nombre, rol, activo) VALUES ('admin', $1, 'Administrador', 'ADMIN', true)", [hash]);
        console.log('[RESET] Usuario admin creado (Postgres). BORRA RESET_ADMIN_PASS del entorno.');
      }
    }
  } catch (e) {
    console.error('[RESET] Error al resetear admin:', e && e.message ? e.message : e);
  }
};
