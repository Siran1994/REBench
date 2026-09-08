const fs = require('fs');
const path = require('path');

const wasmBinary = fs.readFileSync('reverse/mine_line-tt-minigame/scripts/opus.wasm.wasm');
const audioData = fs.readFileSync('reverse/mine_line-tt-minigame/media/tick.webm');

const globalScope = {
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval,
  WebAssembly: WebAssembly,
  DataView: DataView,
  Uint8Array: Uint8Array,
  Int8Array: Int8Array,
  Float32Array: Float32Array,
  ArrayBuffer: ArrayBuffer,
  Math: Math,
  JobHandlers: {},
  sentBuffers: new Map([['opus-decoder-wasm', wasmBinary.buffer]]),
  sentBlobs: new Map(),
  Module: {
    ENVIRONMENT: 'WEB',
    wasmBinary: wasmBinary.buffer
  }
};
globalScope.self = globalScope;
globalScope.window = globalScope;

const vm = require('vm');
const context = vm.createContext(globalScope);

const opusScript = fs.readFileSync('reverse/mine_line-tt-minigame/scripts/opus.wasm.js', 'utf8');
vm.runInContext(opusScript, context);

async function testDecode() {
  console.log('Registered job handlers:', Object.keys(context.JobHandlers));
  if (context.JobHandlers['OpusDecode']) {
    console.log('Calling OpusDecode...');
    const result = await context.JobHandlers['OpusDecode']({
      arrayBuffer: audioData.buffer.slice(audioData.byteOffset, audioData.byteOffset + audioData.byteLength)
    });
    console.log('OpusDecode success!');
    console.log('Result buffer byteLength:', result.result.byteLength);
    const floats = new Float32Array(result.result);
    console.log('Decoded samples count:', floats.length);
    console.log('Sample range:', Math.min(...floats.slice(0, 100)), 'to', Math.max(...floats.slice(0, 100)));
  }
}

testDecode().catch(err => console.error('Error during testDecode:', err));
