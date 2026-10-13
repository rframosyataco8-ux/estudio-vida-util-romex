/**
 * Romex QC API v1.5.8
 * Producción Render · PostgreSQL · estáticos · no-cache HTML/JS/CSS
 * PUT /api/baselines/:codigo — solo ADMIN edita punto de partida (siembra)
 */
'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;
const DB_TYPE = (process.env.DB_TYPE || 'mssql').toLowerCase();
const TOKEN_HOURS = 12;
const BCRYPT_ROUNDS = 10;
const IS_PROD = process.env.NODE_ENV === 'production';
const VERSION = '1.5.8';

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
  if (DB_TYPE === 'mssql') await q('UPDATE dbo.Usuarios SET PasswordHash=@p0 WHERE Id=@p1', [hash, userId]);
  else await q('UPDATE usuarios SET password_hash=$1 WHERE id=$2', [hash, userId]);
}
function slugify(name) {
  return String(name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40) || ('prod_' + Date.now());
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
    if (!Number.isFinite(n) || n < 0 || n > 10000000) return { error: 'Valor inválido en ' + k };
    out[k] = n;
  }
  return { data: out };
}
function validateFisicoBody(b) {
  var fields = { humedad: [0, 100], ph: [0, 14], ceniza: [0, 100], grasa: [0, 100], fineza: [0, 100], acidez: [0, 100] };
  var out = {};
  for (var k in fields) {
    if (!Object.prototype.hasOwnProperty.call(fields, k)) continue;
    var v = toNumOrNull(b[k]);
    if (v === null) { out[k] = null; continue; }
    if (v < fields[k][0] || v > fields[k][1]) return { error: k + ' fuera de rango' };
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
    if (lim.max != null && n > lim.max) alerts.push({ campo: k, label: lim.label, valor: n, limite: lim.max, tipo: 'max' });
    if (lim.min != null && n < lim.min) alerts.push({ campo: k, label: lim.label, valor: n, limite: lim.min, tipo: 'min' });
  });
  return alerts;
}

var BASELINES_PATH = path.join(__dirname, '..', 'data', 'baselines.json');
var baselinesCache = null;

function readBaselinesFile() {
  try {
    var raw = fs.readFileSync(BASELINES_PATH, 'utf8');
    baselinesCache = JSON.parse(raw);
  } catch (e) {
    if (!baselinesCache) baselinesCache = { products: {} };
  }
  if (!baselinesCache.products) baselinesCache.products = {};
  return baselinesCache;
}

function writeBaselinesFile(data) {
  baselinesCache = data;
  fs.writeFileSync(BASELINES_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

async function ensurePostgresSchema() {
  var check = await pool.query("SELECT to_regclass('public.usuarios') AS t");
  if (check.rows[0] && check.rows[0].t) {
    console.log('Schema Postgres ya existe');
    return;
  }
  console.log('Creando schema Postgres + seed usuarios...');
  var schema = `
CREATE TABLE IF NOT EXISTS productos (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(50) NOT NULL UNIQUE,
  nombre VARCHAR(120) NOT NULL,
  lote VARCHAR(30) NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS resultados_micro (
  id SERIAL PRIMARY KEY,
  producto_id INT NOT NULL REFERENCES productos(id),
  anio INT NOT NULL,
  mes INT NOT NULL CHECK (mes BETWEEN 1 AND 12),
  fecha_analisis DATE NULL,
  rtamv INT NOT NULL DEFAULT 0,
  mohos INT NOT NULL DEFAULT 0,
  coliformes INT NOT NULL DEFAULT 0,
  ecoli INT NOT NULL DEFAULT 0,
  enterobacterias INT NOT NULL DEFAULT 0,
  levaduras INT NOT NULL DEFAULT 0,
  saureus INT NOT NULL DEFAULT 0,
  estado VARCHAR(20) NOT NULL DEFAULT 'LIBERADO',
  analista VARCHAR(80) NULL,
  liberado_por VARCHAR(80) NULL,
  notas VARCHAR(500) NULL,
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (producto_id, anio, mes)
);
CREATE TABLE IF NOT EXISTS resultados_fisico (
  id SERIAL PRIMARY KEY,
  producto_id INT NOT NULL REFERENCES productos(id),
  anio INT NOT NULL,
  mes INT NOT NULL CHECK (mes BETWEEN 1 AND 12),
  fecha_analisis DATE NULL,
  humedad NUMERIC(8,2) NULL,
  ph NUMERIC(6,2) NULL,
  ceniza NUMERIC(8,2) NULL,
  grasa NUMERIC(8,2) NULL,
  fineza NUMERIC(8,2) NULL,
  acidez NUMERIC(8,2) NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'CONFORME',
  analista VARCHAR(80) NULL,
  notas VARCHAR(500) NULL,
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (producto_id, anio, mes)
);
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  usuario VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  nombre VARCHAR(120) NOT NULL,
  rol VARCHAR(20) NOT NULL CHECK (rol IN ('ADMIN', 'LECTOR')),
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS sesiones (
  id SERIAL PRIMARY KEY,
  usuario_id INT NOT NULL REFERENCES usuarios(id),
  token VARCHAR(64) NOT NULL UNIQUE,
  expira_en TIMESTAMPTZ NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_sesiones_token ON sesiones(token);
CREATE INDEX IF NOT EXISTS ix_sesiones_expira ON sesiones(expira_en);
CREATE INDEX IF NOT EXISTS ix_micro_anio_mes ON resultados_micro(anio, mes);
CREATE INDEX IF NOT EXISTS ix_fisico_anio_mes ON resultados_fisico(anio, mes);
CREATE TABLE IF NOT EXISTS auditoria (
  id SERIAL PRIMARY KEY,
  usuario_id INT NULL,
  usuario_nombre VARCHAR(120) NULL,
  accion VARCHAR(40) NOT NULL,
  entidad VARCHAR(40) NOT NULL,
  codigo VARCHAR(50) NULL,
  anio INT NULL,
  mes INT NULL,
  detalle TEXT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_auditoria_creado ON auditoria(creado_en DESC);
`;
  await pool.query(schema);
  await pool.query(`
INSERT INTO usuarios (usuario, password_hash, nombre, rol)
SELECT 'admin', '$2b$10$WykcXWAGgghC5WAaYiMP1OEn2qzcASR6OMPHBjL3eUvjsbcodFVPS', 'Administrador', 'ADMIN'
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE usuario = 'admin');
INSERT INTO usuarios (usuario, password_hash, nombre, rol)
SELECT 'rodrigo', '$2b$10$n8.K3cUxp/RKt2IcdW3JM.5IUStcJw5PTRwmh3kB4I.mDYNVjOaay', 'Rodrigo / Admin', 'ADMIN'
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE usuario = 'rodrigo');
INSERT INTO usuarios (usuario, password_hash, nombre, rol)
SELECT 'nereyda', '$2b$10$jBMw1GBBgj8TMFzVR2PbvepnDd8WgS38IphhWp2u0lPlOEUaJVOmS', 'Nereyda Huachua Flores', 'ADMIN'
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE usuario = 'nereyda');
INSERT INTO usuarios (usuario, password_hash, nombre, rol)
SELECT 'lector', '$2b$10$YYSFWFTNUQdz9KJTu2QXDuJIQYOxef9oCAZbQ4sY9vFVU2vqKG6PS', 'Usuario Solo Lectura', 'LECTOR'
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE usuario = 'lector');
`);
  await pool.query(`
INSERT INTO productos (codigo, nombre, lote)
SELECT v.codigo, v.nombre, v.lote FROM (VALUES
  ('torta_natural', 'Torta Natural de Cacao', '44260304'),
  ('torta_alcalina', 'Torta Alcalina de Cacao', '13260318'),
  ('cocoa_natural', 'Cocoa Natural', '11260513'),
  ('cocoa_alcalina', 'Cocoa Alcalina', '07260324'),
  ('licor', 'Licor de Cacao', '260516'),
  ('manteca', 'Manteca de Cacao', '19260321')
) AS v(codigo, nombre, lote)
WHERE NOT EXISTS (SELECT 1 FROM productos p WHERE p.codigo = v.codigo);
`);
  console.log('Schema + seed listos');
}

async function initDb() {
  if (DB_TYPE === 'mssql') {
    var sql = require('mssql');
    pool = await sql.connect({
      server: process.env.MSSQL_SERVER || 'localhost',
      database: process.env.MSSQL_DATABASE || 'RomexQC',
      user: process.env.MSSQL_USER || 'sa',
      password: process.env.MSSQL_PASSWORD || '',
      options: { encrypt: process.env.MSSQL_ENCRYPT === 'true', trustServerCertificate: true }
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
    await ensurePostgresSchema();
  }
  try { readBaselinesFile(); } catch (e) { console.warn('baselines:', e.message); }
}

/** Si existe RESET_ADMIN_PASS en el entorno, fuerza la contraseña del usuario admin.
 *  Úsalo una sola vez en Render, luego BORRA la variable de entorno.
 *  Ejemplo: RESET_ADMIN_PASS=admin123
 */
async function maybeResetAdminPassword() {
  var plain = process.env.RESET_ADMIN_PASS;
  if (!plain || String(plain).trim().length < 4) return;
  plain = String(plain).trim();
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
