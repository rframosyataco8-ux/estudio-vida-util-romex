'use strict';
/**
 * Arranque Romex QC:
 * 1) Levanta la API (crea schema si hace falta)
 * 2) Tras unos segundos aplica seed mensual (idempotente)
 */
require('dotenv').config();
try { require('dotenv').config({ path: require('path').join(__dirname, '.env') }); } catch (e) {}

const { seedMonthlyResults, defaultBaselines } = require('./seed-monthly');

async function runSeed(label) {
  var DB_TYPE = (process.env.DB_TYPE || 'postgres').toLowerCase();
  var pool = null;

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

  try {
    if (DB_TYPE === 'mssql') {
      var sql = require('mssql');
      pool = await sql.connect({
        server: process.env.MSSQL_SERVER || 'localhost',
        database: process.env.MSSQL_DATABASE || 'RomexQC',
        user: process.env.MSSQL_USER || 'sa',
        password: process.env.MSSQL_PASSWORD || '',
        options: { encrypt: process.env.MSSQL_ENCRYPT === 'true', trustServerCertificate: true }
      });
    } else {
      if (!process.env.DATABASE_URL) {
        console.warn('[Romex seed] sin DATABASE_URL — omitido');
        return;
      }
      var Pool = require('pg').Pool;
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      });
      await pool.query('SELECT 1');
    }

    var n = await seedMonthlyResults(q, DB_TYPE, defaultBaselines());
    console.log('[Romex seed' + (label ? ' ' + label : '') + '] filas insertadas:', n);
  } catch (e) {
    console.warn('[Romex seed] error:', e.message);
  } finally {
    try {
      if (pool) {
        if (DB_TYPE === 'mssql') await pool.close();
        else await pool.end();
      }
    } catch (e2) {}
  }
}

// 1) API primero (schema + listen)
require('./index.js');

// 2) Seed cuando la DB ya está lista (reintentos)
setTimeout(function () { runSeed('t+4s'); }, 4000);
setTimeout(function () { runSeed('t+12s'); }, 12000);
