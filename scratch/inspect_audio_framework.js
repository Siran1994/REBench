const fs = require('fs');
const content = fs.readFileSync('reverse/perfect-landing-tt-minigame/Build/0b14ddffb6d6867f4577189187985cab.framework.js', 'utf8');
const lines = content.split('\n');
console.log('Total lines:', lines.length);
lines.forEach((line, idx) => {
  if (line.includes('AudioContext') || line.includes('_JS_Sound_') || line.includes('WEBAudio') || line.includes('createGain') || line.includes('audioContext')) {
    console.log(`Line ${idx + 1}: length ${line.length}`);
    // Print snippet around matches
    let pos = 0;
    while ((pos = line.indexOf('AudioContext', pos)) !== -1) {
      console.log(`  [AudioContext match at ${pos}]: ${line.substring(Math.max(0, pos - 80), Math.min(line.length, pos + 80))}`);
      pos += 12;
    }
  }
});
