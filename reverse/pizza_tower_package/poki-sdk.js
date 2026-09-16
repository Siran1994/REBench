/**
 * PokiSDK 本地脱机全功能仿真模拟桩 (Universal Mock)
 */
(function() {
    'use strict';
    console.log('[PokiSDK Mock] 本地脱机全功能仿真 SDK 已就绪');

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
            console.log('[PokiSDK Mock] commercialBreak() -> 自动跳过');
            if (typeof fn === 'function') setTimeout(fn, 50);
            return new Promise(function(resolve) { setTimeout(resolve, 50); });
        },
        rewardedBreak: function(fn) {
            console.log('[PokiSDK Mock] rewardedBreak() -> 自动发放奖励');
            if (typeof fn === 'function') setTimeout(function() { fn(true); }, 50);
            return new Promise(function(resolve) { setTimeout(function() { resolve(true); }, 50); });
        },
        getURLParam: function(name) {
            try {
                var urlParams = new URLSearchParams(window.location.search);
                return urlParams.get(name) || "";
            } catch(e) { return ""; }
        },
        shareableURL: function(obj) {
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
