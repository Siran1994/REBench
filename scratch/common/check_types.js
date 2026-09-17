const fs = require("fs");
let data = JSON.parse(fs.readFileSync("data/data.json", "utf8"));
let pm = data.project;
let c2code = fs.readFileSync("scripts/c2runtime.js", "utf8");

let startIdx = c2code.indexOf("cr.getObjectRefTable = function ()");
let endIdx = c2code.indexOf("};", startIdx);
let tableCode = c2code.substring(startIdx, endIdx + 2);
let cr = { plugins_: {}, behaviors: {}, system_object: { prototype: { cnds: {}, acts: {}, exps: {} } } };
[
  "NinePatch", "AJAX", "Arr", "Audio", "Browser", "Dictionary", "JSON",
  "LocalStorage", "Keyboard", "Mouse", "Particles", "Function", "Sprite",
  "TiledBg", "Touch", "SpinePlugin", "SpineWebGL", "Text", "XML"
].forEach(k => { cr.plugins_[k] = function() {}; cr.plugins_[k].prototype = { cnds: {}, acts: {}, exps: {} }; });
[
  "Pin", "Rex_text_properties", "Fade", "custom", "Rotate", "lunarray_LiteTween", "Sin"
].forEach(k => { cr.behaviors[k] = function() {}; cr.behaviors[k].prototype = { cnds: {}, acts: {}, exps: {} }; });

eval(tableCode);
let table = cr.getObjectRefTable();

console.log("--- Character & Spine Types ---");
pm[3].forEach((t, idx) => {
  let pRef = t[1];
  let ctor = table[pRef];
  let pName = Object.keys(cr.plugins_).find(k => cr.plugins_[k] === ctor) || ("ref_" + pRef);
  if (pName.includes("Spine") || t[0].toLowerCase().includes("spine") || t[0].toLowerCase().includes("worker") || t[0].toLowerCase().includes("manager") || t[0].toLowerCase().includes("chef") || t[0].toLowerCase().includes("cashier")) {
    console.log("Type " + idx + ": " + t[0] + " -> " + pName);
  }
});
