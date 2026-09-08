/**
 * PokiSDK Bridge for ByteDance MiniGame (抖音小游戏)
 * Maps Poki ad hooks directly to ByteDance MiniGame ad APIs:
 *   - rewardedBreak -> tt.createRewardedVideoAd
 *   - commercialBreak -> tt.createInterstitialAd
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
    init: function () {
      initAds();
      return Promise.resolve();
    },
    commercialBreak: function () {
      console.log('[PokiBridge] commercialBreak requested -> Interstitial ad');
      return new Promise((resolve) => {
        if (typeof tt !== 'undefined' && tt.createInterstitialAd) {
          try {
            const ad = tt.createInterstitialAd({ adUnitId: 'YOUR_INTERSTITIAL_AD_UNIT_ID' });
            ad.load()
              .then(() => ad.show())
              .catch((err) => {
                console.warn('[PokiBridge] Interstitial ad load/show error:', err);
              })
              .finally(() => resolve());
            return;
          } catch (e) {
            console.warn('[PokiBridge] Interstitial ad exception:', e);
          }
        }
        resolve();
      });
    },
    rewardedBreak: function () {
      console.log('[PokiBridge] rewardedBreak requested -> Rewarded Video ad');
      return new Promise((resolve) => {
        if (typeof tt !== 'undefined' && tt.createRewardedVideoAd) {
          try {
            const ad = rewardedVideoAd || tt.createRewardedVideoAd({ adUnitId: 'YOUR_REWARDED_AD_UNIT_ID' });
            let handled = false;
            const onClose = (res) => {
              if (handled) return;
              handled = true;
              try { ad.offClose(onClose); } catch (e) {}
              const isEnded = (res && res.isEnded) !== false;
              console.log('[PokiBridge] Rewarded ad closed, completed:', isEnded);
              resolve(isEnded);
            };
            ad.onClose(onClose);
            ad.show().catch(() => {
              ad.load()
                .then(() => ad.show())
                .catch((err) => {
                  console.warn('[PokiBridge] Rewarded ad show failed, granting reward in dev/test mode:', err);
                  resolve(true); // Fallback reward in development / test mode
                });
            });
            return;
          } catch (e) {
            console.warn('[PokiBridge] Rewarded ad exception:', e);
          }
        }
        // In local mock or non-tt environment, grant reward
        resolve(true);
      });
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
    setDebug: function () {}
  };

  if (typeof window !== 'undefined') window.PokiSDK = PokiBridge;
  if (typeof globalThis !== 'undefined') globalThis.PokiSDK = PokiBridge;
  if (typeof self !== 'undefined') self.PokiSDK = PokiBridge;
  if (typeof module !== 'undefined') module.exports = PokiBridge;
})();
