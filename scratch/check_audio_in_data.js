const fs = require('fs');
const buf = fs.readFileSync('reverse/perfect-landing-tt-minigame/data/a22d7abc1ee3cd7b71a65e48bb3d9b2e.bin');
console.log('Data file size:', buf.length);
const s = buf.toString('latin1');
const audios = ['AudioClip', '.mp3', '.ogg', '.wav', '.m4a', 'FMOD', 'OggS', 'ID3'];
audios.forEach(a => {
  let count = 0, pos = 0;
  while ((pos = s.indexOf(a, pos)) !== -1) {
    count++;
    pos += a.length;
  }
  console.log(a, ':', count);
});
