// 本地脱机运行 PokiSDK 模拟垫片
window.PokiSDK = {
    init: function(opts) { return Promise.resolve(opts || {}); },
    commercialBreak: function() { return Promise.resolve(); },
    rewardedBreak: function() { return Promise.resolve(true); },
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
