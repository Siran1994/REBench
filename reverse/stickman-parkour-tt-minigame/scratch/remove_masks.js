const fs = require('fs');
const filePath = './data/data.json';
const d = JSON.parse(fs.readFileSync(filePath, 'utf8'));

const list = d.project[5][64]; // List layout
const faderLayer = list[9][2];
console.log('Fader layer instances before:', faderLayer[14].length);

// Filter out UID 5001 and 5002
faderLayer[14] = faderLayer[14].filter(inst => inst[2] !== 5001 && inst[2] !== 5002);
console.log('Fader layer instances after:', faderLayer[14].length);

fs.writeFileSync(filePath, JSON.stringify(d));
console.log('Cleaned up Fader layer in data.json');
