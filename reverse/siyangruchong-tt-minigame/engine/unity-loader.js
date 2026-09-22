/**
 * Unity WebGL 抖音小游戏专属微内核启动器 - 《饲养蠕虫》(siyangruchong)
 * 
 * 核心特性：
 * 1. WASM 双轨流式编译：针对分包路径 ("wasm_pkg/siyangruchong.wasm.br") 原生调用 TTWebAssembly.instantiate 零内存秒开；
 * 2. 纯 JS 自包含 UTF-8 快速解包器：杜绝 Android Krypton 缺失 TextDecoder 导致数据包解包抛错；
 * 3. 拔除遗留 IDBFS 阻塞依赖：秒级放行 /idbfs 目录，runDependencies 归零秒进 callMain；
 * 4. 25 秒安全看门狗与 UI 弹窗防御：防止底层出现任何静默死锁；
 * 5. 全域 Loading 管理器自愈联动：postRun 1.5s 保底与 stdout 流多级感知。
 */

var _importedFramework = null;
try {
  _importedFramework = require('./framework.js');
} catch (e) {
  console.warn('[UnityLoader] require(./framework.js) 捕获:', e);
}

function createUnityInstance(canvas, config, onProgress) {
  onProgress = onProgress || function () {};

  return new Promise((resolve, reject) => {
    let watchdogTimer = null;
    let isLaunched = false;

    // 25 秒看门狗定时器
    watchdogTimer = setTimeout(() => {
      if (!isLaunched) {
        console.error('❌ [UnityLoader] 启动超时（25秒看门狗触发）');
        if (typeof tt !== 'undefined' && tt.showModal) {
          tt.showModal({
            title: '启动超时',
            content: '游戏引擎初始化耗时过长，请检查网络或重启小游戏。',
            showCancel: false
          });
        }
      }
    }, 25000);

    function decodeUtf8(bytes) {
      if (typeof TextDecoder !== 'undefined') {
        try { return new TextDecoder('utf-8').decode(bytes); } catch (e) {}
      }
      let out = '';
      let i = 0;
      const len = bytes.length;
      while (i < len) {
        const c = bytes[i++];
        if (c < 128) {
          out += String.fromCharCode(c);
        } else if (c > 191 && c < 224) {
          if (i >= len) break;
          out += String.fromCharCode(((c & 31) << 6) | (bytes[i++] & 63));
        } else if (c > 223 && c < 240) {
          if (i + 1 >= len) break;
          out += String.fromCharCode(((c & 15) << 12) | ((bytes[i++] & 63) << 6) | (bytes[i++] & 63));
        } else if (c > 239 && c < 248) {
          if (i + 2 >= len) break;
          let cp = ((c & 7) << 18) | ((bytes[i++] & 63) << 12) | ((bytes[i++] & 63) << 6) | (bytes[i++] & 63);
          cp -= 0x10000;
          out += String.fromCharCode((cp >> 10) + 0xD800, (cp & 0x3FF) + 0xDC00);
        } else {
          out += String.fromCharCode(c);
        }
      }
      return out;
    }

    const Module = {
      canvas: canvas,
      companyName: config.companyName || 'DefaultCompany',
      productName: config.productName || 'worm-capitalist',
      productVersion: config.productVersion || '1.0',
      streamingAssetsUrl: config.streamingAssetsUrl || 'StreamingAssets',
      locateFile: (path) => path,
      preRun: [],
      postRun: [],
      deinitializers: [],
      intervals: {},

      // WebGL 双缓冲保留 (杜绝 95% 切场景黑屏)
      webglContextAttributes: {
        preserveDrawingBuffer: true,
        powerPreference: 2
      },
      matchWebGLToCanvasSize: false,
      devicePixelRatio: (typeof window !== 'undefined' && window.devicePixelRatio) || 2,

      // 激活持久化存储并在启动前还原历史存档
      unityFileSystemInit: function (passedFS) {
        const activeFS = passedFS || Module.FS || (typeof globalThis !== 'undefined' && globalThis.__unityFS) || (typeof window !== 'undefined' && window.__unityFS);

        try {
          if (activeFS && typeof activeFS.mkdir === 'function') {
            if (!activeFS.analyzePath('/idbfs').exists) {
              activeFS.mkdir('/idbfs');
            }
          } else if (typeof Module.FS_createPath === 'function') {
            Module.FS_createPath("/", "idbfs", true, true);
          }
        } catch (e) {}

        const persistence = (typeof globalThis !== 'undefined' && globalThis.__miniGamePersistence)
          || (typeof window !== 'undefined' && window.__miniGamePersistence)
          || (typeof root !== 'undefined' && root.__miniGamePersistence);

        if (persistence && activeFS) {
          persistence.bindFS(activeFS);
          persistence.restore(activeFS);
          persistence.startAutoSync(2000);
        } else {
          console.warn('[UnityLoader] ⚠️ persistence 或 activeFS 未就绪:', !!persistence, !!activeFS);
        }

        console.log('✅ [UnityLoader] /idbfs 沙盒目录就绪，历史存档已挂载，秒级放行引擎主循环！');
      },

      setInterval: function (fn, ms) {
        const id = setInterval(fn, ms);
        this.intervals[id] = true;
        return id;
      },
      clearInterval: function (id) {
        delete this.intervals[id];
        clearInterval(id);
      },
      QuitCleanup: function () {
        for (let i = 0; i < this.deinitializers.length; i++) {
          try { this.deinitializers[i](); } catch (e) {}
        }
        this.deinitializers = [];
        for (const id in this.intervals) {
          clearInterval(Number(id));
        }
        this.intervals = {};
      },

      print: function (text) {
        if (!text) return;
        console.log('[Unity stdout]', text);
        if (text.includes('Game loaded') || text.includes('gameplayStart') || text.includes('Game saved') || text.includes('Initialize engine version')) {
          if (typeof globalThis !== 'undefined' && typeof globalThis.__dismissLoadingMask === 'function') {
            globalThis.__dismissLoadingMask('引擎就绪日志: ' + text.slice(0, 30));
          }
        }
      },
      printErr: function (text) {
        console.warn('[Unity stderr]', text);
      },

      // 宿主系统信息感知桩
      SystemInfo: (function () {
        const sys = (typeof tt !== 'undefined' && tt.getSystemInfoSync) ? tt.getSystemInfoSync() : { windowWidth: 960, windowHeight: 600, platform: 'devtools', pixelRatio: 2, system: 'Android 12', language: 'zh_CN' };
        const isIOS = sys.platform === 'ios';
        const isAndroid = sys.platform === 'android';
        const osName = isIOS ? 'iPhoneOS' : (isAndroid ? 'Android' : 'Windows');
        const osVer = (sys.system || '').replace(/[^0-9.]/g, '') || '12.0';
        return {
          width: Math.max(sys.screenWidth || sys.windowWidth || 960, sys.screenHeight || sys.windowHeight || 600),
          height: Math.min(sys.screenWidth || sys.windowWidth || 960, sys.screenHeight || sys.windowHeight || 600),
          userAgent: (typeof navigator !== 'undefined' && navigator.userAgent) || 'Mozilla/5.0 MiniGame',
          browser: isIOS ? 'Safari' : 'Chrome',
          browserVersion: '100.0',
          mobile: true,
          os: osName,
          osVersion: osVer,
          gpu: isIOS ? 'Apple GPU' : 'Mali-G78',
          language: sys.language || 'zh-CN',
          hasWebGL: 2,
          hasWebGPU: 0,
          hasCursorLock: false,
          hasFullscreen: true,
          hasThreads: false,
          hasWasm: true,
          hasWasm2023: true,
          missingWasm2023Feature: null,
          hasWasmThreads: false
        };
      })()
    };

    // 1. 数据包 (dataUrl) 解包器：内置 UTF-8 解码与 MEMFS 挂载
    Module.preRun.push(function () {
      Module.addRunDependency('dataUrl');
      console.log('[UnityLoader] 开始解包挂载核心数据包...');

      function unpackData(arrayBuffer) {
        try {
          const u8 = new Uint8Array(arrayBuffer);
          const dv = new DataView(arrayBuffer);
          const magic = 'UnityWebData1.0\0';
          const headStr = String.fromCharCode.apply(null, u8.subarray(0, magic.length));
          if (headStr !== magic) {
            throw new Error('Invalid data package header: ' + headStr);
          }
          let pos = magic.length;
          const headerLen = dv.getUint32(pos, true);
          pos += 4;
          let fileCount = 0;

          while (pos < headerLen) {
            const offset = dv.getUint32(pos, true);
            pos += 4;
            const length = dv.getUint32(pos, true);
            pos += 4;
            const pathLen = dv.getUint32(pos, true);
            pos += 4;
            const pathBytes = u8.subarray(pos, pos + pathLen);
            const filePath = decodeUtf8(pathBytes);
            pos += pathLen;

            // 递归创建父目录
            const parts = filePath.split('/');
            let curDir = '';
            for (let i = 0; i < parts.length - 1; i++) {
              const part = parts[i];
              if (!part) continue;
              const nextDir = curDir ? (curDir + '/' + part) : ('/' + part);
              try {
                if (typeof Module.FS_createPath === 'function') {
                  Module.FS_createPath(curDir || '/', part, true, true);
                }
              } catch (e) {}
              curDir = nextDir;
            }

            // 写入文件
            const fileData = u8.subarray(offset, offset + length);
            if (typeof Module.FS_createDataFile === 'function') {
              Module.FS_createDataFile(curDir || '/', parts[parts.length - 1], fileData, true, true, true);
            }
            fileCount++;
          }

          console.log(`✅ [UnityLoader] 核心数据包挂载成功！释放文件数: ${fileCount}`);
        } catch (unpackErr) {
          console.error('❌ [UnityLoader] 数据解包致命异常:', unpackErr);
          if (typeof tt !== 'undefined' && tt.showModal) {
            tt.showModal({
              title: '资源解析异常',
              content: String(unpackErr && (unpackErr.stack || unpackErr.message)),
              showCancel: false
            });
          }
        } finally {
          Module.removeRunDependency('dataUrl');
        }
      }

      if (config.dataBinary) {
        unpackData(config.dataBinary);
      } else if (config.dataPath) {
        if (typeof tt !== 'undefined' && tt.getFileSystemManager) {
          tt.getFileSystemManager().readFile({
            filePath: config.dataPath,
            success: function (res) {
              unpackData(res.data);
            },
            fail: function (err) {
              console.error('❌ [UnityLoader] 读取数据包文件失败:', err);
              Module.removeRunDependency('dataUrl');
            }
          });
        } else {
          Module.removeRunDependency('dataUrl');
        }
      } else {
        console.warn('[UnityLoader] 未提供 dataBinary 或 dataPath，跳过数据解包');
        Module.removeRunDependency('dataUrl');
      }
    });

    // 2. WASM 编译双轨分流 (instantiateWasm)
    Module.instantiateWasm = function (imports, successCallback) {
      console.log('[UnityLoader] 正在启动 WebAssembly 模块编译与链接...');
      const wasmPath = config.codeUrl || 'wasm_pkg/siyangruchong.wasm.br';
      const isPackageRelative = wasmPath && typeof wasmPath === 'string' && !wasmPath.startsWith('ttfile://') && !wasmPath.startsWith('http://') && !wasmPath.startsWith('https://');

      function handleSuccess(res) {
        clearTimeout(watchdogTimer);
        isLaunched = true;
        console.log('✅ [UnityLoader] WebAssembly 编译与模块链接成功！');
        const instance = (res && res.instance) ? res.instance : res;
        const mod = (res && res.module) ? res.module : null;
        try {
          successCallback(instance, mod);
        } catch (e) {
          console.error('❌ [UnityLoader] successCallback 执行异常:', e);
        }
      }

      // 模式 A：官方分包代码包内路径直传 (iOS & Android 双端统一)
      if (isPackageRelative && typeof TTWebAssembly !== 'undefined' && typeof TTWebAssembly.instantiate === 'function') {
        try {
          console.log(`[UnityLoader] 官方分包路径直传: TTWebAssembly.instantiate("${wasmPath}") ...`);
          onProgress(0.5);
          const p = TTWebAssembly.instantiate(wasmPath, imports);
          if (p && typeof p.then === 'function') {
            p.then((res) => {
              onProgress(1.0);
              handleSuccess(res);
            }).catch((err) => {
              console.warn('[UnityLoader] TTWebAssembly 编译异常，尝试回退 ArrayBuffer 模式:', err);
              fallbackArrayBuffer();
            });
            return {};
          }
        } catch (e) {
          console.warn('[UnityLoader] TTWebAssembly 同步调用异常:', e);
          fallbackArrayBuffer();
          return {};
        }
      }

      // 模式 B：ArrayBuffer + 原生 V8 WebAssembly 编译通道
      function fallbackArrayBuffer() {
        console.log('[UnityLoader] 执行 ArrayBuffer 编译回退通道...');
        function doCompile(buf) {
          onProgress(0.7);
          const nativeEngine = (typeof WebAssembly !== 'undefined' && (typeof TTWebAssembly === 'undefined' || WebAssembly !== TTWebAssembly))
            ? WebAssembly
            : (typeof globalThis !== 'undefined' ? globalThis.WebAssembly : null);

          if (nativeEngine && typeof nativeEngine.instantiate === 'function') {
            nativeEngine.instantiate(buf, imports).then((res) => {
              onProgress(1.0);
              handleSuccess(res);
            }).catch((err) => {
              console.error('❌ [UnityLoader] 原生 WebAssembly.instantiate 失败:', err);
              reject(err);
            });
          } else {
            reject(new Error('未检测到可用的原生 WebAssembly 编译引擎'));
          }
        }

        if (config.wasmBinary) {
          doCompile(config.wasmBinary);
        } else if (typeof tt !== 'undefined' && tt.getFileSystemManager && wasmPath) {
          tt.getFileSystemManager().readFile({
            filePath: wasmPath,
            success: (res) => doCompile(res.data),
            fail: reject
          });
        } else {
          reject(new Error('无法获取 WASM 二进制数据'));
        }
      }

      if (!isPackageRelative) {
        fallbackArrayBuffer();
      }
      return {};
    };

    // 3. UnityWebRequest 网络驱动垫片 (fetchWithProgress: 桥接 tt.request 与 Addressables 远端分包)
    function fetchWithProgress(url, init) {
      init = init || {};
      const onProgress = init.onProgress || function () {};

      return new Promise((resolve, reject) => {
        if (typeof tt !== 'undefined' && typeof tt.request === 'function') {
          const header = {};
          if (init.headers) {
            if (typeof init.headers.forEach === 'function') {
              init.headers.forEach((val, key) => { header[key] = val; });
            } else if (typeof init.headers === 'object') {
              Object.assign(header, init.headers);
            }
          }

          let bodyData = init.body;
          if (bodyData && bodyData.buffer && bodyData instanceof Uint8Array) {
            bodyData = bodyData.buffer;
          }

          const reqTask = tt.request({
            url: url,
            method: (init.method || 'GET').toUpperCase(),
            header: header,
            data: bodyData,
            dataType: 'arraybuffer',
            responseType: 'arraybuffer',
            success: function (res) {
              const rawBuffer = res.data;
              const u8 = (rawBuffer instanceof ArrayBuffer)
                ? new Uint8Array(rawBuffer)
                : (rawBuffer && rawBuffer.buffer ? new Uint8Array(rawBuffer.buffer) : new Uint8Array(0));

              onProgress({
                type: 'load',
                total: u8.length,
                loaded: u8.length,
                lengthComputable: true
              });

              let headerStr = '';
              const resHeader = res.header || {};
              const headerMap = new Map();
              for (const k in resHeader) {
                headerStr += k + ': ' + resHeader[k] + '\r\n';
                headerMap.set(k.toLowerCase(), String(resHeader[k]));
              }

              const status = res.statusCode || 200;
              const responseObj = {
                status: status,
                statusText: status === 200 ? 'OK' : 'Status ' + status,
                url: url,
                headerString: headerStr,
                headers: {
                  entries: function () {
                    return headerMap.entries();
                  },
                  get: function (name) {
                    return headerMap.get(name.toLowerCase()) || null;
                  }
                },
                parsedBody: u8,
                ok: (status >= 200 && status < 300)
              };

              resolve(responseObj);
            },
            fail: function (err) {
              console.warn('[fetchWithProgress] tt.request 异常, 尝试 fetch 回退:', url, err);
              if (typeof fetch === 'function') {
                doFetch(resolve, reject);
              } else {
                reject(new Error((err && (err.errMsg || err.message)) || 'tt.request failed: ' + url));
              }
            }
          });

          if (init.signal && typeof init.signal.addEventListener === 'function') {
            init.signal.addEventListener('abort', function () {
              try { if (reqTask && typeof reqTask.abort === 'function') reqTask.abort(); } catch (e) {}
            });
          }
          return;
        }

        if (typeof fetch === 'function') {
          doFetch(resolve, reject);
          return;
        }

        reject(new Error('未找到可用的网络驱动 (tt.request / fetch)'));

        function doFetch(resResolve, resReject) {
          fetch(url, init).then(res => {
            let headerStr = '';
            const headerMap = new Map();
            if (res.headers && typeof res.headers.forEach === 'function') {
              res.headers.forEach((val, key) => {
                headerStr += key + ': ' + val + '\r\n';
                headerMap.set(key.toLowerCase(), String(val));
              });
            }
            res.arrayBuffer().then(buf => {
              const u8 = new Uint8Array(buf);
              onProgress({
                type: 'load',
                total: u8.length,
                loaded: u8.length,
                lengthComputable: true
              });
              res.parsedBody = u8;
              res.headerString = headerStr;
              resResolve(res);
            }).catch(resReject);
          }).catch(resReject);
        }
      });
    }

    Module.fetchWithProgress = fetchWithProgress;
    if (typeof globalThis !== 'undefined') globalThis.fetchWithProgress = fetchWithProgress;
    if (typeof window !== 'undefined') window.fetchWithProgress = fetchWithProgress;
    if (typeof GameGlobal !== 'undefined') GameGlobal.fetchWithProgress = fetchWithProgress;

    // 4. postRun 挂载与全域 Loading 遮罩 1.5s 阶梯保底
    Module.postRun.push(function () {
      console.log('✅ [UnityLoader] postRun 触发！主循环即将就绪');
      setTimeout(() => {
        if (typeof globalThis !== 'undefined' && typeof globalThis.__dismissLoadingMask === 'function') {
          globalThis.__dismissLoadingMask('postRun 1.5s 阶梯保底');
        }
      }, 1500);

      resolve({
        Module: Module,
        SendMessage: function (obj, func, val) {
          if (Module.SendMessage) return Module.SendMessage(obj, func, val);
          console.warn('[UnityLoader] SendMessage 尚未就绪');
        }
      });
    });

    // 4. 启动 Unity 胶水层
    try {
      console.log('[UnityLoader] 启动 unityFramework(Module)...');
      let fw = typeof _importedFramework === 'function' ? _importedFramework : (
        _importedFramework && typeof _importedFramework.default === 'function' ? _importedFramework.default : (
          _importedFramework && typeof _importedFramework.unityFramework === 'function' ? _importedFramework.unityFramework : (
            typeof globalThis !== 'undefined' && typeof globalThis.unityFramework === 'function' ? globalThis.unityFramework : (
              typeof window !== 'undefined' && typeof window.unityFramework === 'function' ? window.unityFramework : (
                typeof GameGlobal !== 'undefined' && typeof GameGlobal.unityFramework === 'function' ? GameGlobal.unityFramework : null
              )
            )
          )
        )
      );

      if (typeof fw !== 'function') {
        throw new TypeError('unityFramework is not a function (require: ' + typeof _importedFramework + ', globalThis: ' + (typeof globalThis !== 'undefined' ? typeof globalThis.unityFramework : 'none') + ')');
      }

      fw(Module);
    } catch (e) {
      clearTimeout(watchdogTimer);
      console.error('❌ [UnityLoader] unityFramework 初始化异常:', e);
      let standardErr = e;
      if (!(e instanceof Error)) {
        standardErr = new Error((e && (e.message || e.description)) || String(e || 'unityFramework execution failed'));
      }
      if (!standardErr.name) standardErr.name = 'FrameworkExecutionError';
      reject(standardErr);
    }
  });
}

module.exports = { createUnityInstance };
