/**
 * Comprehensive Lightweight GameAnalytics stub for ByteDance MiniGame
 * Avoids loading 218 KB unused overseas analytics library in domestic minigames.
 */
(function () {
  function createStub(name = '') {
    const fn = function () {
      if (name === 'isRemoteConfigsReady') return false;
      if (name === 'getRemoteConfigsValueAsString') return arguments[1] || '';
      if (name === 'getRemoteConfigsContentAsString') return '';
      return undefined;
    };

    return new Proxy(fn, {
      get(target, prop) {
        if (prop === 'isRemoteConfigsReady') return () => false;
        if (prop === 'getRemoteConfigsValueAsString') return (k, def) => def || '';
        if (prop === 'getRemoteConfigsContentAsString') return () => '';
        if (typeof prop === 'symbol' || prop === 'valueOf' || prop === 'toString') {
          return target[prop] || (() => '[GameAnalytics Stub]');
        }
        if (prop in target) {
          return target[prop];
        }
        return createStub(String(prop));
      },
      apply(target, thisArg, args) {
        return target.apply(thisArg, args);
      }
    });
  }

  const GA = createStub('GameAnalytics');

  // Explicitly pre-populate known methods to ensure typeof obj.method === 'function' checks succeed
  const methodList = [
    'initialize', 'setEnabledInfoLog', 'setEnabledVerboseLog', 'setEnabledManualSessionHandling',
    'configureAvailableCustomDimensions01', 'configureAvailableCustomDimensions02', 'configureAvailableCustomDimensions03',
    'configureAvailableResourceCurrencies', 'configureAvailableResourceItemTypes', 'configureBuild',
    'configureAutoDetectAppVersion', 'configureSdkGameEngineVersion', 'addBusinessEvent', 'addResourceEvent',
    'addProgressionEvent', 'addDesignEvent', 'addErrorEvent', 'setEnabledEventSubmission', 'setCustomDimension01',
    'setCustomDimension02', 'setCustomDimension03', 'startSession', 'endSession'
  ];
  for (const m of methodList) {
    GA[m] = function () {};
  }
  GA.isRemoteConfigsReady = function () { return false; };
  GA.getRemoteConfigsValueAsString = function (k, def) { return def || ''; };
  GA.getRemoteConfigsContentAsString = function () { return ''; };

  const container = { GameAnalytics: GA };

  // Provide Cordova device stub as well to prevent globalThis["device"]["platform"] crash
  const sysInfo = (typeof tt !== 'undefined' && tt.getSystemInfoSync) ? (function () {
    try { return tt.getSystemInfoSync(); } catch (e) { return {}; }
  })() : {};
  const isIOS = (sysInfo.platform === 'ios');
  const deviceObj = {
    platform: isIOS ? 'iOS' : 'Android',
    model: sysInfo.model || '',
    version: sysInfo.version || '',
    uuid: 'minigame-uuid'
  };

  const globals = [
    typeof window !== 'undefined' ? window : null,
    typeof globalThis !== 'undefined' ? globalThis : null,
    typeof self !== 'undefined' ? self : null
  ];

  globals.forEach(g => {
    if (g) {
      g.GameAnalytics = GA;
      g.gameanalytics = container;
      if (!g.device) g.device = deviceObj;
    }
  });

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = GA;
  }
})();
