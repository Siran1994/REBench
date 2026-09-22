const fs = require('fs');
const zlib = require('zlib');

// Try reading the data file
let dataBuf;
const raw = fs.readFileSync('extracted/perfect_landing_plane_pilot_package/Build/a22d7abc1ee3cd7b71a65e48bb3d9b2e.data.unityweb');
try {
  dataBuf = zlib.gunzipSync(raw);
  console.log('Gunzipped size:', dataBuf.length);
} catch (e) {
  dataBuf = raw;
  console.log('Raw size:', dataBuf.length);
}

// Search for audio signatures in dataBuf
// RIFF....WAVE
// ftyp (m4a / mp4)
// ID3 or 0xFF 0xFB (mp3)
// OggS (ogg)
function findSignatures(buf) {
  console.log('Scanning for audio signatures in unpacked data...');
  for (let i = 0; i < buf.length - 16; i++) {
    // RIFF....WAVE
    if (buf[i] === 0x52 && buf[i+1] === 0x49 && buf[i+2] === 0x46 && buf[i+3] === 0x46 &&
        buf[i+8] === 0x57 && buf[i+9] === 0x41 && buf[i+10] === 0x56 && buf[i+11] === 0x45) {
      console.log(`Found WAV at offset ${i}`);
    }
    // ftyp (mp4/m4a)
    if (buf[i+4] === 0x66 && buf[i+5] === 0x74 && buf[i+6] === 0x79 && buf[i+7] === 0x70) {
      console.log(`Found MP4/M4A ftyp at offset ${i}`);
    }
    // OggS
    if (buf[i] === 0x4f && buf[i+1] === 0x67 && buf[i+2] === 0x67 && buf[i+3] === 0x53) {
      console.log(`Found OggS at offset ${i}`);
    }
    // MP3 ID3
    if (buf[i] === 0x49 && buf[i+1] === 0x44 && buf[i+2] === 0x33) {
      console.log(`Found MP3 ID3 at offset ${i}`);
    }
    // MP3 sync word: 0xFF 0xFB or 0xFF 0xF3
    if (buf[i] === 0xff && (buf[i+1] & 0xfe) === 0xfa) {
      // check if header valid
      // just log if rare
    }
  }
}
findSignatures(dataBuf);
