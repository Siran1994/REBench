const fs = require('fs');
const code = fs.readFileSync('reverse/mine_line-tt-minigame/adapter/tt-c3-adapter.js', 'utf8');
const vm = require('vm');
const context = {
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval,
  tt: {
    getSystemInfoSync: () => ({ windowWidth: 393, windowHeight: 852, pixelRatio: 3, platform: 'android' }),
    createCanvas: () => ({ getContext: () => ({}) }),
    createInnerAudioContext: () => ({
      onCanplay() {}, onPlay() {}, onPause() {}, onStop() {}, onEnded() {}, onError() {}
    })
  }
};
vm.createContext(context);
vm.runInContext(code, context);

const testCode = `
let tmpAudio = new Audio();
const supportedAudioFormats = {
  'audio/webm; codecs=opus': !!tmpAudio.canPlayType('audio/webm; codecs=opus'),
  'audio/ogg; codecs=opus': !!tmpAudio.canPlayType('audio/ogg; codecs=opus'),
  'audio/mp4': !!tmpAudio.canPlayType('audio/mp4'),
  'audio/mpeg': !!tmpAudio.canPlayType('audio/mpeg')
};
tmpAudio = null;
supportedAudioFormats;
`;

const res = vm.runInContext(testCode, context);
console.log('Supported formats result:', JSON.stringify(res, null, 2));
