const fs = require('fs');
const files = [
  'reverse/perfect-landing-tt-minigame/game.js',
  'reverse/perfect-landing-tt-minigame/adapter/tt-unity-adapter.js',
  'reverse/perfect-landing-tt-minigame/Build/813700ccfaf64a0a3c57e3aa3166490b.loader.js'
];
files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  ['unity-audio', 'installUnityAudio', 'AudioContext', 'getAudioContext', 'createWebAudioContext'].forEach(term => {
    let count = 0;
    let pos = 0;
    while ((pos = content.indexOf(term, pos)) !== -1) {
      count++;
      pos += term.length;
    }
    if (count > 0) console.log(`${f} contains ${term}: ${count} times`);
  });
});
