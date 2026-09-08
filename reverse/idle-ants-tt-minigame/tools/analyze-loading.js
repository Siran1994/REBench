const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/data.json', 'utf8')).project;
const cLoading = data[6].find(x => x[0] === 'C Loading');

// Traverse and find the block containing M_Transition_In
function findBlockWith(arr, target) {
  for (const item of arr) {
    if (JSON.stringify(item).includes(target)) {
      console.log('--- Sub-block containing', target, '---');
      console.log(JSON.stringify(item, null, 2));
    }
  }
}

findBlockWith(cLoading[1], 'M_Transition_In');
