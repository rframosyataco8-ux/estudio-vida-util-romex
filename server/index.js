'use strict';
/**
 * Bootstrap temporal: descarga index completo del commit bueno si no existe local.
 * Luego aplica reset de admin.
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const real = path.join(__dirname, 'index-real.js');

function download(url) {
  return new Promise(function (resolve, reject) {
    https.get(url, function (res) {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return download(res.headers.location).then(resolve, reject);
      }
      if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode));
      var chunks = [];
      res.on('data', function (c) { chunks.push(c); });
      res.on('end', function () { resolve(Buffer.concat(chunks).toString('utf8')); });
    }).on('error', reject);
  });
}

async function main() {
  if (!fs.existsSync(real) || fs.statSync(real).size < 5000) {
    var url = 'https://raw.githubusercontent.com/rframosyataco8-ux/estudio-vida-util-romex/3f3e419457900dcf6dedff0e4e21e24004e20f13/server/index.js';
    console.log('[boot] Descargando index.js del commit estable...');
    var text = await download(url);
    // Parche v1.5.8: version + reset
    text = text.replace("const VERSION = '1.5.7';", "const VERSION = '1.5.8';");
    text = text.replace('Romex QC API v1.5.7', 'Romex QC API v1.5.8');
    if (text.indexOf("require('./reset-admin')") < 0) {
      text = text.replace(
        "require('./user-mgmt')(app, {",
        "var maybeResetAdminPassword = require('./reset-admin');\nrequire('./user-mgmt')(app, {"
      );
    }
    var oldListen = "initDb().then(function () {\n  app.listen(PORT, '0.0.0.0', function () {\n    console.log('Romex QC API v' + VERSION + ' · port ' + PORT + ' · DB ' + DB_TYPE + ' · ' + (IS_PROD ? 'PRODUCTION' : 'dev'));\n  });\n})";
    var newListen = "initDb().then(function () {\n  return maybeResetAdminPassword({ bcrypt: bcrypt, BCRYPT_ROUNDS: BCRYPT_ROUNDS, DB_TYPE: DB_TYPE, q: q });\n}).then(function () {\n  app.listen(PORT, '0.0.0.0', function () {\n    console.log('Romex QC API v' + VERSION + ' · port ' + PORT + ' · DB ' + DB_TYPE + ' · ' + (IS_PROD ? 'PRODUCTION' : 'dev'));\n  });\n})";
    if (text.indexOf('maybeResetAdminPassword({') < 0) {
      text = text.replace(oldListen, newListen);
    }
    fs.writeFileSync(real, text);
    console.log('[boot] index-real.js listo (' + text.length + ' bytes)');
  }
  require(real);
}
main().catch(function (e) {
  console.error('[boot] FATAL', e);
  process.exit(1);
});
