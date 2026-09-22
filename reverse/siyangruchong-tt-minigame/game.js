/**
 * 《饲养蠕虫》(worm-capitalist) 抖音小游戏主启动入口 (game.js)
 * 
 * 架构规范：
 * 1. 顶级全局异常捕获网与全域 Loading 自愈管理器；
 * 2. 官方分包 (wasm_pkg/) 异步挂载与 WASM 流式编译；
 * 3. 核心数据包本地沙盒持久化缓存 (${tt.env.USER_DATA_PATH}/unity_cache)；
 * 4. 商业化 SDK 调度器与微内核主循环启动。
 */

// 0. 开启真机调试面板 (无需 USB 数据线，手机端扫码预览自动唤出绿色 vConsole 悬浮窗)
if (typeof tt !== 'undefined' && typeof tt.setEnableDebug === 'function') {
  try {
    tt.setEnableDebug({
      enableDebug: true,
      success() {
        console.log('[vConsole] ✅ 已成功激活手机端原生 vConsole 悬浮日志面板');
      },
      fail(err) {
        console.warn('[vConsole] 激活失败:', err);
      }
    });
  } catch (e) {}
}

// 1. 顶级异常捕获 (杜绝静默假死)
if (typeof tt !== 'undefined' && tt.onError) {
  tt.onError(function (err) {
    console.error('>>> [GLOBAL UNCAUGHT ERROR] <<<', err);
    try {
      const msg = (err && (err.message || err.errMsg || err.stack || (typeof err === 'object' ? JSON.stringify(err) : String(err)))) || '未知脚本异常';
      // 过滤非致命的平台告警、ResizeObserver、以及底层音频渲染微任务异常
      if (
        msg.includes('ResizeObserver') ||
        msg.includes('AudioContext') ||
        msg.includes('The play() request was interrupted') ||
        msg.includes('no update callback') ||
        msg.includes('WebAudioProcess') ||
        msg.includes('setWX_') ||
        msg.includes('createMediaElementSource') ||
        msg.includes('mediaElement')
      ) {
        console.warn('[GlobalErrorHandler] 已拦截并忽略底层音频/平台非致命告警:', msg);
        return;
      }
      if (typeof tt.showModal === 'function') {
        tt.showModal({
          title: '脚本执行异常 (请截图反馈)',
          content: msg.slice(0, 500),
          showCancel: false
        });
      }
    } catch (e) {}
  });
}

// 2. 加载平台环境适配器与持久化系统
require('./adapter/tt-unity-adapter.js');
require('./adapter/persistence.js');

// 3. 读取运行时配置与商业化管理器
const CONFIG = require('./config.js');
const SDKManager = require('./SDKManager.js');
const { createUnityInstance } = require('./engine/unity-loader.js');

SDKManager.configure({
  adMode: 'development-fallback-success',
  rewardedAdUnitId: CONFIG.ADS.REWARDED_ID,
  interstitialAdUnitId: CONFIG.ADS.INTERSTITIAL_ID
});

// 4. 全域统一 Loading 遮罩自愈管理器 (一票解除、多级阶梯保底)
let isMaskDismissed = false;
function dismissLoadingMask(reason) {
  if (isMaskDismissed) return;
  isMaskDismissed = true;
  console.log(`[LoadingManager] ✅ 解除全屏遮罩，触发原因: ${reason}`);
  const hide = () => {
    try {
      if (typeof tt !== 'undefined' && tt.hideLoading) {
        tt.hideLoading({ fail() {} });
      }
    } catch (e) {}
  };
  hide();
  setTimeout(hide, 200);
  setTimeout(hide, 600);
  setTimeout(hide, 1500);
}

const root = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : self);
root.__dismissLoadingMask = dismissLoadingMask;
if (typeof GameGlobal !== 'undefined') GameGlobal.__dismissLoadingMask = dismissLoadingMask;

// 5. 本地沙盒缓存管理器 (${tt.env.USER_DATA_PATH}/unity_cache)
function getCacheManager() {
  const fs = (typeof tt !== 'undefined' && tt.getFileSystemManager) ? tt.getFileSystemManager() : null;
  const basePath = (typeof tt !== 'undefined' && tt.env && tt.env.USER_DATA_PATH)
    ? `${tt.env.USER_DATA_PATH}/unity_cache_${CONFIG.ASSET_CACHE_VERSION}`
    : null;

  function ensureDir(dir) {
    if (!fs || !dir) return;
    try {
      fs.accessSync(dir);
    } catch (e) {
      try {
        fs.mkdirSync(dir, true);
      } catch (e2) {}
    }
  }

  if (basePath) ensureDir(basePath);

  return {
    getCachedPath: function (filename) {
      if (!basePath || !fs) return null;
      const target = `${basePath}/${filename}`;
      try {
        fs.accessSync(target);
        return target;
      } catch (e) {
        return null;
      }
    },
    saveToCache: function (tempPath, filename) {
      if (!basePath || !fs) return Promise.resolve(tempPath);
      const target = `${basePath}/${filename}`;
      return new Promise((resolve, reject) => {
        fs.saveFile({
          tempFilePath: tempPath,
          filePath: target,
          success: () => {
            console.log(`[CacheManager] ✅ 已成功持久化至本地沙盒: ${target}`);
            resolve(target);
          },
          fail: (err) => {
            console.warn('[CacheManager] 持久化缓存失败，使用临时路径:', err);
            resolve(tempPath);
          }
        });
      });
    }
  };
}

// 6. 统一资产下载器 (带防抖进度)
let lastProgressTime = 0;
function updateProgress(title, percent) {
  const now = Date.now();
  if (now - lastProgressTime < 150 && percent < 0.99) return;
  lastProgressTime = now;
  const p = Math.min(100, Math.max(0, Math.round(percent * 100)));
  try {
    if (typeof tt !== 'undefined' && tt.showLoading) {
      tt.showLoading({
        title: `${title} (${p}%)`,
        mask: true
      });
    }
  } catch (e) {}
}

function loadDataAsset(filename, url) {
  const cacheMgr = getCacheManager();
  const cached = cacheMgr.getCachedPath(filename);
  if (cached) {
    console.log(`[AssetLoader] 命中本地沙盒强缓存: ${cached}`);
    return Promise.resolve(cached);
  }

  console.log(`[AssetLoader] 开始从 CDN 拉取核心资产: ${url} ...`);
  updateProgress('装载核心资产', 0.05);

  return new Promise((resolve, reject) => {
    if (typeof tt === 'undefined' || !tt.downloadFile) {
      return reject(new Error('tt.downloadFile not supported in this environment'));
    }

    const task = tt.downloadFile({
      url: url,
      success: function (res) {
        if (res.statusCode === 200 && res.tempFilePath) {
          updateProgress('装载核心资产', 0.95);
          cacheMgr.saveToCache(res.tempFilePath, filename).then(resolve).catch(reject);
        } else {
          reject(new Error(`Download failed with status: ${res.statusCode}`));
        }
      },
      fail: function (err) {
        reject(err);
      }
    });

    task.onProgressUpdate(function (p) {
      if (p.totalBytesExpectedToWrite > 0) {
        updateProgress('装载核心资产', p.totalBytesWritten / p.totalBytesExpectedToWrite);
      }
    });
  });
}

// 7. 异步加载 WASM 官方分包
function loadWasmSubpackage() {
  console.log('[Subpackage] 正在挂载 wasm_pkg 官方分包...');
  return new Promise((resolve, reject) => {
    if (typeof tt !== 'undefined' && typeof tt.loadSubpackage === 'function') {
      const task = tt.loadSubpackage({
        name: 'wasm_pkg',
        success: function () {
          console.log('✅ [Subpackage] wasm_pkg 分包挂载成功');
          resolve(CONFIG.WASM_SUBPACKAGE_PATH);
        },
        fail: function (err) {
          console.warn('[Subpackage] 分包加载异常，尝试本地/CDN 回退:', err);
          resolve(CONFIG.WASM_SUBPACKAGE_PATH);
        }
      });
    } else {
      resolve(CONFIG.WASM_SUBPACKAGE_PATH);
    }
  });
}

// 8. 启动主引擎流程
console.log('====================================================');
console.log('  《饲养蠕虫》(worm-capitalist) 抖音小游戏微内核启动器  ');
console.log('====================================================');

updateProgress('正在初始化', 0.01);

const dataUrl = `${CONFIG.CDN_BASE_URL}/Build/${CONFIG.DATA_FILENAME}`;

Promise.all([
  loadWasmSubpackage(),
  loadDataAsset(CONFIG.DATA_FILENAME, dataUrl)
]).then(([wasmPath, dataLocalPath]) => {
  updateProgress('启动游戏引擎', 0.98);
  console.log(`[Boot] 核心资产就绪: WASM=${wasmPath}, DATA=${dataLocalPath}`);

  const canvas = root.__mainCanvas;
  const unityConfig = {
    codeUrl: wasmPath,
    dataPath: dataLocalPath,
    streamingAssetsUrl: `${CONFIG.CDN_BASE_URL}/StreamingAssets`,
    companyName: CONFIG.COMPANY_NAME,
    productName: CONFIG.PRODUCT_NAME,
    productVersion: CONFIG.PRODUCT_VERSION
  };

  createUnityInstance(canvas, unityConfig, (p) => {
    updateProgress('启动游戏引擎', p);
  }).then((unityInstance) => {
    console.log('🎉 《饲养蠕虫》 引擎主循环已顺利启动！');
    if (typeof root !== 'undefined') root.__unityInstance = unityInstance;
    if (typeof globalThis !== 'undefined') globalThis.__unityInstance = unityInstance;
    if (typeof window !== 'undefined') window.__unityInstance = unityInstance;
    dismissLoadingMask('引擎完全就绪');
  }).catch((err) => {
    console.error('❌ [Boot] 游戏引擎初始化失败:', err);
    if (typeof tt !== 'undefined' && tt.showModal) {
      const errName = (err && err.name) ? String(err.name) : '';
      const errMsg = (err && (err.message || err.errMsg || err.description)) ? String(err.message || err.errMsg || err.description) : '';
      const errHeader = (errName && errMsg) ? `${errName}: ${errMsg}` : (errName || errMsg);
      const errStack = (err && err.stack) ? String(err.stack) : '';
      let fullErr = '';
      if (errHeader && errStack) {
        fullErr = `${errHeader}\n${errStack}`;
      } else {
        fullErr = errHeader || errStack || String(err || '未知引擎异常');
      }
      tt.showModal({
        title: '引擎启动失败',
        content: fullErr.slice(0, 500),
        showCancel: false
      });
    }
  });
}).catch((err) => {
  console.error('❌ [Boot] 资产加载失败:', err);
  if (typeof tt !== 'undefined' && tt.showModal) {
    const errText = (err && (err.errMsg || err.message)) || (typeof err === 'object' ? JSON.stringify(err) : String(err));
    tt.showModal({
      title: '网络资源加载失败',
      content: '请确认本地 CDN 服务 (serve_cdn.py) 已启动，或网络连接正常。\n' + errText,
      showCancel: false
    });
  }
});
