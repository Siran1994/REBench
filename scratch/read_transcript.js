const fs = require('fs');
const readline = require('readline');
const fileStream = fs.createReadStream('C:/Users/CY/.gemini/antigravity-ide/brain/0120245f-e011-4d47-9bac-ef3f277685c3/.system_generated/logs/transcript.jsonl');
const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
let types = new Set();
let count = 0;
rl.on('line', (line) => {
  count++;
  try {
    const obj = JSON.parse(line);
    types.add(obj.type || obj.source || 'unknown');
    if (obj.content && typeof obj.content === 'string' && count < 20) {
      console.log('line ' + count, obj.type, obj.source, obj.content.substring(0, 100));
    }
  } catch(e){}
});
rl.on('close', () => {
  console.log('total lines:', count);
  console.log('types:', Array.from(types));
});
