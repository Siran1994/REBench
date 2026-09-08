const fs = require('fs');
const path = require('path');

function embedImages(targetDir) {
  const imagesDir = path.join(targetDir, 'images');
  if (!fs.existsSync(imagesDir)) {
    console.error('Directory does not exist:', imagesDir);
    return;
  }

  const files = fs.readdirSync(imagesDir);
  const map = {};

  for (const file of files) {
    if (file.endsWith('.js') || file.endsWith('.json') || file.endsWith('.md')) continue;
    const fullPath = path.join(imagesDir, file);
    const stat = fs.statSync(fullPath);
    if (!stat.isFile()) continue;

    const ext = path.extname(file).toLowerCase();
    const mime = ext === '.png' ? 'image/png' : (ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/webp');
    const data = fs.readFileSync(fullPath);
    const base64 = data.toString('base64');
    const dataUri = `data:${mime};base64,${base64}`;

    map[`images/${file}`] = dataUri;
    map[file] = dataUri;
  }

  // Also include loading-logo if present
  const loadingLogo = path.join(targetDir, 'icons', 'loading-logo.png');
  if (fs.existsSync(loadingLogo)) {
    const data = fs.readFileSync(loadingLogo);
    map['icons/loading-logo.png'] = `data:image/png;base64,${data.toString('base64')}`;
  }

  const outFile = path.join(imagesDir, 'embedded-assets.js');
  const code = `// Auto-generated embedded image assets for ByteDance MiniGame\nmodule.exports = ${JSON.stringify(map, null, 2)};\n`;
  fs.writeFileSync(outFile, code, 'utf-8');
  console.log(`[embed-images] Embedded ${Object.keys(map).length} assets into ${outFile}`);
}

const target = process.argv[2] || path.join(__dirname, '..', 'reverse', 'digger-tt-minigame');
embedImages(target);
