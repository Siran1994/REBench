const fs = require('fs');
const fw = fs.readFileSync('reverse/perfect-landing-tt-minigame/Build/0b14ddffb6d6867f4577189187985cab.framework.js', 'utf8');
const lines = fw.split('\n');
const line4331 = lines[4330];
const idx = line4331.indexOf('strategy.canvasResolutionScaleMode');
console.log(line4331.substring(idx - 200, idx + 800));
