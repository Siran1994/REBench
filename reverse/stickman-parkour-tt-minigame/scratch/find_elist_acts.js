const fs = require('fs');
const d = JSON.parse(fs.readFileSync('./data/data.json', 'utf8'));
const el = d.project[6].find(x => x[0] === 'E_List');

// search for actions that move camera or scroll
const acts = [];
function findActs(obj) {
  if (!obj) return;
  if (Array.isArray(obj)) {
    // an action has format [objType, actId, ...]
    if (obj.length >= 6 && typeof obj[0] === 'number' && typeof obj[1] === 'number' && Array.isArray(obj[6])) {
      acts.push(obj);
    }
    obj.forEach(findActs);
  }
}
findActs(el);
console.log(`Found ${acts.length} actions in E_List`);
acts.forEach(a => {
  const typeIdx = a[0];
  const typeName = typeIdx >= 0 && d.project[3][typeIdx] ? d.project[3][typeIdx][0] : `sys(${typeIdx})`;
  console.log(`Act on ${typeName} (id ${a[1]}): params=${JSON.stringify(a[6])}`);
});
