// images subpackage entry
const embedded = require('./embedded-assets.js');
if (typeof globalThis !== 'undefined') {
  globalThis.__diggerEmbeddedImages = Object.assign(globalThis.__diggerEmbeddedImages || {}, embedded);
}
console.log('[Subpackage] images loaded, embedded assets registered:', Object.keys(embedded).length);
