const fs = require('fs');
const orig = fs.readFileSync('../idle_ants_package/scripts/c3runtime.js', 'utf8');
const curr = fs.readFileSync('scripts/c3runtime.js', 'utf8');
const extractText = (s) => {
  const start = s.indexOf('// ../lib/gfx/text.js');
  const end = s.indexOf('// ../lib/gfx/webgl/query.js');
  return s.substring(start, end);
};
let tOrig = extractText(orig);
let tCurr = extractText(curr);
const diffBlockOrig = tOrig.substring(4900, 5200);
const diffBlockCurr = tCurr.substring(4900, 5250);
console.log('Orig block:\n', diffBlockOrig);
console.log('Curr block:\n', diffBlockCurr);

const remainingOrig = tOrig.substring(5185);
const remainingCurr = tCurr.substring(5261);
for (let k = 0; k < Math.min(remainingOrig.length, remainingCurr.length); k++) {
  if (remainingOrig[k] !== remainingCurr[k]) {
    console.log('Diff at offset', k);
    console.log('Orig:', remainingOrig.substr(k, 50));
    console.log('Curr:', remainingCurr.substr(k, 50));
    break;
  }
}



