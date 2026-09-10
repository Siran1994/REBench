const fs = require('fs');
const content = fs.readFileSync('data/data.json', 'utf8');
const id = '618990359638490';

let pos = 0;
while ((pos = content.indexOf(id, pos)) !== -1) {
  console.log('--- Found', id, 'at pos', pos, '---');
  console.log(content.slice(Math.max(0, pos - 150), Math.min(content.length, pos + 200)));
  pos += id.length;
}
