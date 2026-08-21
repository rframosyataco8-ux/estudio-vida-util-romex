/**
 * Romex QC API
 * Auth: bcrypt + tokens en Sesiones · roles ADMIN / LECTOR
 */
'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const PORT = process.env.PORT || 3000;
const DB_TYPE = (process.env.DB_TYPE || 'mssql').toLowerCase();
const TOKEN_HOURS = 12;
const BCRYPT_ROUNDS = 10;

let pool = null;

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
  if (isBcryptHash(storedHash)) {
    return bcrypt.compare(plain, storedHash);
  }
  // Compatibilidad con hashes SHA-256 antiguos
  return sha256(plain) === String(storedHash).toLowerCase();
}

async function upgradeToBcrypt(userId, plain) {
  const hash = await bcrypt.hash(plain, BCRYPT_ROUNDS);
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

async function initDb() {
  if (DB_TYPE === 'mssql') {
    const sql = require('mssql');
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
    const { Pool } = require('pg');
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    await pool.query('SELECT 1');
    console.log('PostgreSQL OK');
  }
}

async function q(text, params) {
  params = params || [];
  if (DB_TYPE === 'mssql') {
    const req = pool.request();
    params.forEach(function (v, i) { req.input('p' + i, v); });
    let i = 0;
    const mssqlText = text.replace(/\$(\d+)/g, function () { return '@p' + (i++); });
    const r = await req.query(mssqlText);
    return { rows: r.recordset || [] };
  }
  return pool.query(text, params);
}

async function resolveSession(token) {
  if (!token || token.length < 16) return null;
  if (DB_TYPE === 'mssql') {
    const r = await q(
      'SELECT u.Id as id, u.Usuario as usuario, u.Nombre as nombre, u.Rol as rol ' +
      'FROM dbo.Sesiones s JOIN dbo.Usuarios u ON u.Id = s.UsuarioId ' +
      'WHERE s.Token = @p0 AND s.ExpiraEn > SYSUTCDATETIME() AND u.Activo = 1',
      [token]
    );
    return r.rows[0] || null;
  }
  const r = await q(
    'SELECT u.id, u.usuario, u.nombre, u.rol FROM sesiones s ' +
    'JOIN usuarios u ON u.id = s.usuario_id ' +
    'WHERE s.token = $1 AND s.expira_en > NOW() AND u.activo = true',
    [token]
  );
  return r.rows[0] || null;
}

function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : (req.headers['x-romex-token'] || '');
  resolveSession(token).then(function (user) {
    if (!user) return res.status(401).json({ error: 'Sesión inválida o expirada' });
    req.user = user;
    next();
  }).catch(function (e) {
    res.status(500).json({ error: e.message });
  });
}

function adminRequired(req, res, next) {
  if (!req.user || req.user.rol !== 'ADMIN') {
    return res.status(403).json({ error: 'Se requiere rol ADMIN' });
  }
  next();
}

app.get('/api/health', function (_req, res) {
  res.json({ ok: true, db: DB_TYPE });
});

app.post('/api/login', async function (req, res) {
  try {
    const user = String(req.body.user || '').trim().toLowerCase();
    const pass = String(req.body.pass || '');
    if (!user || !pass) {
      return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
    }
    if (user.length > 50 || pass.length > 128) {
      return res.status(400).json({ error: 'Datos de acceso inválidos' });
    }

    let row;
    if (DB_TYPE === 'mssql') {
      const r = await q(
        'SELECT Id as id, Usuario as usuario, Nombre as nombre, Rol as rol, PasswordHash as password_hash ' +
        'FROM dbo.Usuarios WHERE LOWER(Usuario)=@p0 AND Activo=1',
        [user]
      );
      row = r.rows[0];
    } else {
      const r = await q(
        'SELECT id, usuario, nombre, rol, password_hash FROM usuarios WHERE LOWER(usuario)=$1 AND activo=true',
        [user]
      );
      row = r.rows[0];
    }

    if (!row) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    const ok = await verifyPassword(pass, row.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    // Migrar SHA-256 → bcrypt en el primer login exitoso
    if (!isBcryptHash(row.password_hash)) {
      try { await upgradeToBcrypt(row.id, pass); } catch (e) { console.warn('upgrade bcrypt:', e.message); }
    }

    const token = newToken();
    const expira = new Date(Date.now() + TOKEN_HOURS * 3600 * 1000);

    if (DB_TYPE === 'mssql') {
      await q('INSERT INTO dbo.Sesiones (UsuarioId, Token, ExpiraEn) VALUES (@p0, @p1, @p2)', [row.id, token, expira]);
    } else {
      await q('INSERT INTO sesiones (usuario_id, token, expira_en) VALUES ($1,$2,$3)', [row.id, token, expira]);
    }

    res.json({
      ok: true,
      token: token,
      user: row.usuario,
      nombre: row.nombre,
      rol: row.rol
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/logout', authRequired, async function (req, res) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (DB_TYPE === 'mssql') {
      await q('DELETE FROM dbo.Sesiones WHERE Token=@p0', [token]);
    } else {
      await q('DELETE FROM sesiones WHERE token=$1', [token]);
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/me', authRequired, function (req, res) {
  res.json({ user: req.user.usuario, nombre: req.user.nombre, rol: req.user.rol });
});

app.get('/api/productos', authRequired, async function (_req, res) {
  try {
    const r = await q(DB_TYPE === 'mssql'
      ? 'SELECT Id as id, Codigo as codigo, Nombre as nombre, Lote as lote FROM dbo.Productos WHERE Activo=1 ORDER BY Id'
      : 'SELECT id, codigo, nombre, lote FROM productos WHERE activo=true ORDER BY id');
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/productos', authRequired, adminRequired, async function (req, res) {
  try {
    const nombre = String(req.body.nombre || '').trim();
    const lote = String(req.body.lote || '').trim();
    let codigo = String(req.body.codigo || '').trim().toLowerCase();
    if (!nombre || nombre.length < 2) return res.status(400).json({ error: 'Nombre inválido (mín. 2 caracteres)' });
    if (!lote || lote.length < 2) return res.status(400).json({ error: 'Lote inválido (mín. 2 caracteres)' });
    if (nombre.length > 120) return res.status(400).json({ error: 'Nombre demasiado largo' });
    if (lote.length > 30) return res.status(400).json({ error: 'Lote demasiado largo' });
    if (!codigo) codigo = slugify(nombre);
    if (!/^[a-z0-9_]+$/.test(codigo)) return res.status(400).json({ error: 'Código solo puede tener letras, números y _' });

    if (DB_TYPE === 'mssql') {
      const exists = await q('SELECT Id FROM dbo.Productos WHERE Codigo=@p0', [codigo]);
      if (exists.rows.length) return res.status(409).json({ error: 'Ya existe un producto con ese código' });
      await q('INSERT INTO dbo.Productos (Codigo, Nombre, Lote) VALUES (@p0, @p1, @p2)', [codigo, nombre, lote]);
      const r = await q('SELECT Id as id, Codigo as codigo, Nombre as nombre, Lote as lote FROM dbo.Productos WHERE Codigo=@p0', [codigo]);
      return res.status(201).json(r.rows[0]);
    }

    const exists = await q('SELECT id FROM productos WHERE codigo=$1', [codigo]);
    if (exists.rows.length) return res.status(409).json({ error: 'Ya existe un producto con ese código' });
    const r = await q('INSERT INTO productos (codigo, nombre, lote) VALUES ($1,$2,$3) RETURNING id, codigo, nombre, lote', [codigo, nombre, lote]);
    res.status(201).json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/productos/:codigo/micro', authRequired, async function (req, res) {
  try {
    const anio = parseInt(req.query.anio || '2026', 10);
    const r = await q(DB_TYPE === 'mssql'
      ? 'SELECT m.Anio as anio, m.Mes as mes, m.FechaAnalisis as fecha_analisis, m.RTAMV as rtamv, m.Mohos as mohos, m.Coliformes as coliformes, m.EColi as ecoli, m.Enterobacterias as enterobacterias, m.Levaduras as levaduras, m.SAureus as saureus, m.Estado as estado, m.Analista as analista, m.LiberadoPor as liberado_por FROM dbo.ResultadosMicro m JOIN dbo.Productos p ON p.Id=m.ProductoId WHERE p.Codigo=@p0 AND m.Anio=@p1 ORDER BY m.Mes'
      : 'SELECT m.anio, m.mes, m.fecha_analisis, m.rtamv, m.mohos, m.coliformes, m.ecoli, m.enterobacterias, m.levaduras, m.saureus, m.estado, m.analista, m.liberado_por FROM resultados_micro m JOIN productos p ON p.id=m.producto_id WHERE p.codigo=$1 AND m.anio=$2 ORDER BY m.mes',
      [req.params.codigo, anio]);
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/productos/:codigo/fisico', authRequired, async function (req, res) {
  try {
    const anio = parseInt(req.query.anio || '2026', 10);
    const r = await q(DB_TYPE === 'mssql'
      ? 'SELECT m.Anio as anio, m.Mes as mes, m.FechaAnalisis as fecha_analisis, m.Humedad as humedad, m.PH as ph, m.Ceniza as ceniza, m.Grasa as grasa, m.Fineza as fineza, m.Acidez as acidez, m.Estado as estado, m.Analista as analista FROM dbo.ResultadosFisico m JOIN dbo.Productos p ON p.Id=m.ProductoId WHERE p.Codigo=@p0 AND m.Anio=@p1 ORDER BY m.Mes'
      : 'SELECT m.anio, m.mes, m.fecha_analisis, m.humedad, m.ph, m.ceniza, m.grasa, m.fineza, m.acidez, m.estado, m.analista FROM resultados_fisico m JOIN productos p ON p.id=m.producto_id WHERE p.codigo=$1 AND m.anio=$2 ORDER BY m.mes',
      [req.params.codigo, anio]);
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/productos/:codigo/micro/:mes', authRequired, adminRequired, async function (req, res) {
  try {
    const b = req.body;
    const anio = parseInt(req.query.anio || '2026', 10);
    const mes = +req.params.mes;
    if (DB_TYPE === 'mssql') {
      await q(
        'UPDATE m SET RTAMV=@p0, Mohos=@p1, Coliformes=@p2, EColi=@p3, Enterobacterias=@p4, Levaduras=@p5, SAureus=@p6, ActualizadoEn=SYSUTCDATETIME() ' +
        'FROM dbo.ResultadosMicro m JOIN dbo.Productos p ON p.Id=m.ProductoId WHERE p.Codigo=@p7 AND m.Anio=@p8 AND m.Mes=@p9',
        [b.rtamv || 0, b.mohos || 0, b.coliformes || 0, b.ecoli || 0, b.enterobacterias || 0, b.levaduras || 0, b.saureus || 0, req.params.codigo, anio, mes]
      );
    } else {
      await q(
        'UPDATE resultados_micro m SET rtamv=$1, mohos=$2, coliformes=$3, ecoli=$4, enterobacterias=$5, levaduras=$6, saureus=$7, actualizado_en=NOW() ' +
        'FROM productos p WHERE p.id=m.producto_id AND p.codigo=$8 AND m.anio=$9 AND m.mes=$10',
        [b.rtamv || 0, b.mohos || 0, b.coliformes || 0, b.ecoli || 0, b.enterobacterias || 0, b.levaduras || 0, b.saureus || 0, req.params.codigo, anio, mes]
      );
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/productos/:codigo/fisico/:mes', authRequired, adminRequired, async function (req, res) {
  try {
    const b = req.body;
    const anio = parseInt(req.query.anio || '2026', 10);
    const mes = +req.params.mes;
    if (DB_TYPE === 'mssql') {
      await q(
        'UPDATE m SET Humedad=@p0, PH=@p1, Ceniza=@p2, Grasa=@p3, Fineza=@p4, Acidez=@p5, ActualizadoEn=SYSUTCDATETIME() ' +
        'FROM dbo.ResultadosFisico m JOIN dbo.Productos p ON p.Id=m.ProductoId WHERE p.Codigo=@p6 AND m.Anio=@p7 AND m.Mes=@p8',
        [b.humedad, b.ph, b.ceniza, b.grasa, b.fineza, b.acidez, req.params.codigo, anio, mes]
      );
    } else {
      await q(
        'UPDATE resultados_fisico m SET humedad=$1, ph=$2, ceniza=$3, grasa=$4, fineza=$5, acidez=$6, actualizado_en=NOW() ' +
        'FROM productos p WHERE p.id=m.producto_id AND p.codigo=$7 AND m.anio=$8 AND m.mes=$9',
        [b.humedad, b.ph, b.ceniza, b.grasa, b.fineza, b.acidez, req.params.codigo, anio, mes]
      );
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/productos/:codigo/mes', authRequired, adminRequired, async function (req, res) {
  try {
    const codigo = req.params.codigo;
    const anio = parseInt(req.body.anio || '2026', 10);
    const mes = parseInt(req.body.mes, 10);
    const fecha = req.body.fecha || (anio + '-' + String(mes).padStart(2, '0') + '-15');
    const micro = req.body.micro || {};
    const fisico = req.body.fisico || {};

    if (!Number.isFinite(anio) || anio < 2020 || anio > 2099) {
      return res.status(400).json({ error: 'Año inválido' });
    }
    if (!mes || mes < 1 || mes > 12) return res.status(400).json({ error: 'Mes inválido (1-12)' });

    if (DB_TYPE === 'mssql') {
      const prod = await q('SELECT Id as id FROM dbo.Productos WHERE Codigo=@p0 AND Activo=1', [codigo]);
      if (!prod.rows.length) return res.status(404).json({ error: 'Producto no encontrado' });
      const pid = prod.rows[0].id;

      const existsM = await q('SELECT Id FROM dbo.ResultadosMicro WHERE ProductoId=@p0 AND Anio=@p1 AND Mes=@p2', [pid, anio, mes]);
      if (existsM.rows.length) return res.status(409).json({ error: 'Ya existe ese mes para este producto' });

      await q(
        'INSERT INTO dbo.ResultadosMicro (ProductoId,Anio,Mes,FechaAnalisis,RTAMV,Mohos,Coliformes,EColi,Enterobacterias,Levaduras,SAureus,Analista,LiberadoPor) ' +
        'VALUES (@p0,@p1,@p2,@p3,@p4,@p5,@p6,@p7,@p8,@p9,@p10,N\'ZORKA\',N\'NEREYDA\')',
        [pid, anio, mes, fecha, micro.rtamv || 0, micro.mohos || 0, micro.coliformes || 0, micro.ecoli || 0, micro.enterobacterias || 0, micro.levaduras || 0, micro.saureus || 0]
      );
      await q(
        'INSERT INTO dbo.ResultadosFisico (ProductoId,Anio,Mes,FechaAnalisis,Humedad,PH,Ceniza,Grasa,Fineza,Acidez,Analista) ' +
        'VALUES (@p0,@p1,@p2,@p3,@p4,@p5,@p6,@p7,@p8,@p9,N\'NEREYDA\')',
        [pid, anio, mes, fecha, fisico.humedad != null ? fisico.humedad : null, fisico.ph != null ? fisico.ph : null, fisico.ceniza != null ? fisico.ceniza : null, fisico.grasa != null ? fisico.grasa : null, fisico.fineza != null ? fisico.fineza : null, fisico.acidez != null ? fisico.acidez : null]
      );
    } else {
      const prod2 = await q('SELECT id FROM productos WHERE codigo=$1 AND activo=true', [codigo]);
      if (!prod2.rows.length) return res.status(404).json({ error: 'Producto no encontrado' });
      const pid2 = prod2.rows[0].id;
      await q('INSERT INTO resultados_micro (producto_id,anio,mes,fecha_analisis,rtamv,mohos,coliformes,ecoli,enterobacterias,levaduras,saureus) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)', [pid2, anio, mes, fecha, micro.rtamv || 0, micro.mohos || 0, micro.coliformes || 0, micro.ecoli || 0, micro.enterobacterias || 0, micro.levaduras || 0, micro.saureus || 0]);
      await q('INSERT INTO resultados_fisico (producto_id,anio,mes,fecha_analisis,humedad,ph,ceniza,grasa,fineza,acidez) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)', [pid2, anio, mes, fecha, fisico.humedad, fisico.ph, fisico.ceniza, fisico.grasa, fisico.fineza, fisico.acidez]);
    }

    res.status(201).json({ ok: true, mes: mes, anio: anio });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.use(express.static(path.join(__dirname, '..')));
app.get('*', function (req, res) {
  if (req.path.indexOf('/api') === 0) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

initDb().then(function () {
  app.listen(PORT, function () {
    console.log('Romex QC API port ' + PORT + ' · DB ' + DB_TYPE);
  });
}).catch(function (err) {
  console.error(err);
  process.exit(1);
});
