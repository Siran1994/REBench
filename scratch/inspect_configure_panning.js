const fs = require('fs');
const content = fs.readFileSync('reverse/perfect-landing-tt-minigame/Build/0b14ddffb6d6867f4577189187985cab.framework.js', 'utf8');
const lines = content.split('\n');
const line4331 = lines[4330];
const start = line4331.indexOf('configurePanningNodes');
console.log(line4331.substring(start - 100, start + 1000));
