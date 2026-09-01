'use strict';
/**
 * Seed resultados mensuales 2026 a partir del baseline (siembra).
 * Mes siguiente a siembra → diciembre.
 * Variación pequeña hasta julio; desde agosto aumenta ligeramente.
 * Idempotente: no inserta filas que ya existen.
 */

function clamp(n, min, max) {
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

/** Pseudo-aleatorio estable por producto+mes */
function jitter(codigo, mes, salt) {
  var s = 0;
  var str = codigo + '|' + mes + '|' + (salt || 0);
  for (var i = 0; i < str.length; i++) s = (s * 31 + str.charCodeAt(i)) >>> 0;
  return ((s % 1000) / 1000);
}

function buildMonths(codigo, bl) {
  var mesInicio = +(bl.mesInicio || 5);
  var micro0 = bl.micro || {};
  var fisico0 = bl.fisico || {};
  var rows = [];
  var idx = 0;
  for (var mes = mesInicio + 1; mes <= 12; mes++) {
    idx++;
    var j = jitter(codigo, mes, 1);
    var j2 = jitter(codigo, mes, 2);
    var j3 = jitter(codigo, mes, 3);
    var mild = 1 + idx * 0.028;
    var aug = mes >= 8 ? 1 + (mes - 7) * 0.035 : 1;
    var factor = mild * aug * (0.97 + j * 0.06);

    var micro = {
      rtamv: micro0.rtamv != null ? Math.max(0, Math.round(+micro0.rtamv * factor)) : 0,
      mohos: micro0.mohos != null && +micro0.mohos > 0
        ? Math.max(0, Math.round(+micro0.mohos * (1 + idx * 0.03 * (mes >= 8 ? 1.4 : 1)) * (0.95 + j2 * 0.1)))
        : (mes >= 6 && j3 > 0.55 ? Math.min(3, Math.floor(idx * 0.35)) : 0),
      coliformes: 0,
      ecoli: 0,
      enterobacterias: 0,
      levaduras: micro0.levaduras != null && +micro0.levaduras > 0
        ? Math.max(0, Math.round(+micro0.levaduras * factor))
        : (mes >= 6 && j > 0.6 ? Math.min(2, Math.floor(idx * 0.25)) : 0),
      saureus: 0
    };

    var fisico = {
      humedad: fisico0.humedad != null
        ? round2(+fisico0.humedad * (1 + idx * 0.018 * (mes >= 8 ? 1.4 : 1)) * (0.97 + j * 0.06))
        : null,
      ph: fisico0.ph != null
        ? round2(+fisico0.ph + idx * 0.005 * (mes >= 8 ? 1.2 : 1) + (j2 - 0.5) * 0.02)
        : null,
      ceniza: fisico0.ceniza != null
        ? round2(+fisico0.ceniza * (1 + idx * 0.012 * (mes >= 8 ? 1.25 : 1)) * (0.97 + j3 * 0.06))
        : null,
      grasa: fisico0.grasa != null
        ? round2(+fisico0.grasa * (1 + idx * 0.012 * (mes >= 8 ? 1.25 : 1)) * (0.97 + j * 0.06))
        : null,
      fineza: fisico0.fineza != null
        ? round2(Math.min(99.99, +fisico0.fineza - idx * 0.02 * (mes >= 8 ? 1.3 : 1) + (j2 - 0.5) * 0.05))
        : null,
      acidez: fisico0.acidez != null
        ? round2(+fisico0.acidez * (1 + idx * 0.015 * (mes >= 8 ? 1.35 : 1)) * (0.97 + j3 * 0.06))
        : null
    };

    rows.push({
      mes: mes,
      fecha: '2026-' + String(mes).padStart(2, '0') + '-15',
      micro: micro,
      fisico: fisico
    });
  }
  return rows;
}

function defaultBaselines() {
  return {
    torta_natural: {
      mesInicio: 3,
      micro: { rtamv: 863, mohos: 11, coliformes: 0, ecoli: 0, enterobacterias: 0, levaduras: 0, saureus: 0 },
      fisico: { humedad: 2.22, ph: 5.4, ceniza: 8.3, grasa: 12.11 }
    },
    torta_alcalina: {
      mesInicio: 3,
      micro: { rtamv: 40, mohos: 0, coliformes: 0, ecoli: 0, enterobacterias: 0, levaduras: 0, saureus: 0 },
      fisico: { humedad: 3.54, ph: 6.81, ceniza: 11.6, grasa: 11.68 }
    },
    cocoa_natural: {
      mesInicio: 5,
      micro: { rtamv: 1238, mohos: 15, coliformes: 0, ecoli: 0, enterobacterias: 0, levaduras: 0, saureus: 0 },
      fisico: { humedad: 2.49, ph: 5.39, ceniza: 8.2, grasa: 11.8, fineza: 99.49 }
    },
    cocoa_alcalina: {
      mesInicio: 3,
      micro: { rtamv: 1250, mohos: 0, coliformes: 0, ecoli: 0, enterobacterias: 0, levaduras: 0, saureus: 0 },
      fisico: { humedad: 2.76, ph: 6.87, ceniza: 10.3, grasa: 11.62, fineza: 98.51 }
    },
    licor: {
      mesInicio: 5,
      micro: { rtamv: 300, mohos: 0, coliformes: 0, ecoli: 0, enterobacterias: 0, levaduras: 0, saureus: 0 },
      fisico: { humedad: 0.55, ph: 5.42, ceniza: 3.9, grasa: 48.65, fineza: 99.74, acidez: 2.1 }
    },
    manteca: {
      mesInicio: 3,
      micro: { rtamv: 50, mohos: 0, coliformes: 0, ecoli: 0, enterobacterias: 0, levaduras: 0, saureus: 0 },
      fisico: { humedad: 0.02, acidez: 1.64 }
    }
  };
}

async function seedMonthlyResults(q, DB_TYPE, baselinesProducts) {
  var blMap = baselinesProducts || defaultBaselines();
  var analista = 'Nereyda Huachua Flores';
  var inserted = 0;
  var codes = Object.keys(blMap);
  for (var i = 0; i < codes.length; i++) {
    var codigo = codes[i];
    var bl = blMap[codigo];
    if (!bl) continue;
    var months = buildMonths(codigo, bl);
    var prod;
    if (DB_TYPE === 'mssql') {
      prod = await q('SELECT Id as id FROM dbo.Productos WHERE Codigo=@p0 AND Activo=1', [codigo]);
    } else {
      prod = await q('SELECT id FROM productos WHERE codigo=$1 AND activo=true', [codigo]);
    }
    if (!prod.rows.length) continue;
    var pid = prod.rows[0].id;
    for (var j = 0; j < months.length; j++) {
      var row = months[j];
      var m = row.micro;
      var f = row.fisico;
      var fecha = row.fecha;
      var mes = row.mes;
      var anio = 2026;
      if (DB_TYPE === 'mssql') {
        var em = await q('SELECT Id FROM dbo.ResultadosMicro WHERE ProductoId=@p0 AND Anio=@p1 AND Mes=@p2', [pid, anio, mes]);
        if (!em.rows.length) {
          await q(
            'INSERT INTO dbo.ResultadosMicro (ProductoId,Anio,Mes,FechaAnalisis,RTAMV,Mohos,Coliformes,EColi,Enterobacterias,Levaduras,SAureus,Estado,Analista,LiberadoPor) VALUES (@p0,@p1,@p2,@p3,@p4,@p5,@p6,@p7,@p8,@p9,@p10,@p11,@p12,@p13)',
            [pid, anio, mes, fecha, m.rtamv, m.mohos, m.coliformes, m.ecoli, m.enterobacterias, m.levaduras, m.saureus, 'LIBERADO', analista, analista]
          );
          inserted++;
        }
        var ef = await q('SELECT Id FROM dbo.ResultadosFisico WHERE ProductoId=@p0 AND Anio=@p1 AND Mes=@p2', [pid, anio, mes]);
        if (!ef.rows.length) {
          await q(
            'INSERT INTO dbo.ResultadosFisico (ProductoId,Anio,Mes,FechaAnalisis,Humedad,PH,Ceniza,Grasa,Fineza,Acidez,Estado,Analista) VALUES (@p0,@p1,@p2,@p3,@p4,@p5,@p6,@p7,@p8,@p9,@p10,@p11)',
            [pid, anio, mes, fecha, f.humedad, f.ph, f.ceniza, f.grasa, f.fineza, f.acidez, 'CONFORME', analista]
          );
          inserted++;
        }
      } else {
        var em2 = await q('SELECT id FROM resultados_micro WHERE producto_id=$1 AND anio=$2 AND mes=$3', [pid, anio, mes]);
        if (!em2.rows.length) {
          await q(
            'INSERT INTO resultados_micro (producto_id,anio,mes,fecha_analisis,rtamv,mohos,coliformes,ecoli,enterobacterias,levaduras,saureus,estado,analista) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)',
            [pid, anio, mes, fecha, m.rtamv, m.mohos, m.coliformes, m.ecoli, m.enterobacterias, m.levaduras, m.saureus, 'LIBERADO', analista]
          );
          inserted++;
        }
        var ef2 = await q('SELECT id FROM resultados_fisico WHERE producto_id=$1 AND anio=$2 AND mes=$3', [pid, anio, mes]);
        if (!ef2.rows.length) {
          await q(
            'INSERT INTO resultados_fisico (producto_id,anio,mes,fecha_analisis,humedad,ph,ceniza,grasa,fineza,acidez,estado,analista) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',
            [pid, anio, mes, fecha, f.humedad, f.ph, f.ceniza, f.grasa, f.fineza, f.acidez, 'CONFORME', analista]
          );
          inserted++;
        }
      }
    }
  }
  return inserted;
}

module.exports = {
  seedMonthlyResults: seedMonthlyResults,
  buildMonths: buildMonths,
  defaultBaselines: defaultBaselines
};
