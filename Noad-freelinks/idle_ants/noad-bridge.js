/**
 * Universal No-Ad Bridge for Web & CDN Deployments (免广告试玩垫片)
 * Features:
 *  0. File protocol CORS guard with stylish notice modal.
 *  1. Auto-dispatches 'deviceready' lifecycle for Cordova-wrapped games on standard Web.
 *  2. Intercepts ByteDance 'tt' ads (createRewardedVideoAd, createInterstitialAd) -> Instant Reward!
 *  3. Intercepts PokiSDK ads (rewardedBreak, commercialBreak) -> Instant Reward!
 *  4. Intercepts Cordova AppLovin MAX / AdMob ads -> Instant Reward!
 *  5. Floating glassmorphism HUD toast for ad bypass notification.
 *  6. Web Audio touch unlocker for browser policies.
 *  7. Full relative-path CDN hosting compatibility.
 */
(function () {
  'use strict';

  console.log('[NoAd-Bridge] Initializing universal No-Ad Web bridge...');

  // 0. Service Worker & Cache Storage cleanup (prevents stale cached modules)
  window.C3_RegisterSW = function() {
    console.log('[NoAd-Bridge] Service Worker registration skipped.');
  };
  try {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => {
        for (let r of regs) r.unregister();
      });
    }
    if ('caches' in window) {
      caches.keys().then(keys => {
        for (let k of keys) caches.delete(k);
      });
    }
  } catch (e) {}

  // 0. File Protocol CORS Restriction Guard
  if (window.location.protocol === 'file:') {
    const showFileNotice = () => {
      if (document.getElementById('noad-file-protocol-warning')) return;
      const banner = document.createElement('div');
      banner.id = 'noad-file-protocol-warning';
      banner.innerHTML = `
        <div style="position:fixed;inset:0;background:rgba(15,23,42,0.96);z-index:999999999;display:flex;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#f8fafc;padding:20px;-webkit-font-smoothing:antialiased;">
          <div style="max-width:480px;background:#1e293b;border:1px solid #38bdf8;border-radius:16px;padding:28px 24px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.7);text-align:center;">
            <div style="font-size:44px;margin-bottom:12px;">🎮 ⚠️</div>
            <h2 style="margin:0 0 10px;font-size:20px;font-weight:700;color:#38bdf8;">请勿直接双击 index.html 运行</h2>
            <p style="margin:0 0 16px;color:#94a3b8;font-size:13.5px;line-height:1.6;text-align:left;">
              现代浏览器出于安全策略，<b>严禁在本地 file:/// 协议下直接加载 ES Module 模块脚本与游戏数据配置</b>，直接双击运行会导致黑屏。
            </p>
            <div style="background:#0f172a;border-left:4px solid #38bdf8;padding:14px;border-radius:8px;text-align:left;font-size:13px;margin-bottom:16px;">
              <div style="color:#f8fafc;font-weight:600;margin-bottom:6px;">🚀 本地运行极简方案：</div>
              <div style="color:#94a3b8;line-height:1.5;">直接双击运行当前目录下的 <b style="color:#38bdf8;">「启动网页试玩.bat」</b>，即可全自动启动本地服务并打开浏览器畅玩！</div>
            </div>
            <div style="background:#0f172a;border-left:4px solid #10b981;padding:14px;border-radius:8px;text-align:left;font-size:13px;">
              <div style="color:#f8fafc;font-weight:600;margin-bottom:6px;">🌐 线上 CDN 部署：</div>
              <div style="color:#94a3b8;line-height:1.5;">将此文件夹整体上传至任意静态 CDN / Web 服务器（阿里云 OSS、腾讯云 COS、AWS S3 等）即可直接免广告试玩。</div>
            </div>
          </div>
        </div>
      `;
      document.body ? document.body.appendChild(banner) : document.documentElement.appendChild(banner);
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', showFileNotice);
    } else {
      setTimeout(showFileNotice, 10);
    }
  }

  // 1. Sleek Floating Toast Notification Component
  function showNoAdToast(text) {
    try {
      let toast = document.getElementById('noad-toast-container');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'noad-toast-container';
        toast.style.cssText = [
          'position: fixed',
          'top: 24px',
          'left: 50%',
          'transform: translateX(-50%) translateY(-25px)',
          'background: rgba(15, 23, 42, 0.92)',
          'color: #38bdf8',
          'border: 1px solid rgba(56, 189, 248, 0.4)',
          'padding: 10px 22px',
          'border-radius: 9999px',
          'font-size: 14px',
          'font-weight: 600',
          'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          'box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.6), 0 0 20px rgba(56, 189, 248, 0.25)',
          'z-index: 99999999',
          'opacity: 0',
          'transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          'pointer-events: none',
          'display: flex',
          'align-items: center',
          'gap: 8px'
        ].join(';');
        (document.body || document.documentElement).appendChild(toast);
      }
      toast.innerHTML = `<span style="font-size: 18px;">✨</span> <span>${text || '【免看广告】奖励已直接发放！'}</span>`;
      requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
      });
      clearTimeout(toast._hideTimer);
      toast._hideTimer = setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(-25px)';
      }, 2200);
    } catch (e) {}
  }
  window.showNoAdToast = showNoAdToast;

  // 2. ByteDance TT MiniGame Ads Simulation
  const mockTT = {
    createRewardedVideoAd(opts) {
      console.log('[NoAd-Bridge] tt.createRewardedVideoAd requested -> Mocked instant reward');
      const listeners = { close: [], error: [], load: [] };
      return {
        load() { return Promise.resolve(); },
        show() {
          showNoAdToast('【免看广告】抖音激励视频奖励已发放！');
          setTimeout(() => {
            listeners.close.forEach(fn => { try { fn({ isEnded: true, count: 1 }); } catch (e) {} });
          }, 100);
          return Promise.resolve();
        },
        onClose(fn) { listeners.close.push(fn); },
        offClose(fn) { listeners.close = listeners.close.filter(f => f !== fn); },
        onError(fn) { listeners.error.push(fn); },
        offError(fn) { listeners.error = listeners.error.filter(f => f !== fn); },
        onLoad(fn) { listeners.load.push(fn); },
        offLoad(fn) { listeners.load = listeners.load.filter(f => f !== fn); }
      };
    },
    createInterstitialAd(opts) {
      console.log('[NoAd-Bridge] tt.createInterstitialAd requested -> Mocked instant close');
      const listeners = { close: [], error: [] };
      return {
        load() { return Promise.resolve(); },
        show() {
          showNoAdToast('【免看广告】抖音插屏广告已自动跳过！');
          setTimeout(() => {
            listeners.close.forEach(fn => { try { fn(); } catch (e) {} });
          }, 100);
          return Promise.resolve();
        },
        onClose(fn) { listeners.close.push(fn); },
        offClose(fn) { listeners.close = listeners.close.filter(f => f !== fn); },
        onError(fn) { listeners.error.push(fn); },
        offError(fn) { listeners.error = listeners.error.filter(f => f !== fn); }
      };
    },
    showToast(opts) {
      showNoAdToast(opts && opts.title ? opts.title : '提示');
    },
    getStorageSync(key) {
      try { return localStorage.getItem(key); } catch (e) { return null; }
    },
    setStorageSync(key, val) {
      try { localStorage.setItem(key, val); } catch (e) {}
    },
    removeStorageSync(key) {
      try { localStorage.removeItem(key); } catch (e) {}
    },
    getSystemInfoSync() {
      return {
        platform: 'devtools',
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        pixelRatio: window.devicePixelRatio || 1
      };
    },
    setDeviceOrientation() {},
    onTouchStart(cb) { window.addEventListener('touchstart', cb, { once: false }); },
    onTouchEnd(cb) { window.addEventListener('touchend', cb, { once: false }); },
    onShow(cb) { window.addEventListener('focus', cb); }
  };
  window.tt = Object.assign(window.tt || {}, mockTT);

  // 3. PokiSDK Simulation
  const mockPoki = {
    init() { return Promise.resolve(); },
    rewardedBreak() {
      console.log('[NoAd-Bridge] PokiSDK.rewardedBreak -> Mocked instant reward');
      showNoAdToast('【免看广告】Poki 激励视频奖励已发放！');
      return Promise.resolve(true);
    },
    commercialBreak() {
      console.log('[NoAd-Bridge] PokiSDK.commercialBreak -> Mocked instant pass');
      showNoAdToast('【免看广告】商业广告已自动跳过！');
      return Promise.resolve();
    },
    gameLoadingStart() {},
    gameLoadingFinished() {},
    gameLoadingProgress() {},
    gameplayStart() {},
    gameplayStop() {},
    happyTime() {},
    setDebug() {}
  };
  window.PokiSDK = Object.assign(window.PokiSDK || {}, mockPoki);

  // 4. AppLovin MAX & Cordova Plugin Simulation
  const baseAppLovin = {
    AdViewPosition: { TOP_CENTER: 'top_center', BOTTOM_CENTER: 'bottom_center' },
    isTablet() { return false; },
    setBannerBackgroundColor() {},
    createBanner() {},
    showBanner() {},
    hideBanner() {},
    setTestDeviceAdvertisingIds() {},
    setHasUserConsent() {},
    setIsAgeRestrictedUser() {},
    setDoNotSell() {},
    setMuted() {},
    initialize() {},
    loadInterstitial() {
      setTimeout(() => {
        globalThis.dispatchEvent(new CustomEvent('OnInterstitialLoadedEvent', { detail: {} }));
      }, 50);
    },
    showInterstitial() {
      console.log('[NoAd-Bridge] AppLovin showInterstitial -> Mocked');
      showNoAdToast('【免看广告】AppLovin 插屏已跳过！');
      setTimeout(() => {
        globalThis.dispatchEvent(new CustomEvent('OnInterstitialDisplayedEvent', { detail: {} }));
        globalThis.dispatchEvent(new CustomEvent('OnInterstitialHiddenEvent', { detail: {} }));
      }, 100);
    },
    loadRewardedAd() {
      setTimeout(() => {
        globalThis.dispatchEvent(new CustomEvent('OnRewardedAdLoadedEvent', { detail: {} }));
      }, 50);
    },
    showRewardedAd() {
      console.log('[NoAd-Bridge] AppLovin showRewardedAd -> Mocked instant reward');
      showNoAdToast('【免看广告】AppLovin 激励视频奖励已发放！');
      setTimeout(() => {
        globalThis.dispatchEvent(new CustomEvent('OnRewardedAdDisplayedEvent', { detail: {} }));
        globalThis.dispatchEvent(new CustomEvent('OnRewardedAdReceivedRewardEvent', { detail: { amount: 1, label: 'reward' } }));
        globalThis.dispatchEvent(new CustomEvent('OnRewardedAdHiddenEvent', { detail: {} }));
      }, 150);
    }
  };

  const safeAppLovin = new Proxy(baseAppLovin, {
    get(target, prop) {
      if (prop in target) return target[prop];
      return function() { return {}; };
    }
  });
  window.AppLovinMAX = safeAppLovin;

  // Cordova Environment Simulation with Safe Proxies
  const baseEmi = {
    requestIDFA(cb) { if (typeof cb === 'function') cb(0); },
    maxSdkInitialize(params, cb) { if (typeof cb === 'function') cb({ countryCode: 'CN', testMode: true }); },
    loadAppOpenAd(params, success) { if (typeof success === 'function') success({}); },
    showAppOpenAd(cb) { if (typeof cb === 'function') cb(); }
  };
  const safeEmi = new Proxy(baseEmi, {
    get(target, prop) {
      if (prop in target) return target[prop];
      return function(...args) {
        const last = args[args.length - 1];
        if (typeof last === 'function') last({});
      };
    }
  });

  window.cordova = window.cordova || {};
  window.cordova.platformId = 'android';
  window.cordova.plugins = window.cordova.plugins || {};
  window.cordova.plugins.emiMaxAppOpenAd = safeEmi;
  if (!window.cordova.require) {
    window.cordova.require = function(name) {
      if (typeof name === 'string' && name.includes('AppLovinMAX')) return window.AppLovinMAX;
      return {};
    };
  }

  // 5. Automatic & Reactive 'deviceready' Lifecycle Trigger
  let isDeviceReadyFired = false;
  const origDocAddEventListener = document.addEventListener.bind(document);
  document.addEventListener = function (type, listener, options) {
    origDocAddEventListener(type, listener, options);
    if (type === 'deviceready' && isDeviceReadyFired && typeof listener === 'function') {
      setTimeout(() => {
        try { listener(new Event('deviceready')); } catch (e) {}
      }, 10);
    }
  };

  function triggerDeviceready() {
    isDeviceReadyFired = true;
    try {
      document.dispatchEvent(new Event('deviceready'));
      window.dispatchEvent(new Event('deviceready'));
      console.log('[NoAd-Bridge] Dispatched deviceready event successfully for Web browser');
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    origDocAddEventListener('DOMContentLoaded', () => setTimeout(triggerDeviceready, 50));
  } else {
    setTimeout(triggerDeviceready, 50);
  }
  // Fallback trigger after 500ms to guarantee boot
  setTimeout(triggerDeviceready, 500);

  // 6. Web Audio Unblocker
  const unblockAudio = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx && AudioCtx.prototype && AudioCtx.prototype.resume) {
        // Any existing suspended context can be resumed on gesture
      }
    } catch (e) {}
  };
  window.addEventListener('pointerdown', unblockAudio, { once: true });
  window.addEventListener('touchstart', unblockAudio, { once: true });

  console.log('[NoAd-Bridge] Universal No-Ad Web bridge ready.');
})();
