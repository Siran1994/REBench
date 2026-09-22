const fs = require('fs');
const loader = fs.readFileSync('reverse/perfect-landing-tt-minigame/Build/813700ccfaf64a0a3c57e3aa3166490b.loader.js', 'utf8');
const fw = fs.readFileSync('reverse/perfect-landing-tt-minigame/Build/0b14ddffb6d6867f4577189187985cab.framework.js', 'utf8');
const adapter = fs.readFileSync('reverse/perfect-landing-tt-minigame/adapter/tt-unity-adapter.js', 'utf8');

function findDpr(content, name) {
  let idx = 0;
  while ((idx = content.indexOf('devicePixelRatio', idx)) !== -1) {
    console.log(`${name} at ${idx}:`);
    console.log(`  ${content.substring(Math.max(0, idx - 60), Math.min(content.length, idx + 100)).replace(/\n/g, ' ')}`);
    idx += 16;
  }
}
findDpr(loader, 'loader');
findDpr(fw, 'framework');
findDpr(adapter, 'adapter');
