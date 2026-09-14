// 本地脱机运行 PokiSDK 模拟垫片
window.PokiSDK = {
    init: function(opts) { return Promise.resolve(opts || {}); },
    commercialBreak: function() {
        if (typeof window.showNoAdToast === 'function') {
            window.showNoAdToast('【免看广告】商业广告已自动跳过！');
        }
        return Promise.resolve();
    },
    rewardedBreak: function() {
        if (typeof window.showNoAdToast === 'function') {
            window.showNoAdToast('【免看广告】Poki 激励视频奖励已发放！');
        }
        return Promise.resolve(true);
    },
    gameLoadingStart: function() {},
    gameLoadingFinished: function() {},
    gameLoadingProgress: function() {},
    gameplayStart: function() {},
    gameplayStop: function() {},
    happyTime: function() {},
    setDebug: function() {},
    movePill: function() {},
    isAdBlocked: function() { return false; },
    logError: function() {}
};
