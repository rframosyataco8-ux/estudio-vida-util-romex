'use strict';
const fs = require('fs');
const path = require('path');
const realPath = path.join(__dirname, 'index-real.js');
if (!fs.existsSync(realPath) || fs.statSync(realPath).size < 1000) {
  var parts = [];
  for (var i = 0; i < 20; i++) {
    var p = path.join(__dirname, 'index.b64.' + i);
    if (!fs.existsSync(p)) break;
    parts.push(fs.readFileSync(p, 'utf8'));
  }
  fs.writeFileSync(realPath, Buffer.from(parts.join(''), 'base64'));
  console.log('[boot] index-real.js written, size', fs.statSync(realPath).size);
}
require(realPath);
