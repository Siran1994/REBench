const fs = require('fs');
const fw = fs.readFileSync('reverse/perfect-landing-tt-minigame/Build/0b14ddffb6d6867f4577189187985cab.framework.js', 'utf8');
const lines = fw.split('\n');
const line4331 = lines[4330];

let idx = 0;
while ((idx = line4331.indexOf('listener', idx)) !== -1) {
  console.log(line4331.substring(Math.max(0, idx - 20), Math.min(line4331.length, idx + 100)));
  idx += 8;
}
