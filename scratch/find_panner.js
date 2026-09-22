const fs = require('fs');
const content = fs.readFileSync('reverse/perfect-landing-tt-minigame/Build/0b14ddffb6d6867f4577189187985cab.framework.js', 'utf8');
const lines = content.split('\n');
const line4331 = lines[4330];
let idx = 0;
while ((idx = line4331.indexOf('.panner', idx)) !== -1) {
  console.log(line4331.substring(idx - 20, idx + 100));
  idx += 8;
}
