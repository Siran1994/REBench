const fs = require('fs');

function checkFile(path) {
  const fd = fs.openSync(path, 'r');
  const buf = Buffer.alloc(32);
  fs.readSync(fd, buf, 0, 32, 0);
  fs.closeSync(fd);
  console.log(path, 'size:', fs.statSync(path).size);
  console.log('  magic hex:', buf.toString('hex'));
  console.log('  magic text:', buf.toString('latin1').replace(/[^\x20-\x7e]/g, '.'));
}

checkFile('extracted/perfect_landing_plane_pilot_package/assets_dump/audio/Ambiencem4a.wav');
checkFile('extracted/perfect_landing_plane_pilot_package/assets_dump/audio/etfx_explosion_rocketm4a.wav');
