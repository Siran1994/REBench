const fs = require('fs');

function checkFile(path) {
  const fd = fs.openSync(path, 'r');
  const buf = Buffer.alloc(16);
  fs.readSync(fd, buf, 0, 16, 0);
  fs.closeSync(fd);
  console.log(path, 'magic:', buf, 'utf8:', buf.toString('latin1').substring(0, 8));
}

checkFile('reverse/perfect-landing-tt-minigame/wasm/78675d3236180fa3ceddab8a23a2032e.wasm.bin');
checkFile('reverse/perfect-landing-tt-minigame/wasm/78675d3236180fa3ceddab8a23a2032e.wasm.br');
checkFile('reverse/perfect-landing-tt-minigame/data/a22d7abc1ee3cd7b71a65e48bb3d9b2e.bin');
