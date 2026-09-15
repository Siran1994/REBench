const fs = require('fs');
const d = JSON.parse(fs.readFileSync('./data/data.json', 'utf8'));
const list = d.project[5][64];

console.log('List layout size:', list[1], list[2]);
list[9].forEach((layer, lIdx) => {
  console.log(`\nLayer ${lIdx}: ${layer[0]}, parallax: [${layer[6]}, ${layer[7]}], instances count: ${layer[14].length}`);
  layer[14].forEach((inst, i) => {
    const typeIdx = inst[1];
    const typeName = d.project[3][typeIdx] ? d.project[3][typeIdx][0] : 'unknown';
    if (typeName === 'Back' || typeName === 'TiledBackground' || typeName === 'Fader') {
      console.log(`  [${i}] ${typeName} uid=${inst[2]}: pos=[${inst[0].slice(0, 5)}], color=${JSON.stringify(inst[0][7])}, anim/frame=${JSON.stringify(inst[5])}`);
    }
  });
});
