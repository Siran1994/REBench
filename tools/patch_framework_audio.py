# patch_framework_audio.py
import os

fp = 'reverse/siyangruchong-tt-minigame/engine/framework.js'
with open(fp, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# 1. _JS_Sound_Load
old_load = 'if(length<131072)decompress=1;'
new_load = 'decompress=1;'
assert old_load in content, 'old_load missing'
content = content.replace(old_load, new_load, 1)

# 2. jsAudioCreateCompressedSoundClip
start_comp = content.find('function jsAudioCreateCompressedSoundClip(audioData){')
assert start_comp != -1, 'start_comp missing'
end_comp = content.find('function _JS_Sound_Load(', start_comp)
assert end_comp != -1, 'end_comp missing'
old_comp_full = content[start_comp:end_comp]
new_comp_full = 'function jsAudioCreateCompressedSoundClip(audioData){try{return jsAudioCreateUncompressedSoundClipFromCompressedAudio(audioData)}catch(e){return jsAudioCreateUncompressedSoundClip(null,false)}}'
content = content.replace(old_comp_full, new_comp_full, 1)

# 3. _JS_Sound_SetListenerOrientation
old_ori = 'function _JS_Sound_SetListenerOrientation(x,y,z,xUp,yUp,zUp){if(WEBAudio.audioWebEnabled==0)return;x=-x;y=-y;z=-z;var l=WEBAudio.audioContext.listener;if(l.forwardX){if(l.forwardX.value!==x)l.forwardX.value=x;if(l.forwardY.value!==y)l.forwardY.value=y;if(l.forwardZ.value!==z)l.forwardZ.value=z;if(l.upX.value!==xUp)l.upX.value=xUp;if(l.upY.value!==yUp)l.upY.value=yUp;if(l.upZ.value!==zUp)l.upZ.value=zUp}else if(l._forwardX!==x||l._forwardY!==y||l._forwardZ!==z||l._upX!==xUp||l._upY!==yUp||l._upZ!==zUp){l.setOrientation(x,y,z,xUp,yUp,zUp);l._forwardX=x;l._forwardY=y;l._forwardZ=z;l._upX=xUp;l._upY=yUp;l._upZ=zUp}}'
new_ori = 'function _JS_Sound_SetListenerOrientation(x,y,z,xUp,yUp,zUp){if(WEBAudio.audioWebEnabled==0)return;try{x=-x;y=-y;z=-z;var l=WEBAudio.audioContext.listener;if(!l)return;if(l.forwardX){if(l.forwardX.value!==x)l.forwardX.value=x;if(l.forwardY.value!==y)l.forwardY.value=y;if(l.forwardZ.value!==z)l.forwardZ.value=z;if(l.upX.value!==xUp)l.upX.value=xUp;if(l.upY.value!==yUp)l.upY.value=yUp;if(l.upZ.value!==zUp)l.upZ.value=zUp}else if(typeof l.setOrientation==="function"){l.setOrientation(x,y,z,xUp,yUp,zUp)}}catch(e){}}'
assert old_ori in content, 'old_ori missing'
content = content.replace(old_ori, new_ori, 1)

# 4. _JS_Sound_SetListenerPosition
old_pos = 'function _JS_Sound_SetListenerPosition(x,y,z){if(WEBAudio.audioWebEnabled==0)return;var l=WEBAudio.audioContext.listener;if(l.positionX){if(l.positionX.value!==x)l.positionX.value=x;if(l.positionY.value!==y)l.positionY.value=y;if(l.positionZ.value!==z)l.positionZ.value=z}else if(l._positionX!==x||l._positionY!==y||l._positionZ!==z){l.setPosition(x,y,z);l._positionX=x;l._positionY=y;l._positionZ=z}}'
new_pos = 'function _JS_Sound_SetListenerPosition(x,y,z){if(WEBAudio.audioWebEnabled==0)return;try{var l=WEBAudio.audioContext.listener;if(!l)return;if(l.positionX){if(l.positionX.value!==x)l.positionX.value=x;if(l.positionY.value!==y)l.positionY.value=y;if(l.positionZ.value!==z)l.positionZ.value=z}else if(typeof l.setPosition==="function"){l.setPosition(x,y,z)}}catch(e){}}'
assert old_pos in content, 'old_pos missing'
content = content.replace(old_pos, new_pos, 1)

# 5. _JS_Sound_SetPosition
old_setpos = 'function _JS_Sound_SetPosition(channelInstance,x,y,z){if(WEBAudio.audioWebEnabled==0)return;var channel=WEBAudio.audioInstances[channelInstance];channel.setPosition(x,y,z)}'
new_setpos = 'function _JS_Sound_SetPosition(channelInstance,x,y,z){if(WEBAudio.audioWebEnabled==0)return;try{var channel=WEBAudio.audioInstances[channelInstance];if(channel)channel.setPosition(x,y,z)}catch(e){}}'
assert old_setpos in content, 'old_setpos missing'
content = content.replace(old_setpos, new_setpos, 1)

# 6. _JS_Sound_Set3D
old_set3d = 'function _JS_Sound_Set3D(channelInstance,threeD){var channel=WEBAudio.audioInstances[channelInstance];channel.set3D(threeD)}'
new_set3d = 'function _JS_Sound_Set3D(channelInstance,threeD){try{var channel=WEBAudio.audioInstances[channelInstance];if(channel)channel.set3D(threeD)}catch(e){}}'
assert old_set3d in content, 'old_set3d missing'
content = content.replace(old_set3d, new_set3d, 1)

# 7. _JS_Sound_Play
old_play = 'function _JS_Sound_Play(bufferInstance,channelInstance,offset,delay){if(WEBAudio.audioWebEnabled==0)return;_JS_Sound_Stop(channelInstance,0);var soundClip=WEBAudio.audioInstances[bufferInstance];var channel=WEBAudio.audioInstances[channelInstance];if(!soundClip){console.log("Trying to play sound which is not loaded.");return}try{channel.playSoundClip(soundClip,WEBAudio.audioContext.currentTime+delay,offset)}catch(error){console.error("playSoundClip error. Exception: "+e)}}'
new_play = 'function _JS_Sound_Play(bufferInstance,channelInstance,offset,delay){if(WEBAudio.audioWebEnabled==0)return;_JS_Sound_Stop(channelInstance,0);var soundClip=WEBAudio.audioInstances[bufferInstance];var channel=WEBAudio.audioInstances[channelInstance];if(!soundClip){console.log("Trying to play sound which is not loaded.");return}try{channel.playSoundClip(soundClip,WEBAudio.audioContext.currentTime+delay,offset)}catch(e){console.warn("playSoundClip exception:",e)}}'
assert old_play in content, 'old_play missing'
content = content.replace(old_play, new_play, 1)

# 8. channel.setupPanning
old_panning = 'channel.setupPanning=function(){if(this.source.isPausedMockNode)return;this.source.disconnect();this.panner.disconnect();this.gain.disconnect();if(this.threeD){this.source.connect(this.panner);this.panner.connect(this.gain)}else{this.source.connect(this.gain)}this.gain.connect(WEBAudio.audioContext.destination)};'
new_panning = 'channel.setupPanning=function(){try{if(this.source&&this.source.isPausedMockNode)return;try{if(this.source)this.source.disconnect()}catch(e){}try{if(this.panner)this.panner.disconnect()}catch(e){}try{if(this.gain)this.gain.disconnect()}catch(e){}if(this.threeD){if(this.source&&this.panner)this.source.connect(this.panner);if(this.panner&&this.gain)this.panner.connect(this.gain)}else{if(this.source&&this.gain)this.source.connect(this.gain)}if(this.gain&&WEBAudio.audioContext)this.gain.connect(WEBAudio.audioContext.destination)}catch(e){}};'
assert old_panning in content, 'old_panning missing'
content = content.replace(old_panning, new_panning, 1)

# 9. channel.release
old_release = 'channel.release=function(){this.disconnectSource();this.gain.disconnect();this.panner.disconnect()};'
new_release = 'channel.release=function(){try{this.disconnectSource()}catch(e){}try{if(this.gain)this.gain.disconnect()}catch(e){}try{if(this.panner)this.panner.disconnect()}catch(e){}};'
assert old_release in content, 'old_release missing'
content = content.replace(old_release, new_release, 1)

with open(fp, 'w', encoding='utf-8') as f:
    f.write(content)

print("SUCCESS: framework.js patched successfully!")
