/**
 * PokiSDK Bridge for ByteDance MiniGame (抖音小游戏)
 * Maps Poki ad hooks and game lifecycle events directly to ByteDance MiniGame APIs:
 *   - rewardedBreak -> tt.createRewardedVideoAd
 *   - commercialBreak -> tt.createInterstitialAd
 *   - Full backward compatibility for Idle Ants Poki Web
 */
(function () {
  let rewardedVideoAd = null;
  let interstitialAd = null;

  function initAds() {
    if (typeof tt === 'undefined') return;
    if (tt.createRewardedVideoAd) {
      try {
        rewardedVideoAd = tt.createRewardedVideoAd({
          adUnitId: 'YOUR_REWARDED_AD_UNIT_ID'
        });
      } catch (e) {
        console.warn('[PokiBridge] Rewarded ad init warning:', e);
      }
    }
  }

  const PokiBridge = {
    init: function (opts) {
      initAds();
      return Promise.resolve(opts || {});
    },
    commercialBreak: function () {
      console.log('[PokiBridge] commercialBreak requested -> route to SDKManager');
      if (globalThis.SDKManager) {
        return globalThis.SDKManager.showInterstitial();
      }
      return Promise.resolve(true);
    },
    rewardedBreak: function () {
      console.log('[PokiBridge] rewardedBreak requested -> route to SDKManager');
      if (globalThis.SDKManager) {
        return globalThis.SDKManager.showRewarded();
      }
      return Promise.resolve(true);
    },
    gameLoadingStart: function () {
      console.log('[PokiBridge] gameLoadingStart');
    },
    gameLoadingFinished: function () {
      console.log('[PokiBridge] gameLoadingFinished');
    },
    gameLoadingProgress: function (p) {
      console.log('[PokiBridge] gameLoadingProgress', p);
    },
    gameplayStart: function () {
      console.log('[PokiBridge] gameplayStart');
    },
    gameplayStop: function () {
      console.log('[PokiBridge] gameplayStop');
    },
    happyTime: function () {},
    setDebug: function () {},
    movePill: function () {},
    isAdBlocked: function () { return false; },
    logError: function (err) { console.warn('[PokiBridge] logError:', err); }
  };

  if (typeof window !== 'undefined') window.PokiSDK = PokiBridge;
  if (typeof globalThis !== 'undefined') globalThis.PokiSDK = PokiBridge;
  if (typeof self !== 'undefined') self.PokiSDK = PokiBridge;
  if (typeof module !== 'undefined') module.exports = PokiBridge;
})();
