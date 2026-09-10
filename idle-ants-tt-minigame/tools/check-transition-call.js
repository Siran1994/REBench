const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/data.json', 'utf8')).project;
const cLoading = data[6].find(x => x[0] === 'C Loading');

function findCalls(arr) {
  for (const item of arr) {
    if (Array.isArray(item)) {
      if (item[0] === -2 && item[1] === 'M_Transition_In') {
        console.log('Call to M_Transition_In:', JSON.stringify(item, null, 2));
      }
      findCalls(item);
    }
  }
}

findCalls(cLoading);
