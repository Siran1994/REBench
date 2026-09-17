#!/usr/bin/env node
/**
 * Image Embedder / Asset Packer for ByteDance MiniGame
 * Scans images/ directory, converts large spritesheets to Base64 data URIs
 * or organizes images into a subpackage with a required game.js entry.
 */

const fs = require('fs');
const path = require('path');

function processImages(targetDir) {
  const imagesDir = path.join(targetDir, 'images');
  if (!fs.existsSync(imagesDir)) {
    console.error(`[embed-images] Images directory does not exist: ${imagesDir}`);
    return;
  }

  // 1. Ensure subpackage game.js exists
  const subGameJs = path.join(imagesDir, 'game.js');
  if (!fs.existsSync(subGameJs)) {
    fs.writeFileSync(subGameJs, '// Entry file for ByteDance MiniGame subpackage: images\nmodule.exports = {};\n', 'utf-8');
    console.log(`[embed-images] Generated subpackage entry: ${subGameJs}`);
  }

  // 2. Also ensure media/game.js exists if media dir present
  const mediaDir = path.join(targetDir, 'media');
  if (fs.existsSync(mediaDir)) {
    const mediaGameJs = path.join(mediaDir, 'game.js');
    if (!fs.existsSync(mediaGameJs)) {
      fs.writeFileSync(mediaGameJs, '// Entry file for ByteDance MiniGame subpackage: media\nmodule.exports = {};\n', 'utf-8');
      console.log(`[embed-images] Generated subpackage entry: ${mediaGameJs}`);
    }
  }

  // 3. Also ensure data/game.js exists if data dir present
  const dataDir = path.join(targetDir, 'data');
  if (fs.existsSync(dataDir)) {
    const dataGameJs = path.join(dataDir, 'game.js');
    if (!fs.existsSync(dataGameJs)) {
      fs.writeFileSync(dataGameJs, '// Entry file for ByteDance MiniGame subpackage: data\nmodule.exports = {};\n', 'utf-8');
      console.log(`[embed-images] Generated subpackage entry: ${dataGameJs}`);
    }
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
  }

  const loadingLogo = path.join(targetDir, 'icons', 'loading-logo.png');
  if (fs.existsSync(loadingLogo)) {
    const data = fs.readFileSync(loadingLogo);
    map['icons/loading-logo.png'] = `data:image/png;base64,${data.toString('base64')}`;
  }

  const outFile = path.join(imagesDir, 'embedded-assets.js');
  const code = `// Auto-generated embedded image assets for ByteDance MiniGame\nmodule.exports = ${JSON.stringify(map, null, 2)};\n`;
  fs.writeFileSync(outFile, code, 'utf-8');
  console.log(`[embed-images] Embedded ${Object.keys(map).length} image assets into ${outFile}`);
}

const target = process.argv[2] || '.';
processImages(target);
