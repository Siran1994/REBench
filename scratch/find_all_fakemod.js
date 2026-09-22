const fs = require('fs');
const fw = fs.readFileSync('reverse/perfect-landing-tt-minigame/Build/0b14ddffb6d6867f4577189187985cab.framework.js', 'utf8');
const regex = /_GetFakemodTimeInSeconds/g;
let m;
while ((m = regex.exec(fw)) !== null) {
  console.log(`Match at ${m.index}:`);
  console.log(`  ${fw.substring(Math.max(0, m.index - 50), Math.min(fw.length, m.index + 80)).replace(/\n/g, ' ')}`);
}
