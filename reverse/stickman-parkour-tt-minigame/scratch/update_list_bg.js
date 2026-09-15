const fs = require('fs');
const filePath = './data/data.json';
const d = JSON.parse(fs.readFileSync(filePath, 'utf8'));

const list = d.project[5][64]; // List layout
// 1. Enable layout clear background and set light blue color
list[3] = true; // clearBackground
list[4] = [0.8745098039215686, 0.984313725490196, 0.9803921568627451, 1]; // light blue sky color

// 2. Set all Back instances to frame 0 (light blue sky)
const layer0 = list[9][0];
layer0[14].forEach(inst => {
  if (inst[1] === 11) { // Back object type
    console.log('Back uid', inst[2], 'frame before:', inst[5][2]);
    inst[5][2] = 0; // set to frame 0
    console.log('Back uid', inst[2], 'frame after:', inst[5][2]);
  }
});

fs.writeFileSync(filePath, JSON.stringify(d));
console.log('Updated List layout background and frames in data.json');
