const fs = require('fs');
const content = fs.readFileSync('reverse/perfect-landing-tt-minigame/adapter/tt-unity-adapter.js', 'utf8');
const lines = content.split('\n');
lines.forEach((l, idx) => {
  if (l.includes('unity-audio') || l.includes('AudioContext')) {
    console.log(`Line ${idx+1}: ${l}`);
  }
});
