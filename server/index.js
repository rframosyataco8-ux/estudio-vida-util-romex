require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const DB_TYPE = (process.env.DB_TYPE || 'postgres').toLowerCase();
let pool = null;

async function initDb() {
  if (DB_TYPE === 'mssql') {
    const sql = require('mssql');
    pool = await sql.connect({
      server: process.env.MSSQL_SERVER || 'localhost',
      database: process.env.MSSQL_DATABASE || 'RomexQC',
      user: process.env.MSSQL_USER || 'sa',
      password: process.env.MSSQL_PASSWORD || '',
      options: { encrypt: process.env.MSSQL_ENCRYPT === 'true', trustServerCertificate: true }
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
    params.forEach(function(v, i) { req.input('p' + i, v); });
    var i = 0;
    var mssqlText = text.replace(/\$(\d+)/g, function() { return '@p' + (i++); });
    var r = await req.query(mssqlText);
    return { rows: r.recordset || [] };
  }
  return pool.query(text, params);
}

app.get('/api/health', function(_, res) { res.json({ ok: true, db: DB_TYPE }); });

app.get('/api/productos', async function(_, res) {
  try {
    var r = await q(DB_TYPE === 'mssql'
      ? 'SELECT Id as id, Codigo as codigo, Nombre as nombre, Lote as lote FROM dbo.Productos WHERE Activo = 1 ORDER BY Id'
      : 'SELECT id, codigo, nombre, lote FROM productos WHERE activo = true ORDER BY id');
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/productos/:codigo/micro', async function(req, res) {
  try {
    var anio = parseInt(req.query.anio || '2026', 10);
    var r = await q(DB_TYPE === 'mssql'
      ? 'SELECT m.Anio as anio, m.Mes as mes, m.FechaAnalisis as fecha_analisis, m.RTAMV as rtamv, m.Mohos as mohos, m.Coliformes as coliformes, m.EColi as ecoli, m.Enterobacterias as enterobacterias, m.Levaduras as levaduras, m.SAureus as saureus, m.Estado as estado, m.Analista as analista, m.LiberadoPor as liberado_por FROM dbo.ResultadosMicro m JOIN dbo.Productos p ON p.Id = m.ProductoId WHERE p.Codigo = @p0 AND m.Anio = @p1 ORDER BY m.Mes'
      : 'SELECT m.anio, m.mes, m.fecha_analisis, m.rtamv, m.mohos, m.coliformes, m.ecoli, m.enterobacterias, m.levaduras, m.saureus, m.estado, m.analista, m.liberado_por FROM resultados_micro m JOIN productos p ON p.id = m.producto_id WHERE p.codigo = $1 AND m.anio = $2 ORDER BY m.mes',
      [req.params.codigo, anio]);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/productos/:codigo/fisico', async function(req, res) {
  try {
    var anio = parseInt(req.query.anio || '2026', 10);
    var r = await q(DB_TYPE === 'mssql'
      ? 'SELECT m.Anio as anio, m.Mes as mes, m.FechaAnalisis as fecha_analisis, m.Humedad as humedad, m.PH as ph, m.Ceniza as ceniza, m.Grasa as grasa, m.Fineza as fineza, m.Acidez as acidez, m.Estado as estado, m.Analista as analista FROM dbo.ResultadosFisico m JOIN dbo.Productos p ON p.Id = m.ProductoId WHERE p.Codigo = @p0 AND m.Anio = @p1 ORDER BY m.Mes'
      : 'SELECT m.anio, m.mes, m.fecha_analisis, m.humedad, m.ph, m.ceniza, m.grasa, m.fineza, m.acidez, m.estado, m.analista FROM resultados_fisico m JOIN productos p ON p.id = m.producto_id WHERE p.codigo = $1 AND m.anio = $2 ORDER BY m.mes',
      [req.params.codigo, anio]);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/productos/:codigo/micro/:mes', async function(req, res) {
  try {
    var b = req.body, anio = parseInt(req.query.anio || '2026', 10), mes = +req.params.mes;
    if (DB_TYPE === 'mssql') {
      await q('UPDATE m SET RTAMV=@p0, Mohos=@p1, Coliformes=@p2, EColi=@p3, Enterobacterias=@p4, Levaduras=@p5, SAureus=@p6, ActualizadoEn=SYSUTCDATETIME() FROM dbo.ResultadosMicro m JOIN dbo.Productos p ON p.Id = m.ProductoId WHERE p.Codigo=@p7 AND m.Anio=@p8 AND m.Mes=@p9',
        [b.rtamv, b.mohos, b.coliformes, b.ecoli, b.enterobacterias, b.levaduras, b.saureus, req.params.codigo, anio, mes]);
    } else {
      await q('UPDATE resultados_micro m SET rtamv=$1, mohos=$2, coliformes=$3, ecoli=$4, enterobacterias=$5, levaduras=$6, saureus=$7, actualizado_en=NOW() FROM productos p WHERE p.id = m.producto_id AND p.codigo=$8 AND m.anio=$9 AND m.mes=$10',
        [b.rtamv, b.mohos, b.coliformes, b.ecoli, b.enterobacterias, b.levaduras, b.saureus, req.params.codigo, anio, mes]);
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/productos/:codigo/fisico/:mes', async function(req, res) {
  try {
    var b = req.body, anio = parseInt(req.query.anio || '2026', 10), mes = +req.params.mes;
    if (DB_TYPE === 'mssql') {
      await q('UPDATE m SET Humedad=@p0, PH=@p1, Ceniza=@p2, Grasa=@p3, Fineza=@p4, Acidez=@p5, ActualizadoEn=SYSUTCDATETIME() FROM dbo.ResultadosFisico m JOIN dbo.Productos p ON p.Id = m.ProductoId WHERE p.Codigo=@p6 AND m.Anio=@p7 AND m.Mes=@p8',
        [b.humedad, b.ph, b.ceniza, b.grasa, b.fineza, b.acidez, req.params.codigo, anio, mes]);
    } else {
      await q('UPDATE resultados_fisico m SET humedad=$1, ph=$2, ceniza=$3, grasa=$4, fineza=$5, acidez=$6, actualizado_en=NOW() FROM productos p WHERE p.id = m.producto_id AND p.codigo=$7 AND m.anio=$8 AND m.mes=$9',
        [b.humedad, b.ph, b.ceniza, b.grasa, b.fineza, b.acidez, req.params.codigo, anio, mes]);
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.use(express.static(path.join(__dirname, '..')));
app.get('*', function(req, res) {
  if (req.path.indexOf('/api') === 0) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

initDb().then(function() {
  app.listen(PORT, function() { console.log('Romex QC API port ' + PORT); });
}).catch(function(err) { console.error(err); process.exit(1); });
