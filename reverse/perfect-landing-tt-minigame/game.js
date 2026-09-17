/**
 * ByteDance MiniGame (抖音小游戏) 主启动引导入口 - Perfect Landing: Plane Pilot
 * 
 * 核心功能：
 *  1. 运行时错误捕获与日志监控 (tt.onError / onUnhandledRejection)
 *  2. 注入 Unity 3D WebGL 专有运行期适配层 (adapter/tt-unity-adapter.js)
 *  3. 加载并部署统一商业化与平台管理器 (SDKManager.js)
 *  4. 构建 PokiSDK 桥接桩至抖音小游戏原生广告（插屏、激励视频、超时熔断兜底）
 *  5. 横竖屏锁定与热重启防死循环机制 (Anti-Loop Orientation Lock)
 *  6. 严格时序的异步分包加载预热 (wasm & data 分包)
 *  7. 启动并托管 Unity WebGL 实例 (createUnityInstance)
 */

'use strict';

const root = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : self);

// ==========================================
// 0. 全局异常与 Rejection 捕获
// ==========================================
if (typeof tt !== 'undefined') {
  if (tt.onError) {
    tt.onError(function (err) {
      console.error('[Unity MiniGame ERROR]:', err);
    });
  }
  if (tt.onUnhandledRejection) {
    tt.onUnhandledRejection(function (res) {
      console.error('[Unity MiniGame UNHANDLED REJECTION]:', res);
    });
  }
}

// ==========================================
// 1. 装载核心运行时适配层
// ==========================================
require('./adapter/tt-unity-adapter.js');

// ==========================================
// 2. 部署统一商业化与平台管理器
// ==========================================
let SDKManager = null;
try {
  SDKManager = require('./SDKManager.js');
  root.SDKManager = SDKManager;
  console.log('[MiniGame] SDKManager 部署成功');
} catch (e) {
  console.warn('[MiniGame] SDKManager 加载警告:', e);
}

// ==========================================
// 3. PokiSDK 桥接桩 ➔ 抖音原生广告调度
// ==========================================
let bridgeName = null;
let readyTimer = null;

function notifyReady() {
  if (root.unityGame && bridgeName) {
    try {
      root.unityGame.SendMessage(bridgeName, "ready");
      console.log("[PokiBridge] 成功向 Unity GameObject 派发 ready 状态:", bridgeName);
    } catch (e) {}
  }
}

root.initPokiBridge = function (name) {
  bridgeName = name;
  console.log("[PokiBridge] 注册 Unity 桥接对象:", name);
  notifyReady();
  let count = 0;
  if (readyTimer) clearInterval(readyTimer);
  readyTimer = setInterval(function () {
    count++;
    notifyReady();
    if (count >= 25) {
      clearInterval(readyTimer);
      readyTimer = null;
    }
  }, 200);
};

// 交互手势保活唤醒 (对齐 Web 试玩版的 pointerdown/keydown 唤醒行为)
if (typeof tt !== 'undefined' && tt.onTouchStart) {
  tt.onTouchStart(function () {
    notifyReady();
  });
}

root.commercialBreak = function () {
  console.log("[PokiBridge] 收到商业化插屏请求");
  if (SDKManager && SDKManager.showInterstitial) {
    SDKManager.showInterstitial(function () {
      if (root.unityGame && bridgeName) {
        try { root.unityGame.SendMessage(bridgeName, "commercialBreakCompleted"); } catch (e) {}
      }
    });
  } else {
    if (root.unityGame && bridgeName) {
      try { root.unityGame.SendMessage(bridgeName, "commercialBreakCompleted"); } catch (e) {}
    }
  }
};

root.rewardedBreak = function () {
  console.log("[PokiBridge] 收到激励视频请求");
  if (SDKManager && SDKManager.showRewarded) {
    SDKManager.showRewarded(function (success) {
      console.log("[PokiBridge] 激励视频结果:", success);
      if (root.unityGame && bridgeName) {
        try {
          root.unityGame.SendMessage(bridgeName, "rewardedBreakCompleted", success ? "true" : "false");
        } catch (e) {}
      }
    });
  } else {
    if (root.unityGame && bridgeName) {
      try { root.unityGame.SendMessage(bridgeName, "rewardedBreakCompleted", "true"); } catch (e) {}
    }
  }
};

// PokiSDK 全局兜底
root.PokiSDK = {
  init: function () { return Promise.resolve(); },
  gameLoadingStart: function () {},
  gameLoadingProgress: function () {},
  gameLoadingFinished: function () {},
  gameplayStart: function () {},
  gameplayStop: function () {},
  commercialBreak: function (fn) {
    root.commercialBreak();
    if (typeof fn === 'function') setTimeout(fn, 50);
    return Promise.resolve();
  },
  rewardedBreak: function (fn) {
    root.rewardedBreak();
    if (typeof fn === 'function') setTimeout(function () { fn(true); }, 50);
    return Promise.resolve(true);
  }
};

// ==========================================
// 4. 横竖屏锁定与防自激死循环控制
// ==========================================
let _isSettingOrientation = false;

function ensureLandscape() {
  if (typeof tt === 'undefined') return;
  if (_isSettingOrientation) return;

  try {
    const sys = tt.getSystemInfoSync();
    if (sys.windowWidth && sys.windowHeight && sys.windowWidth > sys.windowHeight) {
      return; // 已经处于横屏状态，退出防止自激
    }

    if (tt.setDeviceOrientation) {
      _isSettingOrientation = true;
      tt.setDeviceOrientation({
        value: 'landscape',
        orientation: 'landscape',
        direction: 'landscape',
        complete: function () {
          setTimeout(function () { _isSettingOrientation = false; }, 350);
        }
      });
    }
  } catch (err) {
    _isSettingOrientation = false;
  }
}

if (typeof tt !== 'undefined') {
  ensureLandscape();
  if (tt.onDeviceOrientationChange) {
    tt.onDeviceOrientationChange(function (res) {
      if (res && (res.value === 'portrait' || (typeof res === 'string' && res.indexOf('portrait') !== -1))) {
        ensureLandscape();
      }
    });
  }
}

// ==========================================
// 5. 异步分包加载与 Unity 引导
// ==========================================
function loadSubpackage(name) {
  return new Promise(function (resolve) {
    if (typeof tt === 'undefined' || typeof tt.loadSubpackage !== 'function') {
      return resolve();
    }
    console.log(`[MiniGame Subpackage] 正在预载分包: ${name}...`);
    tt.loadSubpackage({
      name: name,
      success: function () {
        console.log(`[MiniGame Subpackage] 分包 ${name} 加载完毕 ✅`);
        resolve();
      },
      fail: function (err) {
        console.warn(`[MiniGame Subpackage] 分包 ${name} 加载异常 (将走降级容错):`, err);
        resolve();
      }
    });
  });
}

async function bootstrap() {
  console.log('[MiniGame] 开始启动 Perfect Landing Plane Pilot...');

  // 1. 文件系统探测（诊断环境目录结构）
  if (typeof tt !== 'undefined' && tt.getFileSystemManager) {
    const fs = tt.getFileSystemManager();
    try { console.log('[FS Probe] root files:', fs.readdirSync('.')); } catch (e) { console.log('[FS Probe] root err:', e.message); }
    try { console.log('[FS Probe] wasm dir files:', fs.readdirSync('wasm')); } catch (e) { console.log('[FS Probe] wasm err:', e.message); }
    try { console.log('[FS Probe] data dir files:', fs.readdirSync('data')); } catch (e) { console.log('[FS Probe] data err:', e.message); }
    try { console.log('[FS Probe] Build dir files:', fs.readdirSync('Build')); } catch (e) { console.log('[FS Probe] Build err:', e.message); }
  }

  // 2. 并行预载 wasm 与 data 分包
  await Promise.all([
    loadSubpackage('wasm'),
    loadSubpackage('data')
  ]);

  // 3. 预载并挂载 unityFramework 运行时框架
  try {
    let fw = root.unityFramework;
    if (!fw) {
      try {
        fw = require('./Build/0b14ddffb6d6867f4577189187985cab.framework.js');
      } catch (e1) {
        try { fw = require('./Build/0b14ddffb6d6867f4577189187985cab.framework.js.unityweb'); } catch (e2) {}
      }
    }
    if (fw) {
      root.unityFramework = fw;
      if (typeof window !== 'undefined') window.unityFramework = fw;
      console.log('[MiniGame] unityFramework 预装载成功 ✅');
    }
  } catch (err) {
    console.warn('[MiniGame] unityFramework 预装载警告:', err);
  }

  // 4. 主动预载 wasm 与 data 二进制进入内存，根除运行时竞争
  if (typeof root.__loadLocalBuffer === 'function') {
    console.log('[MiniGame] 正在预载 wasm 与 data 二进制入内存...');
    try {
      root.__wasmBuffer = await root.__loadLocalBuffer([
        'wasm/78675d3236180fa3ceddab8a23a2032e.wasm',
        './wasm/78675d3236180fa3ceddab8a23a2032e.wasm',
        '78675d3236180fa3ceddab8a23a2032e.wasm',
        'wasm/78675d3236180fa3ceddab8a23a2032e.wasm.unityweb',
        './wasm/78675d3236180fa3ceddab8a23a2032e.wasm.unityweb'
      ]);
      console.log('[MiniGame] wasm 核心二进制预载成功 ✅ (' + (root.__wasmBuffer.byteLength / 1024 / 1024).toFixed(2) + ' MB)');
    } catch (e) {
      console.warn('[MiniGame] wasm 二进制预载提示 (将由运行时 fetch 兜底拦截):', e.message);
    }

    try {
      root.__dataBuffer = await root.__loadLocalBuffer([
        'data/a22d7abc1ee3cd7b71a65e48bb3d9b2e.bin',
        './data/a22d7abc1ee3cd7b71a65e48bb3d9b2e.bin',
        'a22d7abc1ee3cd7b71a65e48bb3d9b2e.bin',
        'data/a22d7abc1ee3cd7b71a65e48bb3d9b2e.data.unityweb',
        './data/a22d7abc1ee3cd7b71a65e48bb3d9b2e.data.unityweb',
        'data/a22d7abc1ee3cd7b71a65e48bb3d9b2e.data'
      ]);
      console.log('[MiniGame] data 核心二进制预载成功 ✅ (' + (root.__dataBuffer.byteLength / 1024 / 1024).toFixed(2) + ' MB)');
    } catch (e) {
      console.warn('[MiniGame] data 二进制预载提示 (将由运行时 fetch 兜底拦截):', e.message);
    }
  }

  // 5. 加载 Unity 官方 Loader
  const loaderExport = require('./Build/813700ccfaf64a0a3c57e3aa3166490b.loader.js');
  const createUnityInstance = (typeof loaderExport === 'function' ? loaderExport : null) || root.createUnityInstance;

  const canvas = root.__mainCanvas || (typeof tt !== 'undefined' ? tt.createCanvas() : null);

  if (typeof createUnityInstance !== 'function') {
    console.error('[MiniGame ERROR] 未在全局或模块导出中找到 createUnityInstance 构造器！');
    return;
  }

  console.log('[MiniGame] 正在实例化 Unity 3D WebGL 引擎...');

  const sysDpr = (typeof tt !== 'undefined' && tt.getSystemInfoSync ? (tt.getSystemInfoSync().pixelRatio || 1) : (root.devicePixelRatio || 1));
  const unityConfig = {
    dataUrl: "data/a22d7abc1ee3cd7b71a65e48bb3d9b2e.bin",
    frameworkUrl: "Build/0b14ddffb6d6867f4577189187985cab.framework.js",
    codeUrl: "wasm/78675d3236180fa3ceddab8a23a2032e.wasm",
    streamingAssetsUrl: "StreamingAssets",
    companyName: "Go Games",
    productName: "Perfect Landing Plane Pilot",
    productVersion: "2.2",
    devicePixelRatio: sysDpr,
    matchWebGLToCanvasSize: true,
    cacheControl: function () { return "no-store"; }
  };

  // 注入预载的 wasm, data, framework 二进制与全局映射
  if (root.__wasmBuffer) {
    unityConfig.wasmBinary = root.__wasmBuffer;
    if (typeof window !== 'undefined') window.__wasmBuffer = root.__wasmBuffer;
  }
  if (root.__dataBuffer) {
    unityConfig.dataBinary = root.__dataBuffer;
    if (typeof window !== 'undefined') window.__dataBuffer = root.__dataBuffer;
  }
  if (root.__frameworkBuffer) {
    unityConfig.frameworkBinary = root.__frameworkBuffer;
    if (typeof window !== 'undefined') window.__frameworkBuffer = root.__frameworkBuffer;
  }

  createUnityInstance(canvas, unityConfig, function (progress) {
    const pct = Math.round(progress * 100);
    if (pct % 20 === 0) {
      console.log(`[Unity Progress] 进度: ${pct}%`);
    }
  }).then(function (instance) {
    root.unityGame = instance;
    console.log('[MiniGame] ✅ Unity 3D 游戏实例初始化成功！');
    notifyReady();
    setTimeout(notifyReady, 500);
    setTimeout(notifyReady, 1200);
    setTimeout(notifyReady, 2500);
  }).catch(function (err) {
    console.error('[MiniGame] ❌ Unity 启动失败:', err);
  });
}

bootstrap();
