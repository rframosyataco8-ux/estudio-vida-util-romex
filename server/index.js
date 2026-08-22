/**
 * Romex QC API v1.3
 * + Auditoría · alertas de límites · historial
 */
'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_TYPE = (process.env.DB_TYPE || 'mssql').toLowerCase();
const TOKEN_HOURS = 12;
const BCRYPT_ROUNDS = 10;
const IS_PROD = process.env.NODE_ENV === 'production';
const VERSION = '1.3.0';

const corsOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(function (s) { return s.trim(); })
  .filter(Boolean);
app.use(cors({
  origin: corsOrigins.length ? corsOrigins : true,
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));

let pool = null;

var loginAttempts = Object.create(null);
var LOGIN_WINDOW_MS = 15 * 60 * 1000;
var LOGIN_MAX = 12;

/* Límites de alerta QC (orientativos — ajustables) */
var QC_LIMITS = {
  micro: {
    rtamv: { max: 5000, label: 'RTAMV' },
    mohos: { max: 100, label: 'Mohos' },
    coliformes: { max: 10, label: 'Coliformes' },
    ecoli: { max: 0, label: 'E.Coli' },
    enterobacterias: { max: 10, label: 'Enterobacterias' },
    levaduras: { max: 50, label: 'Levaduras' },
    saureus: { max: 0, label: 'S.Aureus' }
  },
  fisico: {
    humedad: { max: 5, label: '% Humedad' },
    ph: { min: 4, max: 8, label: 'pH' },
    acidez: { max: 3, label: '% Acidez' }
  }
};

function checkLoginRate(ip) {
  var now = Date.now();
  var entry = loginAttempts[ip];
  if (!entry || now - entry.start > LOGIN_WINDOW_MS) {
    loginAttempts[ip] = { start: now, count: 1 };
    return true;
  }
  entry.count += 1;
  return entry.count <= LOGIN_MAX;
}

function clientIp(req) {
  return (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').toString().split(',')[0].trim();
}

function sha256(text) {
  return crypto.createHash('sha256').update(String(text), 'utf8').digest('hex');
}

function newToken() {
  return crypto.randomBytes(32).toString('hex');
}

function isBcryptHash(h) {
  return typeof h === 'string' && /^\$2[aby]\$\d{2}\$/.test(h);
}

async function verifyPassword(plain, storedHash) {
  if (!storedHash) return false;
  if (isBcryptHash(storedHash)) return bcrypt.compare(plain, storedHash);
  return sha256(plain) === String(storedHash).toLowerCase();
}

async function upgradeToBcrypt(userId, plain) {
  var hash = await bcrypt.hash(plain, BCRYPT_ROUNDS);
  if (DB_TYPE === 'mssql') {
    await q('UPDATE dbo.Usuarios SET PasswordHash=@p0 WHERE Id=@p1', [hash, userId]);
  } else {
    await q('UPDATE usuarios SET password_hash=$1 WHERE id=$2', [hash, userId]);
  }
}

function slugify(name) {
  return String(name || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40) || ('prod_' + Date.now());
}

function safeError(e) {
  if (IS_PROD) return 'Error interno del servidor';
  return e && e.message ? e.message : 'Error desconocido';
}

function clampInt(v, min, max, fallback) {
  var n = parseInt(v, 10);
  if (!Number.isFinite(n)) return fallback;
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

function toNumOrNull(v) {
  if (v === null || v === undefined || v === '') return null;
  var n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function validateMicroBody(b) {
  var out = {};
  var keys = ['rtamv', 'mohos', 'coliformes', 'ecoli', 'enterobacterias', 'levaduras', 'saureus'];
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    var n = parseInt(b[k], 10);
    if (!Number.isFinite(n) || n < 0 || n > 10000000) {
      return { error: 'Valor inválido en ' + k + ' (0–10000000)' };
    }
    out[k] = n;
  }
  return { data: out };
}

function validateFisicoBody(b) {
  var fields = {
    humedad: [0, 100],
    ph: [0, 14],
    ceniza: [0, 100],
    grasa: [0, 100],
    fineza: [0, 100],
    acidez: [0, 100]
  };
  var out = {};
  for (var k in fields) {
    if (!Object.prototype.hasOwnProperty.call(fields, k)) continue;
    var v = toNumOrNull(b[k]);
    if (v === null) { out[k] = null; continue; }
    if (v < fields[k][0] || v > fields[k][1]) {
      return { error: k + ' fuera de rango (' + fields[k][0] + '–' + fields[k][1] + ')' };
    }
    out[k] = Math.round(v * 100) / 100;
  }
  return { data: out };
}

function buildAlerts(tipo, row) {
  var limits = QC_LIMITS[tipo] || {};
  var alerts = [];
  Object.keys(limits).forEach(function (k) {
    var lim = limits[k];
    var val = row[k];
    if (val === null || val === undefined || val === '') return;
    var n = Number(val);
    if (!Number.isFinite(n)) return;
    if (lim.max != null && n > lim.max) {
      alerts.push({ campo: k, label: lim.label, valor: n, limite: lim.max, tipo: 'max' });
    }
    if (lim.min != null && n < lim.min) {
      alerts.push({ campo: k, label: lim.label, valor: n, limite: lim.min, tipo: 'min' });
    }
  });
  return alerts;
}

async function initDb() {
  if (DB_TYPE === 'mssql') {
    var sql = require('mssql');
    pool = await sql.connect({
      server: process.env.MSSQL_SERVER || 'localhost',
      database: process.env.MSSQL_DATABASE || 'RomexQC',
      user: process.env.MSSQL_USER || 'sa',
      password: process.env.MSSQL_PASSWORD || '',
      options: {
        encrypt: process.env.MSSQL_ENCRYPT === 'true',
        trustServerCertificate: true
      }
    });
    console.log('SQL Server OK');
  } else {
    var Pool = require('pg').Pool;
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: IS_PROD ? { rejectUnauthorized: false } : false
    });
    await pool.query('SELECT 1');
    console.log('PostgreSQL OK');
  }
}

async function q(text, params) {
  params = params || [];
  if (DB_TYPE === 'mssql') {
    var req = pool.request();
    params.forEach(function (v, i) { req.input('p' + i, v); });
    var i = 0;
    var mssqlText = text.replace(/\$(\d+)/g, function () { return '@p' + (i++); });
    var r = await req.query(mssqlText);
    return { rows: r.recordset || [], rowsAffected: (r.rowsAffected && r.rowsAffected[0]) || 0 };
  }
  var pr = await pool.query(text, params);
  return { rows: pr.rows || [], rowsAffected: pr.rowCount || 0 };
}

async function logAudit(user, accion, entidad, codigo, anio, mes, detalle) {
  try {
    var uid = user && user.id != null ? user.id : null;
    var unombre = user ? (user.nombre || user.usuario || '') : '';
    var det = typeof detalle === 'string' ? detalle : JSON.stringify(detalle || {});
    if (DB_TYPE === 'mssql') {
      await q(
        'INSERT INTO dbo.Auditoria (UsuarioId, UsuarioNombre, Accion, Entidad, Codigo, Anio, Mes, Detalle) VALUES (@p0,@p1,@p2,@p3,@p4,@p5,@p6,@p7)',
        [uid, unombre, accion, entidad, codigo || null, anio || null, mes || null, det]
      );
    } else {
      await q(
        'INSERT INTO auditoria (usuario_id, usuario_nombre, accion, entidad, codigo, anio, mes, detalle) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
        [uid, unombre, accion, entidad, codigo || null, anio || null, mes || null, det]
      );
    }
  } catch (e) {
    console.warn('logAudit:', e.message);
  }
}

async function cleanExpiredSessions() {
  try {
    if (DB_TYPE === 'mssql') {
      await q('DELETE FROM dbo.Sesiones WHERE ExpiraEn < SYSUTCDATETIME()');
    } else {
      await q('DELETE FROM sesiones WHERE expira_en < NOW()');
    }
  } catch (e) {
    console.warn('cleanExpiredSessions:', e.message);
  }
}

async function resolveSession(token) {
  if (!token || token.length < 16) return null;
  if (DB_TYPE === 'mssql') {
    var r = await q(
      'SELECT u.Id as id, u.Usuario as usuario, u.Nombre as nombre, u.Rol as rol ' +
      'FROM dbo.Sesiones s JOIN dbo.Usuarios u ON u.Id = s.UsuarioId ' +
      'WHERE s.Token = @p0 AND s.ExpiraEn > SYSUTCDATETIME() AND u.Activo = 1',
      [token]
    );
    return r.rows[0] || null;
  }
  var r2 = await q(
    'SELECT u.id, u.usuario, u.nombre, u.rol FROM sesiones s ' +
    'JOIN usuarios u ON u.id = s.usuario_id ' +
    'WHERE s.token = $1 AND s.expira_en > NOW() AND u.activo = true',
    [token]
  );
  return r2.rows[0] || null;
}

function authRequired(req, res, next) {
  var header = req.headers.authorization || '';
  var token = header.startsWith('Bearer ') ? header.slice(7).trim() : (req.headers['x-romex-token'] || '');
  resolveSession(token).then(function (user) {
    if (!user) return res.status(401).json({ error: 'Sesión inválida o expirada' });
    req.user = user;
    next();
  }).catch(function (e) {
    res.status(500).json({ error: safeError(e) });
  });
}

function adminRequired(req, res, next) {
  if (!req.user || String(req.user.rol).toUpperCase() !== 'ADMIN') {
    return res.status(403).json({ error: 'Se requiere rol ADMIN' });
  }
  next();
}

app.get('/api/health', function (_req, res) {
  res.json({ ok: true, db: DB_TYPE, version: VERSION });
});

app.get('/api/limits', authRequired, function (_req, res) {
  res.json(QC_LIMITS);
});

app.post('/api/login', async function (req, res) {
  try {
    var ip = clientIp(req);
    if (!checkLoginRate(ip)) {
      return res.status(429).json({ error: 'Demasiados intentos. Espera 15 minutos.' });
    }

    var user = String(req.body.user || '').trim().toLowerCase();
    var pass = String(req.body.pass || '');
    if (!user || !pass) return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
    if (user.length > 50 || pass.length > 128) return res.status(400).json({ error: 'Datos de acceso inválidos' });

    await cleanExpiredSessions();

    var row;
    if (DB_TYPE === 'mssql') {
      var r = await q(
        'SELECT Id as id, Usuario as usuario, Nombre as nombre, Rol as rol, PasswordHash as password_hash ' +
        'FROM dbo.Usuarios WHERE LOWER(Usuario)=@p0 AND Activo=1',
        [user]
      );
      row = r.rows[0];
    } else {
      var r2 = await q(
        'SELECT id, usuario, nombre, rol, password_hash FROM usuarios WHERE LOWER(usuario)=$1 AND activo=true',
        [user]
      );
      row = r2.rows[0];
    }

    if (!row) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });

    var ok = await verifyPassword(pass, row.password_hash);
    if (!ok) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });

    if (!isBcryptHash(row.password_hash)) {
      try { await upgradeToBcrypt(row.id, pass); } catch (e) { console.warn('upgrade bcrypt:', e.message); }
    }

    var token = newToken();
    var expira = new Date(Date.now() + TOKEN_HOURS * 3600 * 1000);

    if (DB_TYPE === 'mssql') {
      await q('INSERT INTO dbo.Sesiones (UsuarioId, Token, ExpiraEn) VALUES (@p0, @p1, @p2)', [row.id, token, expira]);
    } else {
      await q('INSERT INTO sesiones (usuario_id, token, expira_en) VALUES ($1,$2,$3)', [row.id, token, expira]);
    }

    await logAudit({ id: row.id, nombre: row.nombre, usuario: row.usuario }, 'LOGIN', 'sesion', null, null, null, { ip: ip });

    res.json({
      ok: true,
      token: token,
      user: row.usuario,
      nombre: row.nombre,
      rol: row.rol
    });
  } catch (e) {
    res.status(500).json({ error: safeError(e) });
  }
});

app.post('/api/logout', authRequired, async function (req, res) {
  try {
    var header = req.headers.authorization || '';
    var token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (DB_TYPE === 'mssql') {
      await q('DELETE FROM dbo.Sesiones WHERE Token=@p0', [token]);
    } else {
      await q('DELETE FROM sesiones WHERE token=$1', [token]);
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: safeError(e) });
  }
});

app.get('/api/me', authRequired, function (req, res) {
  res.json({ user: req.user.usuario, nombre: req.user.nombre, rol: req.user.rol });
});

app.get('/api/auditoria', authRequired, adminRequired, async function (req, res) {
  try {
    var limit = clampInt(req.query.limit, 1, 200, 50);
    var r;
    if (DB_TYPE === 'mssql') {
      r = await q(
        'SELECT TOP (' + limit + ') Id as id, UsuarioNombre as usuario_nombre, Accion as accion, Entidad as entidad, Codigo as codigo, Anio as anio, Mes as mes, Detalle as detalle, CreadoEn as creado_en FROM dbo.Auditoria ORDER BY CreadoEn DESC'
      );
    } else {
      r = await q(
        'SELECT id, usuario_nombre, accion, entidad, codigo, anio, mes, detalle, creado_en FROM auditoria ORDER BY creado_en DESC LIMIT $1',
        [limit]
      );
    }
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: safeError(e) });
  }
});

app.get('/api/productos', authRequired, async function (_req, res) {
  try {
    var r = await q(DB_TYPE === 'mssql'
      ? 'SELECT Id as id, Codigo as codigo, Nombre as nombre, Lote as lote FROM dbo.Productos WHERE Activo=1 ORDER BY Id'
      : 'SELECT id, codigo, nombre, lote FROM productos WHERE activo=true ORDER BY id');
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: safeError(e) });
  }
});

app.post('/api/productos', authRequired, adminRequired, async function (req, res) {
  try {
    var nombre = String(req.body.nombre || '').trim();
    var lote = String(req.body.lote || '').trim();
    var codigo = String(req.body.codigo || '').trim().toLowerCase();
    if (!nombre || nombre.length < 2) return res.status(400).json({ error: 'Nombre inválido (mín. 2 caracteres)' });
    if (!lote || lote.length < 2) return res.status(400).json({ error: 'Lote inválido (mín. 2 caracteres)' });
    if (nombre.length > 120) return res.status(400).json({ error: 'Nombre demasiado largo' });
    if (lote.length > 30) return res.status(400).json({ error: 'Lote demasiado largo' });
    if (!codigo) codigo = slugify(nombre);
    if (!/^[a-z0-9_]+$/.test(codigo)) return res.status(400).json({ error: 'Código solo puede tener letras, números y _' });

    if (DB_TYPE === 'mssql') {
      var exists = await q('SELECT Id FROM dbo.Productos WHERE Codigo=@p0', [codigo]);
      if (exists.rows.length) return res.status(409).json({ error: 'Ya existe un producto con ese código' });
      await q('INSERT INTO dbo.Productos (Codigo, Nombre, Lote) VALUES (@p0, @p1, @p2)', [codigo, nombre, lote]);
      var r = await q('SELECT Id as id, Codigo as codigo, Nombre as nombre, Lote as lote FROM dbo.Productos WHERE Codigo=@p0', [codigo]);
      await logAudit(req.user, 'CREATE', 'producto', codigo, null, null, { nombre: nombre, lote: lote });
      return res.status(201).json(r.rows[0]);
    }

    var exists2 = await q('SELECT id FROM productos WHERE codigo=$1', [codigo]);
    if (exists2.rows.length) return res.status(409).json({ error: 'Ya existe un producto con ese código' });
    var r2 = await q('INSERT INTO productos (codigo, nombre, lote) VALUES ($1,$2,$3) RETURNING id, codigo, nombre, lote', [codigo, nombre, lote]);
    await logAudit(req.user, 'CREATE', 'producto', codigo, null, null, { nombre: nombre, lote: lote });
    res.status(201).json(r2.rows[0]);
  } catch (e) {
    res.status(500).json({ error: safeError(e) });
  }
});

app.delete('/api/productos/:codigo', authRequired, adminRequired, async function (req, res) {
  try {
    var codigo = req.params.codigo;
    var r;
    if (DB_TYPE === 'mssql') {
      r = await q('UPDATE dbo.Productos SET Activo=0 WHERE Codigo=@p0 AND Activo=1', [codigo]);
    } else {
      r = await q('UPDATE productos SET activo=false WHERE codigo=$1 AND activo=true', [codigo]);
    }
    if (!r.rowsAffected) return res.status(404).json({ error: 'Producto no encontrado o ya inactivo' });
    await logAudit(req.user, 'DELETE', 'producto', codigo, null, null, {});
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: safeError(e) });
  }
});

app.get('/api/productos/:codigo/micro', authRequired, async function (req, res) {
  try {
    var anio = clampInt(req.query.anio, 2020, 2099, 2026);
    var r = await q(DB_TYPE === 'mssql'
      ? 'SELECT m.Anio as anio, m.Mes as mes, m.FechaAnalisis as fecha_analisis, m.RTAMV as rtamv, m.Mohos as mohos, m.Coliformes as coliformes, m.EColi as ecoli, m.Enterobacterias as enterobacterias, m.Levaduras as levaduras, m.SAureus as saureus, m.Estado as estado, m.Analista as analista, m.LiberadoPor as liberado_por FROM dbo.ResultadosMicro m JOIN dbo.Productos p ON p.Id=m.ProductoId WHERE p.Codigo=@p0 AND m.Anio=@p1 ORDER BY m.Mes'
      : 'SELECT m.anio, m.mes, m.fecha_analisis, m.rtamv, m.mohos, m.coliformes, m.ecoli, m.enterobacterias, m.levaduras, m.saureus, m.estado, m.analista, m.liberado_por FROM resultados_micro m JOIN productos p ON p.id=m.producto_id WHERE p.codigo=$1 AND m.anio=$2 ORDER BY m.mes',
      [req.params.codigo, anio]);
    var rows = r.rows.map(function (row) {
      row.alertas = buildAlerts('micro', row);
      return row;
    });
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: safeError(e) });
  }
});

app.get('/api/productos/:codigo/fisico', authRequired, async function (req, res) {
  try {
    var anio = clampInt(req.query.anio, 2020, 2099, 2026);
    var r = await q(DB_TYPE === 'mssql'
      ? 'SELECT m.Anio as anio, m.Mes as mes, m.FechaAnalisis as fecha_analisis, m.Humedad as humedad, m.PH as ph, m.Ceniza as ceniza, m.Grasa as grasa, m.Fineza as fineza, m.Acidez as acidez, m.Estado as estado, m.Analista as analista FROM dbo.ResultadosFisico m JOIN dbo.Productos p ON p.Id=m.ProductoId WHERE p.Codigo=@p0 AND m.Anio=@p1 ORDER BY m.Mes'
      : 'SELECT m.anio, m.mes, m.fecha_analisis, m.humedad, m.ph, m.ceniza, m.grasa, m.fineza, m.acidez, m.estado, m.analista FROM resultados_fisico m JOIN productos p ON p.id=m.producto_id WHERE p.codigo=$1 AND m.anio=$2 ORDER BY m.mes',
      [req.params.codigo, anio]);
    var rows = r.rows.map(function (row) {
      row.alertas = buildAlerts('fisico', row);
      return row;
    });
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: safeError(e) });
  }
});

app.put('/api/productos/:codigo/micro/:mes', authRequired, adminRequired, async function (req, res) {
  try {
    var anio = clampInt(req.query.anio, 2020, 2099, 2026);
    var mes = parseInt(req.params.mes, 10);
    if (!mes || mes < 1 || mes > 12) return res.status(400).json({ error: 'Mes inválido' });

    var v = validateMicroBody(req.body || {});
    if (v.error) return res.status(400).json({ error: v.error });
    var b = v.data;

    var r;
    if (DB_TYPE === 'mssql') {
      r = await q(
        'UPDATE m SET RTAMV=@p0, Mohos=@p1, Coliformes=@p2, EColi=@p3, Enterobacterias=@p4, Levaduras=@p5, SAureus=@p6, ActualizadoEn=SYSUTCDATETIME() ' +
        'FROM dbo.ResultadosMicro m JOIN dbo.Productos p ON p.Id=m.ProductoId WHERE p.Codigo=@p7 AND m.Anio=@p8 AND m.Mes=@p9',
        [b.rtamv, b.mohos, b.coliformes, b.ecoli, b.enterobacterias, b.levaduras, b.saureus, req.params.codigo, anio, mes]
      );
    } else {
      r = await q(
        'UPDATE resultados_micro m SET rtamv=$1, mohos=$2, coliformes=$3, ecoli=$4, enterobacterias=$5, levaduras=$6, saureus=$7, actualizado_en=NOW() ' +
        'FROM productos p WHERE p.id=m.producto_id AND p.codigo=$8 AND m.anio=$9 AND m.mes=$10',
        [b.rtamv, b.mohos, b.coliformes, b.ecoli, b.enterobacterias, b.levaduras, b.saureus, req.params.codigo, anio, mes]
      );
    }
    if (!r.rowsAffected) return res.status(404).json({ error: 'No hay registro micro para ese producto/mes/año' });
    await logAudit(req.user, 'UPDATE', 'micro', req.params.codigo, anio, mes, b);
    res.json({ ok: true, alertas: buildAlerts('micro', b) });
  } catch (e) {
    res.status(500).json({ error: safeError(e) });
  }
});

app.put('/api/productos/:codigo/fisico/:mes', authRequired, adminRequired, async function (req, res) {
  try {
    var anio = clampInt(req.query.anio, 2020, 2099, 2026);
    var mes = parseInt(req.params.mes, 10);
    if (!mes || mes < 1 || mes > 12) return res.status(400).json({ error: 'Mes inválido' });

    var v = validateFisicoBody(req.body || {});
    if (v.error) return res.status(400).json({ error: v.error });
    var b = v.data;

    var r;
    if (DB_TYPE === 'mssql') {
      r = await q(
        'UPDATE m SET Humedad=@p0, PH=@p1, Ceniza=@p2, Grasa=@p3, Fineza=@p4, Acidez=@p5, ActualizadoEn=SYSUTCDATETIME() ' +
        'FROM dbo.ResultadosFisico m JOIN dbo.Productos p ON p.Id=m.ProductoId WHERE p.Codigo=@p6 AND m.Anio=@p7 AND m.Mes=@p8',
        [b.humedad, b.ph, b.ceniza, b.grasa, b.fineza, b.acidez, req.params.codigo, anio, mes]
      );
    } else {
      r = await q(
        'UPDATE resultados_fisico m SET humedad=$1, ph=$2, ceniza=$3, grasa=$4, fineza=$5, acidez=$6, actualizado_en=NOW() ' +
        'FROM productos p WHERE p.id=m.producto_id AND p.codigo=$7 AND m.anio=$8 AND m.mes=$9',
        [b.humedad, b.ph, b.ceniza, b.grasa, b.fineza, b.acidez, req.params.codigo, anio, mes]
      );
    }
    if (!r.rowsAffected) return res.status(404).json({ error: 'No hay registro físico para ese producto/mes/año' });
    await logAudit(req.user, 'UPDATE', 'fisico', req.params.codigo, anio, mes, b);
    res.json({ ok: true, alertas: buildAlerts('fisico', b) });
  } catch (e) {
    res.status(500).json({ error: safeError(e) });
  }
});

app.post('/api/productos/:codigo/mes', authRequired, adminRequired, async function (req, res) {
  try {
    var codigo = req.params.codigo;
    var anio = clampInt(req.body.anio, 2020, 2099, 2026);
    var mes = parseInt(req.body.mes, 10);
    var fecha = req.body.fecha || (anio + '-' + String(mes).padStart(2, '0') + '-15');
    var microIn = req.body.micro || {};
    var fisicoIn = req.body.fisico || {};
    var analista = (req.user && (req.user.nombre || req.user.usuario)) || 'Sistema';

    if (!mes || mes < 1 || mes > 12) return res.status(400).json({ error: 'Mes inválido (1-12)' });

    var vm = validateMicroBody({
      rtamv: microIn.rtamv || 0, mohos: microIn.mohos || 0, coliformes: microIn.coliformes || 0,
      ecoli: microIn.ecoli || 0, enterobacterias: microIn.enterobacterias || 0,
      levaduras: microIn.levaduras || 0, saureus: microIn.saureus || 0
    });
    if (vm.error) return res.status(400).json({ error: vm.error });
    var micro = vm.data;

    var vf = validateFisicoBody(fisicoIn);
    if (vf.error) return res.status(400).json({ error: vf.error });
    var fisico = vf.data;

    if (DB_TYPE === 'mssql') {
      var prod = await q('SELECT Id as id FROM dbo.Productos WHERE Codigo=@p0 AND Activo=1', [codigo]);
      if (!prod.rows.length) return res.status(404).json({ error: 'Producto no encontrado' });
      var pid = prod.rows[0].id;
      var existsM = await q('SELECT Id FROM dbo.ResultadosMicro WHERE ProductoId=@p0 AND Anio=@p1 AND Mes=@p2', [pid, anio, mes]);
      if (existsM.rows.length) return res.status(409).json({ error: 'Ya existe ese mes para este producto' });

      await q(
        'INSERT INTO dbo.ResultadosMicro (ProductoId,Anio,Mes,FechaAnalisis,RTAMV,Mohos,Coliformes,EColi,Enterobacterias,Levaduras,SAureus,Analista,LiberadoPor) VALUES (@p0,@p1,@p2,@p3,@p4,@p5,@p6,@p7,@p8,@p9,@p10,@p11,@p12)',
        [pid, anio, mes, fecha, micro.rtamv, micro.mohos, micro.coliformes, micro.ecoli, micro.enterobacterias, micro.levaduras, micro.saureus, analista, analista]
      );
      await q(
        'INSERT INTO dbo.ResultadosFisico (ProductoId,Anio,Mes,FechaAnalisis,Humedad,PH,Ceniza,Grasa,Fineza,Acidez,Analista) VALUES (@p0,@p1,@p2,@p3,@p4,@p5,@p6,@p7,@p8,@p9,@p10)',
        [pid, anio, mes, fecha, fisico.humedad, fisico.ph, fisico.ceniza, fisico.grasa, fisico.fineza, fisico.acidez, analista]
      );
    } else {
      var prod2 = await q('SELECT id FROM productos WHERE codigo=$1 AND activo=true', [codigo]);
      if (!prod2.rows.length) return res.status(404).json({ error: 'Producto no encontrado' });
      var pid2 = prod2.rows[0].id;
      await q(
        'INSERT INTO resultados_micro (producto_id,anio,mes,fecha_analisis,rtamv,mohos,coliformes,ecoli,enterobacterias,levaduras,saureus,analista) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',
        [pid2, anio, mes, fecha, micro.rtamv, micro.mohos, micro.coliformes, micro.ecoli, micro.enterobacterias, micro.levaduras, micro.saureus, analista]
      );
      await q(
        'INSERT INTO resultados_fisico (producto_id,anio,mes,fecha_analisis,humedad,ph,ceniza,grasa,fineza,acidez,analista) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',
        [pid2, anio, mes, fecha, fisico.humedad, fisico.ph, fisico.ceniza, fisico.grasa, fisico.fineza, fisico.acidez, analista]
      );
    }

    await logAudit(req.user, 'CREATE', 'mes', codigo, anio, mes, { micro: micro, fisico: fisico });
    res.status(201).json({ ok: true, mes: mes, anio: anio });
  } catch (e) {
    res.status(500).json({ error: safeError(e) });
  }
});

app.use(express.static(path.join(__dirname, '..')));
app.get('*', function (req, res) {
  if (req.path.indexOf('/api') === 0) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

initDb().then(function () {
  app.listen(PORT, function () {
    console.log('Romex QC API v' + VERSION + ' · port ' + PORT + ' · DB ' + DB_TYPE);
  });
}).catch(function (err) {
  console.error(err);
  process.exit(1);
});
