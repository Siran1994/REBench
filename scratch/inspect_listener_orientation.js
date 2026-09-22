const fs = require('fs');
const fw = fs.readFileSync('reverse/perfect-landing-tt-minigame/Build/0b14ddffb6d6867f4577189187985cab.framework.js', 'utf8');
const lines = fw.split('\n');
const line4331 = lines[4330];
const pos = line4331.indexOf('function _JS_Sound_SetListenerOrientation');
console.log(line4331.substring(pos, pos + 1000));
