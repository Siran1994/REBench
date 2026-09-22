const fs = require('fs');
const zlib = require('zlib');
const raw = fs.readFileSync('extracted/perfect_landing_plane_pilot_package/Build/0b14ddffb6d6867f4577189187985cab.framework.js.unityweb');
let content;
try {
  content = zlib.gunzipSync(raw).toString('utf8');
} catch (e) {
  content = raw.toString('utf8');
}

const pos = content.indexOf('function _JS_Sound_Load(');
console.log('Original _JS_Sound_Load:');
console.log(content.substring(pos, pos + 1000));
