const fs = require('fs');
const zlib = require('zlib');

// Read data file
const raw = fs.readFileSync('reverse/perfect-landing-tt-minigame/data/a22d7abc1ee3cd7b71a65e48bb3d9b2e.bin');
let dataBuf;
try {
  dataBuf = zlib.gunzipSync(raw);
} catch (e) {
  dataBuf = raw;
}

console.log('Unpacked data size:', dataBuf.length);

// Let's unpack the UnityWebData1.0 archive
const headerStr = dataBuf.toString('ascii', 0, 16);
console.log('Archive header:', headerStr);

if (headerStr.startsWith('UnityWebData1.0')) {
  const dv = new DataView(dataBuf.buffer, dataBuf.byteOffset, dataBuf.byteLength);
  let pos = 16;
  const headerLength = dv.getInt32(pos, true);
  pos += 4;
  console.log('Header length:', headerLength);
  
  let files = [];
  while (pos < headerLength) {
    const offset = dv.getInt32(pos, true);
    pos += 4;
    const length = dv.getInt32(pos, true);
    pos += 4;
    const pathLen = dv.getInt32(pos, true);
    pos += 4;
    const path = dataBuf.toString('utf8', pos, pos + pathLen);
    pos += pathLen;
    files.push({ path, offset, length });
  }
  console.log('Total files in archive:', files.length);
  files.forEach(f => {
    console.log(`  File: ${f.path}, offset: ${f.offset}, length: ${f.length} (${(f.length/1024).toFixed(1)} KB)`);
  });
}
