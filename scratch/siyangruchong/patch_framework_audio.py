import os

file_path = "reverse/siyangruchong-tt-minigame/engine/framework.js"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

target = 'function jsAudioCreateUncompressedSoundClipFromCompressedAudio(audioData){var soundClip=jsAudioCreateUncompressedSoundClip(null,false);try{if(WEBAudio.audioContext&&typeof WEBAudio.audioContext.decodeAudioData==="function"){var res=WEBAudio.audioContext.decodeAudioData(audioData,function(_buffer){soundClip.buffer=_buffer},function(_error){soundClip.error=true;console.log("Decode error: "+_error)});if(res&&typeof res.then==="function"){res.then(function(_buffer){soundClip.buffer=_buffer}).catch(function(_error){soundClip.error=true})}}else{soundClip.error=true;if(WEBAudio.audioContext&&typeof WEBAudio.audioContext.createBuffer==="function"){soundClip.buffer=WEBAudio.audioContext.createBuffer(1,1,22050)}}}catch(e){console.warn("[WEBAudio] decodeAudioData fallback:",e);soundClip.error=true;try{if(WEBAudio.audioContext&&typeof WEBAudio.audioContext.createBuffer==="function"){soundClip.buffer=WEBAudio.audioContext.createBuffer(1,1,22050)}}catch(err){}}return soundClip}'

replacement = 'function jsAudioCreateUncompressedSoundClipFromCompressedAudio(audioData){var soundClip=jsAudioCreateUncompressedSoundClip(null,false);var decodeTimeoutTimer=null;if(typeof setTimeout!=="undefined"){decodeTimeoutTimer=setTimeout(function(){if(!soundClip.buffer&&!soundClip.error){console.warn("[WEBAudio] ⚠️ 音频解码超时(500ms)，触发静音 buffer 兜底放行");soundClip.error=true;try{if(WEBAudio.audioContext&&typeof WEBAudio.audioContext.createBuffer==="function"){soundClip.buffer=WEBAudio.audioContext.createBuffer(1,1,22050);}}catch(err){}}},500);}try{if(WEBAudio.audioContext&&typeof WEBAudio.audioContext.decodeAudioData==="function"){var res=WEBAudio.audioContext.decodeAudioData(audioData,function(_buffer){if(decodeTimeoutTimer)clearTimeout(decodeTimeoutTimer);soundClip.buffer=_buffer;},function(_error){if(decodeTimeoutTimer)clearTimeout(decodeTimeoutTimer);soundClip.error=true;console.log("Decode error: "+_error);});if(res&&typeof res.then==="function"){res.then(function(_buffer){if(decodeTimeoutTimer)clearTimeout(decodeTimeoutTimer);soundClip.buffer=_buffer;}).catch(function(_error){if(decodeTimeoutTimer)clearTimeout(decodeTimeoutTimer);soundClip.error=true;});}}else{if(decodeTimeoutTimer)clearTimeout(decodeTimeoutTimer);soundClip.error=true;if(WEBAudio.audioContext&&typeof WEBAudio.audioContext.createBuffer==="function"){soundClip.buffer=WEBAudio.audioContext.createBuffer(1,1,22050);}}}catch(e){if(decodeTimeoutTimer)clearTimeout(decodeTimeoutTimer);console.warn("[WEBAudio] decodeAudioData fallback:",e);soundClip.error=true;try{if(WEBAudio.audioContext&&typeof WEBAudio.audioContext.createBuffer==="function"){soundClip.buffer=WEBAudio.audioContext.createBuffer(1,1,22050);}}catch(err){}}return soundClip;}'

if target not in content:
    print("ERROR: target string not found!")
    exit(1)

content = content.replace(target, replacement)
with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("SUCCESS: framework.js patched with 500ms audio decoding timeout!")
