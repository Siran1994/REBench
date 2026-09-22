const fs = require('fs');
const zlib = require('zlib');

// Read the resources from unpacked data
const dataRaw = fs.readFileSync('reverse/perfect-landing-tt-minigame/data/a22d7abc1ee3cd7b71a65e48bb3d9b2e.bin');
let dataBuf = zlib.gunzipSync(dataRaw);
const dv = new DataView(dataBuf.buffer, dataBuf.byteOffset, dataBuf.byteLength);

let pos = 16;
const headerLength = dv.getInt32(pos, true);
pos += 4;

let files = {};
while (pos < headerLength) {
  const offset = dv.getInt32(pos, true); pos += 4;
  const length = dv.getInt32(pos, true); pos += 4;
  const pathLen = dv.getInt32(pos, true); pos += 4;
  const path = dataBuf.toString('utf8', pos, pos + pathLen); pos += pathLen;
  files[path] = dataBuf.slice(offset, offset + length);
}

console.log('Extracted files from data archive:');
for (let p in files) {
  console.log(' ', p, files[p].length, 'bytes');
}

const s1 = files['resources.resource'];
const s2 = files['sharedassets0.resource'];

console.log('s1 (explosion):', s1.length, 'magic:', s1.slice(4, 8).toString('ascii'));
console.log('s2 (ambience):', s2.length, 'magic:', s2.slice(4, 8).toString('ascii'));
