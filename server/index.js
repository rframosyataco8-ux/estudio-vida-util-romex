'use strict';
/**
 * Carga el index.js del commit estable 3f3e419 (comportamiento original).
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
  var url = 'https://raw.githubusercontent.com/rframosyataco8-ux/estudio-vida-util-romex/3f3e419457900dcf6dedff0e4e21e24004e20f13/server/index.js';
  var text = await download(url);
  fs.writeFileSync(real, text);
  require(real);
}
main().catch(function (e) {
  console.error(e);
  process.exit(1);
});
