const fs = require('fs');
const fw = fs.readFileSync('reverse/perfect-landing-tt-minigame/Build/0b14ddffb6d6867f4577189187985cab.framework.js', 'utf8');
const lines = fw.split('\n');
const line4392 = lines[4391];
const idx = line4392.indexOf('Canvas SetSize');
console.log(line4392.substring(idx - 100, idx + 400));
