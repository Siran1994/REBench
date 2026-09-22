import sys

sys.stdout.reconfigure(encoding='utf-8')
target_file = r'reverse/siyangruchong-tt-minigame/engine/framework.js'

with open(target_file, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. 暴露 FS 实例并在 preRun 时传入 unityFileSystemInit
old_prerun = 'Module["preRun"].push(function(){var unityFileSystemInit=Module["unityFileSystemInit"]||function(){try{FS.mkdir("/idbfs");}catch(e){}console.log("[FS] /idbfs ready (auto-release)");};unityFileSystemInit()})'
new_prerun = 'Module["preRun"].push(function(){Module["FS"]=FS;if(typeof globalThis!=="undefined")globalThis.__unityFS=FS;if(typeof window!=="undefined")window.__unityFS=FS;var unityFileSystemInit=Module["unityFileSystemInit"]||function(f){try{FS.mkdir("/idbfs");}catch(e){}console.log("[FS] /idbfs ready (auto-release)");};unityFileSystemInit(FS);})'

assert old_prerun in content, "preRun target not found!"
content = content.replace(old_prerun, new_prerun, 1)
print("✓ [Patch 1] 成功在 preRun 中暴露 Module.FS 并将 FS 实例传入 unityFileSystemInit")

# 2. 增强 _JS_FileSystem_Sync 触发
old_sync = 'function _JS_FileSystem_Sync(){fs.sync(false);try{var p=(typeof globalThis!=="undefined"&&globalThis.__miniGamePersistence)||(typeof window!=="undefined"&&window.__miniGamePersistence);if(p&&typeof p.sync==="function"){p.sync(FS,"PlayerPrefs.Save");}}catch(e){}}'
new_sync = 'function _JS_FileSystem_Sync(){fs.sync(false);console.log("[FS Event] _JS_FileSystem_Sync 触发！");try{var p=(typeof globalThis!=="undefined"&&globalThis.__miniGamePersistence)||(typeof window!=="undefined"&&window.__miniGamePersistence);if(p&&typeof p.sync==="function"){p.sync(FS,"PlayerPrefs.Save");}}catch(e){}}'

if old_sync in content:
    content = content.replace(old_sync, new_sync, 1)
    print("✓ [Patch 2] 成功增强 _JS_FileSystem_Sync 日志与同步调用")
else:
    print("⚠️ [Patch 2] old_sync not matched, skipping")

# 3. 在 FS.close 处监听写操作落盘
old_close = 'close:function(stream){if(FS.isClosed(stream)){throw new FS.ErrnoError(8)}if(stream.getdents)stream.getdents=null;try{if(stream.stream_ops.close){stream.stream_ops.close(stream)}}catch(e){throw e}finally{FS.closeStream(stream.fd)}stream.fd=null}'
new_close = 'close:function(stream){if(FS.isClosed(stream)){throw new FS.ErrnoError(8)}var _p=stream.path||(stream.node&&stream.node.name)||"";if(_p&&_p.indexOf("idbfs")!==-1){console.log("📝 [FS Write Event] 检测到存档文件写入关闭: "+_p);try{var p=(typeof globalThis!=="undefined"&&globalThis.__miniGamePersistence)||(typeof window!=="undefined"&&window.__miniGamePersistence);if(p&&typeof p.sync==="function"){p.sync(FS,"FileClose:"+_p);}}catch(e){}}if(stream.getdents)stream.getdents=null;try{if(stream.stream_ops.close){stream.stream_ops.close(stream)}}catch(e){throw e}finally{FS.closeStream(stream.fd)}stream.fd=null}'

assert old_close in content, "FS.close target not found!"
content = content.replace(old_close, new_close, 1)
print("✓ [Patch 3] 成功在 FS.close 中植入 /idbfs 写入监听与自动落盘")

with open(target_file, 'w', encoding='utf-8') as f:
    f.write(content)

print("🎉 framework.js 全部持久化补丁应用成功！")
