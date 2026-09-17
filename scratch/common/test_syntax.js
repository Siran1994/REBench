
const fs = require('fs');
const vm = require('vm');
const content = fs.readFileSync(process.argv[1], 'utf8');
try {
    new vm.Script(content);
    console.log("SYNTAX VALID!");
} catch (e) {
    console.error("ERROR MESSAGE:", e.message);
    console.error("STACK:", e.stack);
}
