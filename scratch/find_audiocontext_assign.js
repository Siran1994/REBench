const fs = require('fs');
const files = [
  'reverse/perfect-landing-tt-minigame/game.js',
  'reverse/perfect-landing-tt-minigame/adapter/tt-unity-adapter.js',
  'reverse/perfect-landing-tt-minigame/adapter/unity-audio.js',
  'reverse/perfect-landing-tt-minigame/Build/813700ccfaf64a0a3c57e3aa3166490b.loader.js',
  'reverse/perfect-landing-tt-minigame/Build/0b14ddffb6d6867f4577189187985cab.framework.js'
];
files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const regex = /AudioContext\s*=/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const start = Math.max(0, match.index - 50);
    const end = Math.min(content.length, match.index + 80);
    console.log(`${f} at ${match.index}:`);
    console.log(`  ${content.substring(start, end).replace(/\n/g, ' ')}`);
  }
});
