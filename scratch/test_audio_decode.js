/**
 * 测试 WebAudio 在各种 iOS / 模拟器极端环境下的健壮性
 */

const assert = require('assert');

console.log('=== [测试 1] 模拟 iOS 环境缺失原生 decodeAudioData ===');
global.window = {};
global.root = global;

require('../reverse/siyangruchong-tt-minigame/adapter/tt-unity-adapter.js');

const ctx = new global.AudioContext();
console.log('ctx 类型:', typeof ctx);
console.log('ctx.decodeAudioData 类型:', typeof ctx.decodeAudioData);
console.log('ctx.createBuffer 类型:', typeof ctx.createBuffer);
console.log('ctx.createBufferSource 类型:', typeof ctx.createBufferSource);
console.log('ctx.createGain 类型:', typeof ctx.createGain);
console.log('ctx.createPanner 类型:', typeof ctx.createPanner);

assert(typeof ctx.decodeAudioData === 'function', 'decodeAudioData 必须是函数');
assert(typeof ctx.createBuffer === 'function', 'createBuffer 必须是函数');
assert(typeof ctx.createGain === 'function', 'createGain 必须是函数');
assert(typeof ctx.createPanner === 'function', 'createPanner 必须是函数');

let called = false;
ctx.decodeAudioData(new ArrayBuffer(10), function(buf) {
  called = true;
  console.log('decodeAudioData 回调成功执行，返回 buffer:', !!buf);
});

assert(called, '回调必须被安全调用');
console.log('✓ 测试 1 通过！');

console.log('\n=== [测试 2] 模拟 framework.js 中的音频解包流程 ===');
// 模拟 framework.js 环境
global.WEBAudio = {
  audioContext: ctx,
  audioWebEnabled: 1,
  audioInstances: {},
  audioInstanceIdCounter: 0
};

// 模拟 jsAudioCreateUncompressedSoundClip
function jsAudioCreateUncompressedSoundClip(buffer, error) {
  return {
    buffer: buffer,
    error: error,
    createSourceNode: function() {
      if (!this.buffer) return null;
      return ctx.createBufferSource();
    }
  };
}

// 模拟 framework.js 中的解密函数
function jsAudioCreateUncompressedSoundClipFromCompressedAudio(audioData){
  var soundClip = jsAudioCreateUncompressedSoundClip(null, false);
  try {
    if (WEBAudio.audioContext && typeof WEBAudio.audioContext.decodeAudioData === "function") {
      var res = WEBAudio.audioContext.decodeAudioData(audioData, function(_buffer) {
        soundClip.buffer = _buffer;
      }, function(_error) {
        soundClip.error = true;
      });
      if (res && typeof res.then === "function") {
        res.then(function(_buffer) {
          soundClip.buffer = _buffer;
        }).catch(function(_error) {
          soundClip.error = true;
        });
      }
    } else {
      soundClip.error = true;
      if (WEBAudio.audioContext && typeof WEBAudio.audioContext.createBuffer === "function") {
        soundClip.buffer = WEBAudio.audioContext.createBuffer(1, 1, 22050);
      }
    }
  } catch(e) {
    soundClip.error = true;
  }
  return soundClip;
}

const clip = jsAudioCreateUncompressedSoundClipFromCompressedAudio(new ArrayBuffer(100));
console.log('解包后的 soundClip.buffer 是否存在:', !!clip.buffer);
console.log('解包后的 soundClip.error:', clip.error);
assert(clip.buffer !== null, 'clip.buffer 必须存在保底');
console.log('✓ 测试 2 通过！');

console.log('\n🎉 所有音频健壮性仿真测试 100% 通过！');
