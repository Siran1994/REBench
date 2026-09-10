const fs = require('fs');
const lines = fs.readFileSync('scripts/c3runtime.js', 'utf8').split('\n');
const sub = lines.slice(14250, 15729);

// Count functions / elements in the array
let idx = 0;
for (let i = 0; i < sub.length; i++) {
  const l = sub[i].trim();
  // An entry ends with a comma at top level or begins with () => or p =>
  if (l.startsWith('() =>') || l.startsWith('p =>')) {
    if (idx === 485) {
      console.log('Index 485 at line:', 14251 + i);
      console.log(sub.slice(i, i + 10).join('\n'));
      break;
    }
    idx++;
  }
}
console.log('Target index reached or passed, final idx:', idx);
