/**
 * PokiSDK 全功能免广告脱机模拟桩 (No-Ad Offline Bridge)
 * 包含毛玻璃 HUD Toast 提示与激励发奖回调
 */
(function() {
  'use strict';
  console.log('[PokiSDK NoAd-Bridge] 免广告脱机仿真 SDK 初始化就绪');

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
          'box-shadow: 0 10px 25px -5px rgba(56, 189, 248, 0.3)',
          'backdrop-filter: blur(12px)',
          '-webkit-backdrop-filter: blur(12px)',
          'z-index: 99999999',
          'opacity: 0',
          'pointer-events: none',
          'transition: all 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
          'display: flex',
          'align-items: center',
          'gap: 8px',
          'white-space: nowrap'
        ].join(';');
        document.body ? document.body.appendChild(toast) : document.documentElement.appendChild(toast);
      }

      toast.innerHTML = text || '✨ [免看广告] 奖励已直接发放！';
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(-50%) translateY(0)';

      if (window._noAdToastTimer) clearTimeout(window._noAdToastTimer);
      window._noAdToastTimer = setTimeout(function() {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(-20px)';
      }, 2400);
    } catch (e) {
      console.log('[NoAd-Bridge Toast] ' + text);
    }
  }

  // 2. File protocol warning
  if (window.location.protocol === 'file:') {
    const showFileNotice = function() {
      if (document.getElementById('noad-file-protocol-warning')) return;
      const banner = document.createElement('div');
      banner.id = 'noad-file-protocol-warning';
      banner.innerHTML = `
        <div style="position:fixed;inset:0;background:rgba(15,23,42,0.96);z-index:999999999;display:flex;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#f8fafc;padding:20px;-webkit-font-smoothing:antialiased;">
          <div style="max-width:480px;background:#1e293b;border:1px solid #38bdf8;border-radius:16px;padding:28px 24px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.7);text-align:center;">
            <div style="font-size:44px;margin-bottom:12px;">🎮 ⚠️</div>
            <h2 style="margin:0 0 10px;font-size:20px;font-weight:700;color:#38bdf8;">请勿直接双击 index.html 运行</h2>
            <p style="margin:0 0 16px;color:#94a3b8;font-size:13.5px;line-height:1.6;text-align:left;">
              现代浏览器出于安全规范，<b>严禁在本地 file:/// 协议下直接加载 WebAssembly 二进制与数据包</b>，直接双击运行会导致黑屏。
            </p>
            <div style="background:#0f172a;border-left:4px solid #38bdf8;padding:14px;border-radius:8px;text-align:left;font-size:13px;margin-bottom:16px;">
              <div style="color:#f8fafc;font-weight:600;margin-bottom:6px;">🚀 本地运行极简方案：</div>
              <div style="color:#94a3b8;line-height:1.5;">直接双击当前目录下的 <b style="color:#38bdf8;">「启动网页试玩.bat」</b>，即可全自动启动本地服务并打开浏览器畅玩！</div>
            </div>
            <div style="background:#0f172a;border-left:4px solid #10b981;padding:14px;border-radius:8px;text-align:left;font-size:13px;">
              <div style="color:#f8fafc;font-weight:600;margin-bottom:6px;">🌐 线上 CDN 部署：</div>
              <div style="color:#94a3b8;line-height:1.5;">将此文件夹整体上传至任意静态 CDN / Web 服务器即可直接免广告试玩。</div>
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

  // 3. PokiSDK API Mock Implementation
  window.PokiSDK = {
    init: function(opts) {
      console.log('[PokiSDK Mock] init()');
      return Promise.resolve(opts || {});
    },
    initWithVideoHB: function(opts) {
      return window.PokiSDK.init(opts);
    },
    gameLoadingStart: function() {
      console.log('[PokiSDK Mock] gameLoadingStart()');
    },
    gameLoadingProgress: function(data) {},
    gameLoadingFinished: function() {
      console.log('[PokiSDK Mock] gameLoadingFinished()');
    },
    gameplayStart: function() {
      console.log('[PokiSDK Mock] gameplayStart()');
    },
    gameplayStop: function() {
      console.log('[PokiSDK Mock] gameplayStop()');
    },
    commercialBreak: function(fn) {
      console.log('[PokiSDK Mock] commercialBreak() -> 自动跳过插屏广告');
      showNoAdToast('✨ [免看广告] 插屏已自动跳过！');
      if (typeof fn === 'function') setTimeout(fn, 50);
      return new Promise(function(resolve) { setTimeout(resolve, 50); });
    },
    rewardedBreak: function(fn) {
      console.log('[PokiSDK Mock] rewardedBreak() -> 自动发放激励视频奖励');
      showNoAdToast('🎁 [免看广告] 激励视频奖励已直接发放！');
      if (typeof fn === 'function') setTimeout(function() { fn(true); }, 50);
      return new Promise(function(resolve) { setTimeout(function() { resolve(true); }, 50); });
    },
    getURLParam: function(name) {
      try {
        var urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name) || '';
      } catch (e) { return ''; }
    },
    shareableURL: function() {
      return Promise.resolve(window.location.href);
    },
    openExternalLink: function(url) {
      window.open(url, '_blank');
    },
    displayAd: function() { return Promise.resolve(); },
    destroyAd: function() {},
    getLeaderboard: function() { return Promise.resolve([]); },
    showLeaderboard: function() {},
    setDebug: function() {},
    happyTime: function() {},
    isAdBlocked: function() { return false; },
    logError: function(err) { console.warn('[PokiSDK Mock] error:', err); },
    captureError: function(err) {},
    measure: function() {},
    movePill: function() {}
  };

  if (typeof window.poki_sdk_loaded === 'function') {
    window.poki_sdk_loaded();
  }
})();
