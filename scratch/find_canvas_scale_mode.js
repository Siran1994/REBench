const fs = require('fs');
const fw = fs.readFileSync('reverse/perfect-landing-tt-minigame/Build/0b14ddffb6d6867f4577189187985cab.framework.js', 'utf8');
const lines = fw.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('strategy.canvasResolutionScaleMode')) {
    const pos = line.indexOf('strategy.canvasResolutionScaleMode');
    console.log(`Line ${idx + 1}:`);
    console.log(line.substring(Math.max(0, pos - 150), Math.min(line.length, pos + 400)));
  }
});
