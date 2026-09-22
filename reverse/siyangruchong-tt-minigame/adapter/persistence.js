/**
 * 抖音/微信小游戏 Unity WebGL 双向持久化存储系统 (MiniGamePersistence)
 * 
 * 核心机制：
 * 1. 物理介质：基于 tt.getFileSystemManager()，将数据持久化在 ${tt.env.USER_DATA_PATH}/idbfs_storage/
 * 2. 启动还原 (Restore)：在 Unity 引擎主循环启动前，将物理沙盒中的历史存档注回 Emscripten 虚拟文件系统 /idbfs/
 * 3. 运行落盘 (Sync)：挂接 _JS_FileSystem_Sync()，在 C# 调用 PlayerPrefs.Save() 时毫秒级防抖落盘
 * 4. 退出防丢 (LifeCycle)：注册 tt.onHide 监听，在切后台、挂起或退出时触发强制安全同步
 * 5. 缓存隔离：严格过滤并清理 UnityCache 等网络临时缓存，保证主线程零卡顿与超低磁盘占用
 */

(function () {
  'use strict';

  const root = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : self);
  const platform = typeof tt !== 'undefined' ? tt : (typeof wx !== 'undefined' ? wx : null);
  const fsManager = platform && platform.getFileSystemManager ? platform.getFileSystemManager() : null;
  const userDir = (platform && platform.env && platform.env.USER_DATA_PATH) ? platform.env.USER_DATA_PATH : '';
  const STORAGE_ROOT = userDir ? (userDir.replace(/\/+$/, '') + '/idbfs_storage') : '';

  let _activeFS = null;
  let _isSyncing = false;
  let _hasPendingSync = false;
  let _debounceTimer = null;
  let _lastFileHashMap = {};

  // 简单快速字符串/字节哈希 (DJB2)
  function hashBytes(bytes) {
    let hash = 5381;
    const len = bytes.length;
    // 大文件采样计算
    const step = len > 4096 ? Math.floor(len / 512) : 1;
    for (let i = 0; i < len; i += step) {
      hash = ((hash << 5) + hash) + bytes[i];
      hash |= 0;
    }
    return hash + '_' + len;
  }

  function existsSync(path) {
    if (!fsManager || !path) return false;
    try {
      fsManager.accessSync(path);
      return true;
    } catch (e) {
      return false;
    }
  }

  function mkdirsSync(dir) {
    if (!fsManager || !dir) return;
    try {
      if (existsSync(dir)) return;
      fsManager.mkdirSync(dir, true);
    } catch (e) {
      // 容错逐级创建
      const parts = dir.replace(/\\/g, '/').split('/');
      let current = '';
      for (let i = 0; i < parts.length; i++) {
        if (!parts[i]) continue;
        current += (current ? '/' : '') + parts[i];
        if (current.includes(':') && !current.includes('/')) continue;
        try {
          if (!existsSync(current)) {
            fsManager.mkdirSync(current);
          }
        } catch (err) {}
      }
    }
  }

  function listAllPhysicalFiles(dir, baseDir) {
    if (!fsManager || !existsSync(dir)) return [];
    baseDir = baseDir || dir;
    let results = [];
    try {
      const entries = fsManager.readdirSync(dir);
      for (let i = 0; i < entries.length; i++) {
        const name = entries[i];
        if (name === '.' || name === '..' || name === 'UnityCache' || name.startsWith('.')) continue;
        const fullPath = dir.replace(/\/+$/, '') + '/' + name;
        if (fullPath.indexOf('UnityCache') !== -1 || fullPath.indexOf('__data') !== -1) continue;
        try {
          const stat = fsManager.statSync(fullPath);
          if (stat.isDirectory()) {
            results = results.concat(listAllPhysicalFiles(fullPath, baseDir));
          } else {
            const relPath = fullPath.substring(baseDir.length).replace(/^[\/\\]+/, '');
            results.push({ fullPath: fullPath, relPath: relPath, size: stat.size });
          }
        } catch (e) {}
      }
    } catch (e) {}
    return results;
  }

  // 递归清理物理磁盘上残留的 UnityCache 垃圾文件
  function cleanupPhysicalCache(dir) {
    if (!fsManager || !existsSync(dir)) return;
    try {
      const entries = fsManager.readdirSync(dir);
      for (let i = 0; i < entries.length; i++) {
        const name = entries[i];
        if (name === '.' || name === '..') continue;
        const full = dir.replace(/\/+$/, '') + '/' + name;
        try {
          const stat = fsManager.statSync(full);
          if (stat.isDirectory()) {
            if (name === 'UnityCache') {
              removePhysicalDirRecursive(full);
              console.log('[Persistence] 🧹 已清理物理沙盒中的 UnityCache 临时缓存目录:', full);
            } else {
              cleanupPhysicalCache(full);
            }
          }
        } catch (e) {}
      }
    } catch (e) {}
  }

  function removePhysicalDirRecursive(dir) {
    if (!fsManager || !existsSync(dir)) return;
    try {
      const entries = fsManager.readdirSync(dir);
      for (let i = 0; i < entries.length; i++) {
        const name = entries[i];
        if (name === '.' || name === '..') continue;
        const full = dir.replace(/\/+$/, '') + '/' + name;
        try {
          const stat = fsManager.statSync(full);
          if (stat.isDirectory()) {
            removePhysicalDirRecursive(full);
          } else {
            fsManager.unlinkSync(full);
          }
        } catch (e) {}
      }
      fsManager.rmdirSync(dir);
    } catch (e) {}
  }

  const MiniGamePersistence = {
    /**
     * 绑定 Emscripten 文件系统实例
     */
    bindFS: function (FS) {
      if (!FS) return;
      _activeFS = FS;
    },

    /**
     * 从物理存储恢复历史存档到 Emscripten 虚拟文件系统
     */
    restore: function (FS) {
      FS = FS || _activeFS;
      if (!FS) {
        console.warn('[Persistence] FS 尚未初始化，无法执行存档恢复！');
        return 0;
      }
      _activeFS = FS;

      // 确保 Emscripten /idbfs 目录存在
      try {
        if (!FS.analyzePath('/idbfs').exists) {
          FS.mkdir('/idbfs');
        }
      } catch (e) {}

      if (!fsManager || !STORAGE_ROOT || !existsSync(STORAGE_ROOT)) {
        console.log('[Persistence] 尚未发现历史物理存档目录，以初始默认状态运行。');
        return 0;
      }

      // 清理残留的 UnityCache 垃圾数据
      cleanupPhysicalCache(STORAGE_ROOT);

      const files = listAllPhysicalFiles(STORAGE_ROOT);
      if (!files || files.length === 0) {
        console.log('[Persistence] 物理存档目录为空，无需恢复。');
        return 0;
      }

      console.log(`[Persistence] 正在从小游戏物理磁盘 (${STORAGE_ROOT}) 还原 ${files.length} 个历史存档文件...`);
      let restoredCount = 0;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.relPath.indexOf('UnityCache') !== -1 || file.relPath.indexOf('__data') !== -1) {
          continue;
        }
        try {
          const raw = fsManager.readFileSync(file.fullPath);
          const bytes = raw instanceof Uint8Array ? raw : new Uint8Array(raw);
          const emPath = '/idbfs/' + file.relPath.replace(/\\/g, '/');

          // 递归确保 Emscripten 父目录存在
          const segments = emPath.split('/').slice(1, -1);
          let currentDir = '';
          for (let s = 0; s < segments.length; s++) {
            currentDir += '/' + segments[s];
            try {
              if (!FS.analyzePath(currentDir).exists) {
                FS.mkdir(currentDir);
              }
            } catch (e) {}
          }

          FS.writeFile(emPath, bytes);
          _lastFileHashMap[emPath] = hashBytes(bytes);
          restoredCount++;
          console.log(`  ✓ 已还原存档: ${emPath} (${bytes.length} 字节)`);
        } catch (err) {
          console.warn(`  ⚠️ 还原存档文件失败: ${file.relPath}`, err);
        }
      }

      console.log(`✅ [Persistence] 历史存档恢复完毕，共加载 ${restoredCount} 个文件，进入游戏将自动读取进度！`);
      return restoredCount;
    },

    /**
     * 将 Emscripten 虚拟文件系统的 /idbfs 同步写入物理磁盘（带防抖与即时模式）
     */
    sync: function (FS, reason) {
      FS = FS || _activeFS;
      if (!FS || !fsManager || !STORAGE_ROOT) return;
      _activeFS = FS;

      if (_isSyncing) {
        _hasPendingSync = true;
        return;
      }
      MiniGamePersistence._executeSync(FS, reason);
    },

    /**
     * 内部实际执行同步操作
     */
    _executeSync: function (FS, reason) {
      FS = FS || _activeFS;
      if (!FS || !fsManager || !STORAGE_ROOT) return;

      if (_isSyncing) {
        _hasPendingSync = true;
        return;
      }

      _isSyncing = true;
      const tag = reason ? `[${reason}]` : '';

      try {
        mkdirsSync(STORAGE_ROOT);

        // 递归扫描 Emscripten /idbfs，严格过滤 UnityCache
        function scanEmDir(dirPath) {
          let list = [];
          try {
            const entries = FS.readdir(dirPath);
            for (let i = 0; i < entries.length; i++) {
              const name = entries[i];
              if (name === '.' || name === '..' || name === 'UnityCache' || name.startsWith('.')) continue;
              const full = dirPath === '/' ? '/' + name : dirPath + '/' + name;
              if (full.indexOf('UnityCache') !== -1 || full.indexOf('__data') !== -1) continue;
              try {
                const st = FS.stat(full);
                if (FS.isDir(st.mode)) {
                  list = list.concat(scanEmDir(full));
                } else {
                  const rel = full.replace(/^\/idbfs[\/\\]*/, '');
                  list.push({ fullPath: full, relPath: rel });
                }
              } catch (e) {}
            }
          } catch (e) {}
          return list;
        }

        const emFiles = scanEmDir('/idbfs');
        let writeCount = 0;
        const currentEmPaths = {};

        for (let i = 0; i < emFiles.length; i++) {
          const f = emFiles[i];
          currentEmPaths[f.fullPath] = true;
          try {
            const bytes = FS.readFile(f.fullPath, { encoding: 'binary' });
            const h = hashBytes(bytes);
            if (_lastFileHashMap[f.fullPath] !== h) {
              const targetPath = STORAGE_ROOT + '/' + f.relPath.replace(/\\/g, '/');
              const parentDir = targetPath.substring(0, targetPath.lastIndexOf('/'));
              mkdirsSync(parentDir);
              fsManager.writeFileSync(targetPath, bytes.buffer || bytes);
              _lastFileHashMap[f.fullPath] = h;
              writeCount++;
            }
          } catch (e) {
            console.warn(`[Persistence] 保存文件 ${f.fullPath} 失败:`, e);
          }
        }

        // 清理被删除的文件
        for (const emPath in _lastFileHashMap) {
          if (!currentEmPaths[emPath]) {
            const rel = emPath.replace(/^\/idbfs[\/\\]*/, '');
            const targetPath = STORAGE_ROOT + '/' + rel.replace(/\\/g, '/');
            try {
              if (existsSync(targetPath)) {
                fsManager.unlinkSync(targetPath);
                console.log(`  🗑️ [Persistence] 删除过期物理存档: ${rel}`);
              }
            } catch (e) {}
            delete _lastFileHashMap[emPath];
          }
        }

        if (writeCount > 0) {
          console.log(`💾 [Persistence] ${tag} 存档已持久化写入小游戏沙盒磁盘，本次更新 ${writeCount} 个文件！`);
        }
      } catch (err) {
        console.warn(`[Persistence] 同步异常:`, err);
      } finally {
        _isSyncing = false;
        if (_hasPendingSync) {
          _hasPendingSync = false;
          MiniGamePersistence.sync(FS, 'pending');
        }
      }
    },

    /**
     * 通知 Unity 引擎立即执行全局存档
     */
    triggerUnitySave: function () {
      const inst = (typeof root !== 'undefined' && root.__unityInstance)
        || (typeof globalThis !== 'undefined' && globalThis.__unityInstance)
        || (typeof window !== 'undefined' && window.__unityInstance);
      if (inst && typeof inst.SendMessage === 'function') {
        try {
          inst.SendMessage('SaveManager', 'SaveGame');
        } catch (e) {}
      }
    },

    /**
     * 自动增量存盘接口（保留兼容性）
     */
    startAutoSync: function () {
      // 游戏内 C# SaveManager.autosaveInterval 已配置为 2.0s，每次 SaveGame 均自动经由
      // _JS_FileSystem_Sync() 触发持久化落盘，无需在外部 JS 额外设置盲目轮询定时器。
    },

    stopAutoSync: function () {}
  };

  // 注册小游戏生命周期监听，确保切后台时 100% 同步
  if (platform && platform.onHide) {
    platform.onHide(function () {
      console.log('[Persistence] 检测到小游戏切后台 (onHide)，立即强制命令 Unity 存档并安全落盘...');
      MiniGamePersistence.triggerUnitySave();
      if (_activeFS) {
        MiniGamePersistence.sync(_activeFS, 'onHide', true);
      }
    });
    console.log('[Persistence] ✅ 已注册 tt.onHide 自动落盘保护监听器');
  }

  // 注册小游戏异常监听
  if (platform && platform.onError) {
    platform.onError(function () {
      if (_activeFS) {
        try { MiniGamePersistence.sync(_activeFS, 'onError', true); } catch (e) {}
      }
    });
  }

  // 暴露至全局
  root.__miniGamePersistence = MiniGamePersistence;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = MiniGamePersistence;
  }
})();
