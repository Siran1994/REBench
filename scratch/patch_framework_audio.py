import sys

sys.stdout.reconfigure(encoding='utf-8')
target_file = r'reverse/siyangruchong-tt-minigame/engine/framework.js'

with open(target_file, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. 强化 _JS_Sound_Init 防御
target_init_snippet = 'WEBAudio.audioContext=new AudioContext;'
replacement_init_snippet = 'WEBAudio.audioContext=new AudioContext;if(WEBAudio.audioContext&&typeof WEBAudio.audioContext.decodeAudioData!=="function"){WEBAudio.audioContext.decodeAudioData=function(data,scb,ecb){try{var buf=WEBAudio.audioContext.createBuffer?WEBAudio.audioContext.createBuffer(1,1,22050):{numberOfChannels:1,length:1,sampleRate:22050};if(typeof scb==="function")scb(buf)}catch(e){if(typeof ecb==="function")ecb(e)}}};'

assert target_init_snippet in content, "target_init_snippet not found!"
content = content.replace(target_init_snippet, replacement_init_snippet, 1)
print("✓ [Patch 1] 成功在 _JS_Sound_Init 中为 WEBAudio.audioContext 增加 decodeAudioData 兜底防线")

# 2. 强化 jsAudioCreateUncompressedSoundClipFromCompressedAudio 防御
target_decode_func = 'function jsAudioCreateUncompressedSoundClipFromCompressedAudio(audioData){var soundClip=jsAudioCreateUncompressedSoundClip(null,false);WEBAudio.audioContext.decodeAudioData(audioData,function(_buffer){soundClip.buffer=_buffer},function(_error){soundClip.error=true;console.log("Decode error: "+_error)});return soundClip}'
new_decode_func = 'function jsAudioCreateUncompressedSoundClipFromCompressedAudio(audioData){var soundClip=jsAudioCreateUncompressedSoundClip(null,false);try{if(WEBAudio.audioContext&&typeof WEBAudio.audioContext.decodeAudioData==="function"){var res=WEBAudio.audioContext.decodeAudioData(audioData,function(_buffer){soundClip.buffer=_buffer},function(_error){soundClip.error=true;console.log("Decode error: "+_error)});if(res&&typeof res.then==="function"){res.then(function(_buffer){soundClip.buffer=_buffer}).catch(function(_error){soundClip.error=true})}}else{soundClip.error=true;if(WEBAudio.audioContext&&typeof WEBAudio.audioContext.createBuffer==="function"){soundClip.buffer=WEBAudio.audioContext.createBuffer(1,1,22050)}}}catch(e){console.warn("[WEBAudio] decodeAudioData fallback:",e);soundClip.error=true;try{if(WEBAudio.audioContext&&typeof WEBAudio.audioContext.createBuffer==="function"){soundClip.buffer=WEBAudio.audioContext.createBuffer(1,1,22050)}}catch(err){}}return soundClip}'

assert target_decode_func in content, "target_decode_func not found!"
content = content.replace(target_decode_func, new_decode_func, 1)
print("✓ [Patch 2] 成功将 jsAudioCreateUncompressedSoundClipFromCompressedAudio 替换为双层防护防抛错实现")

with open(target_file, 'w', encoding='utf-8') as f:
    f.write(content)

print("🎉 framework.js 音频防御补丁全部应用成功！")
