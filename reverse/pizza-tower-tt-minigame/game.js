/**
 * ByteDance MiniGame Bootstrap for Construct 2 - Pizza Tower
 * Features:
 *  - Global polyfills: MiniBlob, File, ImageData, Event, atob, btoa, visualViewport
 *  - Construct 2 Adapter Integration (tt-c2-adapter.js)
 *  - PokiSDK Bridge to ByteDance SDKManager (CommercialBreak & RewardedBreak)
 *  - Asynchronous Subpackage Preloader (images, media, data)
 *  - Font Loading & Alias Mapping (Lilita One)
 *  - Anti-Loop Landscape Orientation Lock
 *  - Zero-IO Data & Localization Preloading
 */

// 0. Global Error Catching
if (typeof tt !== 'undefined') {
  if (tt.onError) {
    tt.onError((err) => {
      console.error('[MiniGame ERROR captured via tt.onError]:', err);
    });
  }
  if (tt.onUnhandledRejection) {
    tt.onUnhandledRejection((res) => {
      console.error('[MiniGame UNHANDLED REJECTION]:', res);
    });
  }
}
if (typeof window !== 'undefined') {
  window.onerror = (msg, url, line, col, err) => {
    console.error('[MiniGame window.onerror]:', msg, 'at', url, line + ':' + col, err);
  };
}

// 1. Adapter initialization
require('./adapter/tt-c2-adapter.js');

const root = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : self);

// 2. Load SDKManager
let SDKManager = null;
try {
  SDKManager = require('./SDKManager.js');
  root.SDKManager = SDKManager;
  console.log('[MiniGame] SDKManager loaded successfully');
} catch (e) {
  console.warn('[MiniGame] Warning loading SDKManager:', e);
}

// 3. PokiSDK Simulation & ByteDance Ad Bridge
const PokiBridge = {
  _isReady: false,
  _isAdBlocker: 0,

  init: function(opts) {
    console.log('[PokiSDK Bridge] init()');
    this._isReady = true;
    return Promise.resolve(opts || {});
  },
  initWithVideoHB: function(opts) {
    return this.init(opts);
  },
  gameLoadingStart: function() {
    console.log('[PokiSDK Bridge] gameLoadingStart()');
  },
  gameLoadingProgress: function(data) {
    // Progress update
  },
  gameLoadingFinished: function() {
    console.log('[PokiSDK Bridge] gameLoadingFinished()');
  },
  gameplayStart: function() {
    console.log('[PokiSDK Bridge] gameplayStart()');
  },
  gameplayStop: function() {
    console.log('[PokiSDK Bridge] gameplayStop()');
  },
  commercialBreak: function(fn) {
    console.log('[PokiSDK Bridge] commercialBreak() -> 触发插屏广告');
    let doneCalled = false;
    const notifyDone = () => {
      if (doneCalled) return;
      doneCalled = true;
      if (typeof fn === 'function') {
        try { fn(); } catch (e) {}
      }
      const c2Func = (typeof root !== 'undefined' && root.c2_callFunction) ||
                     (typeof window !== 'undefined' && window.c2_callFunction) ||
                     (typeof globalThis !== 'undefined' && globalThis.c2_callFunction) ||
                     (typeof GameGlobal !== 'undefined' && GameGlobal.c2_callFunction);
      if (typeof c2Func === 'function') {
        try {
          console.log('[PokiSDK Bridge] Calling C2 On_Ad_Served');
          c2Func("On_Ad_Served");
        } catch (e) {
          console.warn('[PokiSDK Bridge] Error calling On_Ad_Served:', e);
        }
      }
    };

    // Safety timeout: Guarantee unblocking within 250ms if ad doesn't resolve
    const safetyTimer = setTimeout(notifyDone, 250);

    if (SDKManager && SDKManager.showInterstitial) {
      try {
        const p = SDKManager.showInterstitial();
        if (p && typeof p.then === 'function') {
          p.then(() => { clearTimeout(safetyTimer); notifyDone(); })
           .catch(() => { clearTimeout(safetyTimer); notifyDone(); });
          return p;
        }
      } catch (e) {
        console.warn('[PokiSDK Bridge] Error in showInterstitial:', e);
      }
    }
    clearTimeout(safetyTimer);
    notifyDone();
    return Promise.resolve();
  },
  rewardedBreak: function(fn) {
    console.log('[PokiSDK Bridge] rewardedBreak() -> 触发激励视频广告');
    return new Promise(function(resolve) {
      const notifyRewarded = (rewarded) => {
        if (typeof fn === 'function') {
          try { fn(rewarded); } catch (e) {}
        }
        const c2Func = (typeof root !== 'undefined' && root.c2_callFunction) ||
                       (typeof window !== 'undefined' && window.c2_callFunction) ||
                       (typeof globalThis !== 'undefined' && globalThis.c2_callFunction) ||
                       (typeof GameGlobal !== 'undefined' && GameGlobal.c2_callFunction);
        if (typeof c2Func === 'function') {
          try {
            if (rewarded) {
              console.log('[PokiSDK Bridge] Calling C2 On_RewardedAd_Served');
              c2Func("On_RewardedAd_Served");
            } else {
              c2Func("On_RewardedAd_Closed");
            }
          } catch (e) {
            console.warn('[PokiSDK Bridge] Error calling On_RewardedAd_Served:', e);
          }
        }
        resolve(rewarded);
      };

      if (SDKManager && SDKManager.showRewarded) {
        try {
          const p = SDKManager.showRewarded();
          if (p && typeof p.then === 'function') {
            p.then(res => notifyRewarded(!!res)).catch(() => notifyRewarded(true));
            return;
          }
        } catch (e) {
          console.warn('[PokiSDK Bridge] Error in showRewarded:', e);
        }
      }
      setTimeout(() => notifyRewarded(true), 50);
    });
  },
  happyTime: function(intensity) {
    console.log('[PokiSDK Bridge] happyTime', intensity);
    if (SDKManager && SDKManager.vibrateShort) {
      SDKManager.vibrateShort();
    }
  },
  setDebug: function() {},
  isAdBlocked: function() { return false; },
  logError: function(err) { console.warn('[PokiSDK Bridge] error:', err); },
  captureError: function(err) {},
  measure: function() {},
  movePill: function() {},
  getURLParam: function() { return ""; },
  shareableURL: function() { return Promise.resolve(""); },
  openExternalLink: function() {}
};

root.PokiSDK = PokiBridge;
if (root.window) root.window.PokiSDK = PokiBridge;

// 3.5 Global Callbacks invoked by C2 ExecJS
const GlobalC2Callbacks = {
  cr_getC2Runtime: function() {
    const canvas = (root.document && root.document.getElementById('c2canvas')) || root.canvas;
    const rt = (canvas && canvas.c2runtime) || root.c2runtime || (root.window && root.window.c2runtime) || (typeof globalThis !== 'undefined' && globalThis.c2runtime);
    if (rt && !rt.gl && rt.glwrap && rt.glwrap.gl) rt.gl = rt.glwrap.gl;
    return rt;
  },
  Update_LoadingProgress: function(progress) {},
  onGameReady: function() {
    console.log('[MiniGame] onGameReady received');
  },
  onGameStarted: function() {
    console.log('[MiniGame] onGameStarted received');
  },
  SaveProp: function(key, val) {
    try {
      if (typeof tt !== 'undefined' && tt.setStorageSync) {
        tt.setStorageSync('prop_' + key, val);
      }
    } catch (e) {}
  },
  onMatchStarted: function() {},
  onMatchEnded: function() {},
  HappyTime: function(intensity) {
    if (PokiBridge && PokiBridge.happyTime) PokiBridge.happyTime(intensity);
  },
  showAds: function() {
    console.log('[GlobalCallbacks] showAds() triggered from C2');
    if (PokiBridge) PokiBridge.commercialBreak();
  },
  Show_Ads: function() {
    console.log('[GlobalCallbacks] Show_Ads() triggered from C2');
    if (PokiBridge) PokiBridge.commercialBreak();
  },
  showAd: function() {
    console.log('[GlobalCallbacks] showAd() triggered from C2');
    if (PokiBridge) PokiBridge.commercialBreak();
  },
  showRewardedAd: function(fn) {
    if (PokiBridge) PokiBridge.rewardedBreak(fn);
  },
  WatchRewardedVideoAd: function(fn) {
    if (PokiBridge) PokiBridge.rewardedBreak(fn);
  },
  showPaidAd: function() {}
};

for (const [name, fn] of Object.entries(GlobalC2Callbacks)) {
  root[name] = fn;
  if (root.window) root.window[name] = fn;
  if (typeof globalThis !== 'undefined') globalThis[name] = fn;
  if (typeof GameGlobal !== 'undefined') GameGlobal[name] = fn;
}

// 4. Anti-Loop Landscape Orientation Lock
let _isSettingOrientation = false;
function ensureLandscapeOrientation() {
  if (typeof tt === 'undefined' || !tt.getSystemInfoSync) return;
  try {
    const sys = tt.getSystemInfoSync();
    if (sys.windowWidth && sys.windowHeight && sys.windowWidth > sys.windowHeight) {
      return; // Already landscape
    }
    if (_isSettingOrientation) return;
    _isSettingOrientation = true;
    if (tt.setDeviceOrientation) {
      tt.setDeviceOrientation({
        value: 'landscape',
        complete: function() {
          setTimeout(() => { _isSettingOrientation = false; }, 300);
        }
      });
    } else {
      _isSettingOrientation = false;
    }
  } catch (e) {
    _isSettingOrientation = false;
  }
}

if (typeof tt !== 'undefined' && tt.onDeviceOrientationChange) {
  tt.onDeviceOrientationChange((res) => {
    if (res && (res.value === 'portrait' || res.orientation === 'portrait')) {
      ensureLandscapeOrientation();
    }
  });
}
ensureLandscapeOrientation();

// 5. Subpackage Preloader
function loadSub(name) {
  return new Promise((resolve) => {
    if (typeof tt === 'undefined' || !tt.loadSubpackage) return resolve();
    let finished = false;
    const done = () => { if (!finished) { finished = true; resolve(); } };
    const timer = setTimeout(() => {
      console.warn(`[MiniGame] Subpackage ${name} load timeout fallback`);
      done();
    }, 4000);

    const task = tt.loadSubpackage({
      name: name,
      success: () => {
        clearTimeout(timer);
        console.log(`[MiniGame] Subpackage ${name} loaded successfully`);
        done();
      },
      fail: (err) => {
        clearTimeout(timer);
        console.warn(`[MiniGame] Subpackage ${name} load fail:`, err);
        done();
      }
    });
    if (task && task.onProgressUpdate) {
      task.onProgressUpdate((res) => {
        console.log(`[MiniGame] loading ${name}: ${res.progress}%`);
      });
    }
  });
}

// 6. Main Bootstrap Workflow
async function bootstrap() {
  console.log('[MiniGame] Preloading subpackages...');
  await Promise.all([
    loadSub('images'),
    loadSub('media'),
    loadSub('data')
  ]);

  // Read data.js into memory
  try {
    if (!root.__c2DataJson || !root.__c2DataJs) {
      if (typeof tt !== 'undefined' && tt.getFileSystemManager) {
        const fs = tt.getFileSystemManager();
        let content = '';
        try {
          content = fs.readFileSync('data/data.json', 'utf8');
        } catch (e0) {
          try {
            content = fs.readFileSync('data/data.js', 'utf8');
          } catch (e) {
            try {
              content = fs.readFileSync('data.json', 'utf8');
            } catch (e2) {
              content = fs.readFileSync('data.js', 'utf8');
            }
          }
        }
        function extractJson(str) {
          if (typeof str !== 'string') return str;
          const pIdx = str.indexOf('project');
          if (pIdx === -1) return str;
          const start = str.lastIndexOf('{', pIdx);
          if (start === -1) return str;
          let depth = 0, inStr = false, esc = false;
          for (let i = start; i < str.length; i++) {
            const c = str[i];
            if (esc) { esc = false; continue; }
            if (c === '\\') { esc = true; continue; }
            if (c === '"') { inStr = !inStr; continue; }
            if (!inStr) {
              if (c === '{') depth++;
              else if (c === '}') {
                depth--;
                if (depth === 0) return str.substring(start, i + 1);
              }
            }
          }
          return str;
        }
        content = extractJson(content);
        root.__c2DataJs = content;
        try {
          root.__c2DataJson = JSON.parse(content);
        } catch (e) {
          console.warn('[MiniGame] Warning parsing JSON in preload:', e);
        }
        console.log('[MiniGame] Preloaded data/data.js successfully');
      }
    }
  } catch (e) {
    console.warn('[MiniGame] Failed to preload data.js:', e);
  }

  // Read localisation.json into memory
  try {
    if (!root.__c2LocalisationJson) {
      if (typeof tt !== 'undefined' && tt.getFileSystemManager) {
        const fs = tt.getFileSystemManager();
        let content = '';
        try {
          content = fs.readFileSync('data/localisation.json', 'utf8');
        } catch (e) {
          content = fs.readFileSync('localisation.json', 'utf8');
        }
        root.__c2LocalisationJson = JSON.parse(content);
        console.log('[MiniGame] Preloaded localisation.json successfully');
      }
    }
  } catch (e) {
    console.warn('[MiniGame] Failed to preload localisation.json:', e);
  }

  // Load Chinese font & alias mapping
  try {
    if (typeof tt !== 'undefined' && tt.loadFontFace) {
      tt.loadFontFace({
        family: 'Lilita One',
        source: 'url("fonts/lilitaone_regular.ttf")',
        success: () => console.log('[MiniGame] Loaded Lilita One successfully'),
        fail: (err) => console.warn('[MiniGame] Failed to load Lilita One font:', err)
      });
    }
  } catch (e) {
    console.warn('[MiniGame] Error calling tt.loadFontFace:', e);
  }

  // Clear save if configured in SDKManager
  if (SDKManager && SDKManager.clearSaveOnStart) {
    SDKManager.clearSaveData();
  }

  console.log('[MiniGame] Loading C2 scripts...');
  const jq = require('./scripts/jquery-2.1.1.min.js');
  root.jQuery = root.$ = jq;
  if (root.window) root.window.jQuery = root.window.$ = jq;

  // Intercept jQuery offset & contains to prevent "parameter 1 is not of type 'Node'"
  const origContains = jq.contains;
  jq.contains = function(a, b) {
    if (!a || !b) return false;
    if (a === b) return true;
    try {
      if (a.contains) return a.contains(b);
    } catch(e) {}
    return false;
  };

  const origOffset = jq.fn.offset;
  jq.fn.offset = function(options) {
    if (options !== undefined) {
      return origOffset ? origOffset.apply(this, arguments) : this;
    }
    const elem = this[0];
    if (!elem || elem.id === 'c2canvas' || elem.tagName === 'CANVAS' || elem === root.canvas) {
      return { top: 0, left: 0 };
    }
    try {
      return origOffset.apply(this, arguments);
    } catch (e) {
      return { top: 0, left: 0 };
    }
  };

  // Ensure localforage is accessible globally
  if (root.localforage) {
    if (root.window) root.window.localforage = root.localforage;
    if (typeof globalThis !== 'undefined') globalThis.localforage = root.localforage;
  }

  const spine = require('./scripts/spine_webgl.js');
  root.spine = spine;
  if (root.window) root.window.spine = spine;

  require('./scripts/c2runtime.js');

  console.log('[MiniGame] Launching cr_createRuntime("c2canvas")...');
  const createRuntime = root.window.cr_createRuntime || root.cr_createRuntime;
  if (typeof createRuntime === 'function') {
    const rt = createRuntime("c2canvas");
    if (rt) {
      root.c2runtime = rt;
      if (root.window) root.window.c2runtime = rt;
      if (typeof globalThis !== 'undefined') globalThis.c2runtime = rt;
      const cvs = (root.document && root.document.getElementById('c2canvas')) || root.canvas;
      if (cvs && !cvs.c2runtime) cvs.c2runtime = rt;
    }
    console.log('[MiniGame] Construct 2 runtime initialized successfully!');

    let initialCallsSent = false;
    const sendInitialCalls = () => {
      if (initialCallsSent) return;
      const c2Func = (typeof root !== 'undefined' && root.c2_callFunction) || 
                     (typeof window !== 'undefined' && window.c2_callFunction) || 
                     (typeof globalThis !== 'undefined' && globalThis.c2_callFunction) ||
                     (typeof GameGlobal !== 'undefined' && GameGlobal.c2_callFunction);
      if (typeof c2Func === 'function') {
        try {
          c2Func("LocalStorage_Status", [1]);
          c2Func("Set_Language", ["zh"]);
          initialCallsSent = true;
          console.log('[MiniGame] Sent Set_Language(zh) and LocalStorage_Status(1) to C2 engine');
        } catch (err) {
          console.warn('[MiniGame] Error sending initial C2 function calls:', err);
        }
      }
    };

    // Attempt early send immediately and every 100ms until confirmed
    sendInitialCalls();
    const initInterval = setInterval(() => {
      if (initialCallsSent) {
        clearInterval(initInterval);
      } else {
        sendInitialCalls();
      }
    }, 100);

    let tickWatchCount = 0;
    let loaderStallCount = 0;
    const tickWatcher = setInterval(() => {
      tickWatchCount++;
      const canvas = (root.document && root.document.getElementById('c2canvas')) || root.canvas;
      const rtInstance = (canvas && canvas.c2runtime) || root.c2runtime || (root.window && root.window.c2runtime);
      if (rtInstance) {
        const layoutName = rtInstance.running_layout ? rtInstance.running_layout.name : 'none';
        console.log(`[MiniGame Monitor #${tickWatchCount}] isloading: ${rtInstance.isloading}, progress: ${Math.round((rtInstance.progress || 0) * 100)}%, layout: '${layoutName}', ticks: ${rtInstance.tickcount}, fps: ${Math.round(rtInstance.fps || 0)}, timescale: ${rtInstance.timescale}`);
        
        // Watchdog: If loaderlayout is stalled with timescale === 0 (or at 100% with no layout change)
        if (layoutName === 'loaderlayout') {
          if (rtInstance.timescale === 0 || (rtInstance.loadingprogress >= 1 && !rtInstance.isloading)) {
            loaderStallCount++;
            if (loaderStallCount >= 2) {
              console.log('[MiniGame Watchdog] Loader layout stalled (timescale=' + rtInstance.timescale + '), forcing On_Ad_Served');
              const c2Func = (typeof root !== 'undefined' && root.c2_callFunction) || 
                             (typeof window !== 'undefined' && window.c2_callFunction) || 
                             (typeof globalThis !== 'undefined' && globalThis.c2_callFunction) ||
                             (typeof GameGlobal !== 'undefined' && GameGlobal.c2_callFunction);
              if (typeof c2Func === 'function') {
                try {
                  c2Func("On_Ad_Served");
                } catch (e) {
                  console.warn('[MiniGame Watchdog] Error calling On_Ad_Served:', e);
                }
              }
              // Also ensure timescale is restored if C2 paused it
              if (rtInstance.timescale === 0) {
                rtInstance.timescale = 1;
              }
            }
          }
        }

        if (layoutName && layoutName !== 'loaderlayout' && layoutName !== 'none') {
          console.log(`[MiniGame] Game running! Layout: '${layoutName}', tick count: ${rtInstance.tickcount}, FPS: ${Math.round(rtInstance.fps || 60)}`);
          clearInterval(tickWatcher);
        }
      } else {
        console.log(`[MiniGame Monitor #${tickWatchCount}] c2runtime instance NOT YET ATTACHED to canvas`);
      }
      if (tickWatchCount >= 30) {
        clearInterval(tickWatcher);
      }
    }, 1000);
  } else {
    console.error('[MiniGame] cr_createRuntime not found on window or globalThis!');
  }
}

bootstrap();
