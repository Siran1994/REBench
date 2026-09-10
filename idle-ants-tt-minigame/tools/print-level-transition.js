const fs = require('fs');
const content = fs.readFileSync('data/data.json', 'utf8');
const pos = 1219398;
const slice = content.slice(pos - 1500, pos + 1000);
console.log(slice);
