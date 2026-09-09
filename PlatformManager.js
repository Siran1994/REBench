"use strict";

var root = typeof globalThis !== "undefined" ? globalThis : self;

function callSoon(callback, value) {
  if (typeof callback !== "function") return;
  Promise.resolve().then(function () { callback(value); });
}

function translate(key, fallback) {
  var locale = root.MadDrivingLocale || {};
  return typeof locale[key] === "string" ? locale[key] : fallback;
}

function showToast(title) {
  var api = root.tt;
  if (api && api.showToast) api.showToast({ title: title, icon: "none", duration: 2000, fail: function () {} });
}

function finishPlatformAction(callback, succeeded, detail) {
  if (typeof callback !== "function") return;
  try { callback(succeeded === true, detail || null); }
  catch (error) { console.warn("[疯狂驾驶] 平台能力回调执行失败", error); }
}

function adKindName(kind) {
  return kind === "rewarded" ? "激励视频广告" : (kind === "interstitial" ? "插屏广告" : String(kind || "未知广告"));
}

var PlatformManager = {
  adMode: "production",
  rewardedAdUnitId: "",
  interstitialAdUnitId: "",
  quietDevelopmentFallback: false,
  rewarded: null,
  interstitial: null,

  configure: function (options) {
    options = options || {};
    this.adMode = String(options.adMode || "production");
    this.rewardedAdUnitId = String(options.rewardedAdUnitId || "");
    this.interstitialAdUnitId = String(options.interstitialAdUnitId || "");
    this.quietDevelopmentFallback = options.quietDevelopmentFallback === true;
    if (this.adMode === "development-fallback-success" && !this.quietDevelopmentFallback) {
      console.warn("[疯狂驾驶][开发广告模式] 广告缺失或失败时将默认按观看成功处理；正式发布前必须关闭");
    }
  },

  developmentFallback: function (kind, reason) {
    if (this.adMode !== "development-fallback-success") return false;
    if (!this.quietDevelopmentFallback) {
      console.warn("[疯狂驾驶][开发广告模式]", adKindName(kind), "不可用，默认按观看成功处理：", reason || "不可用");
      if (kind === "rewarded") showToast(translate("adSimulated", "Development mode: ad completion simulated"));
    }
    return true;
  },

  showAd: function (kind, context) {
    kind = String(kind || "");
    var source = context && context.source === "fancade-retry-skip" ? "（重试/跳过关卡）" : "";
    console.info("[疯狂驾驶] 广告请求已统一进入 PlatformManager：" + adKindName(kind) + source);
    if (kind === "rewarded") return this.showRewarded(context);
    if (kind === "interstitial") return this.showInterstitial(context);
    return Promise.reject(new Error("Unsupported ad kind: " + kind));
  },

  showInterstitial: function () {
    var self = this;
    if (!self.interstitialAdUnitId || !tt.createInterstitialAd) {
      console.warn("[疯狂驾驶] 插屏广告接口或广告位未配置，继续执行游戏流程");
      return Promise.resolve(self.developmentFallback("interstitial", "missing ad unit or API"));
    }
    if (!self.interstitial) self.interstitial = tt.createInterstitialAd({ adUnitId: self.interstitialAdUnitId });
    return self.interstitial.load().then(function () {
      return self.interstitial.show();
    }).then(function () { console.info("[疯狂驾驶] 插屏广告展示成功"); return true; }, function (error) {
      console.warn("[疯狂驾驶] 插屏广告展示失败", error);
      return self.developmentFallback("interstitial", error && error.errMsg || "load/show failed");
    });
  },

  showRewarded: function (context) {
    var self = this;
    if (!self.rewardedAdUnitId || !tt.createRewardedVideoAd) {
      console.warn("[疯狂驾驶] 激励视频广告接口或广告位未配置", context || "");
      var fallback = self.developmentFallback("rewarded", "missing ad unit or API");
      if (!fallback) showToast(translate("noAd", "No ad available, try again later"));
      return Promise.resolve(fallback);
    }
    if (!self.rewarded) self.rewarded = tt.createRewardedVideoAd({ adUnitId: self.rewardedAdUnitId });
    return new Promise(function (resolve) {
      var settled = false;
      function finish(value) {
        if (settled) return;
        settled = true;
        if (self.rewarded.offClose) self.rewarded.offClose(onClose);
        if (self.rewarded.offError) self.rewarded.offError(onError);
        resolve(value);
      }
      function onClose(result) {
        var completed = !!(result && (result.isEnded || result.count > 0));
        console.info("[疯狂驾驶] 激励视频广告已关闭：" + (completed ? "完整观看，发放奖励" : "未完整观看，不发放奖励"));
        finish(completed);
      }
      function onError(error) {
        console.warn("[疯狂驾驶] 激励视频广告加载或展示失败", error);
        finish(self.developmentFallback("rewarded", error && error.errMsg || "load/show failed"));
      }
      if (self.rewarded.onClose) self.rewarded.onClose(onClose);
      if (self.rewarded.onError) self.rewarded.onError(onError);
      self.rewarded.load().then(function () { return self.rewarded.show(); }).catch(onError);
    });
  },

  vibrateShort: function () {
    if (tt.vibrateShort) tt.vibrateShort({ fail: function () {} });
  },

  share: function (options) {
    if (!tt.shareAppMessage) return Promise.resolve(false);
    return new Promise(function (resolve) {
      var payload = options || {};
      payload.success = function () { resolve(true); };
      payload.fail = function () { resolve(false); };
      tt.shareAppMessage(payload);
    });
  },

  // 必须从 tt.onTouchEnd 的真实用户点击链同步进入本方法。
  AddDeskTop: function (completeCallback) {
    var api = root.tt;
    if (!api || typeof api.addShortcut !== "function") {
      var unsupported = { errMsg: "tt.addShortcut is unavailable" };
      console.warn("[疯狂驾驶] 当前宿主不支持添加到桌面", unsupported);
      showToast("当前版本暂不支持添加桌面");
      finishPlatformAction(completeCallback, false, unsupported);
      return false;
    }
    console.info("[疯狂驾驶] 添加桌面请求已进入 PlatformManager");
    try {
      api.addShortcut({
        success: function (result) {
          console.info("[疯狂驾驶] 添加到桌面成功", result || "");
          showToast("已添加到桌面");
          finishPlatformAction(completeCallback, true, result);
        },
        fail: function (error) {
          console.warn("[疯狂驾驶] 添加到桌面失败", error || "");
          showToast(error && Number(error.errNo) === 21305 ? "已取消添加桌面" : "添加桌面失败，请稍后重试");
          finishPlatformAction(completeCallback, false, error);
        }
      });
      return true;
    } catch (error) {
      console.warn("[疯狂驾驶] 添加桌面接口调用异常", error);
      showToast("添加桌面失败，请稍后重试");
      finishPlatformAction(completeCallback, false, error);
      return false;
    }
  },

  // 必须保持同步调用，不能在 Promise 或定时器后再跳转侧边栏。
  AddSideBar: function (completeCallback) {
    var api = root.tt;
    if (!api || typeof api.navigateToScene !== "function") {
      var unsupported = { errMsg: "tt.navigateToScene is unavailable" };
      console.warn("[疯狂驾驶] 当前宿主不支持侧边栏入口", unsupported);
      showToast("当前版本暂不支持侧边栏");
      finishPlatformAction(completeCallback, false, unsupported);
      return false;
    }
    console.info("[疯狂驾驶] 侧边栏请求已进入 PlatformManager");
    try {
      api.navigateToScene({
        scene: "sidebar",
        success: function (result) {
          console.info("[疯狂驾驶] 已跳转抖音首页侧边栏", result || "");
          finishPlatformAction(completeCallback, true, result);
        },
        fail: function (error) {
          console.warn("[疯狂驾驶] 跳转侧边栏失败", error || "");
          showToast("侧边栏暂不可用，请稍后重试");
          finishPlatformAction(completeCallback, false, error);
        }
      });
      return true;
    } catch (error) {
      console.warn("[疯狂驾驶] 侧边栏接口调用异常", error);
      showToast("侧边栏暂不可用，请稍后重试");
      finishPlatformAction(completeCallback, false, error);
      return false;
    }
  },

  callSoon: callSoon,
  translate: translate
};

root.MadDrivingPlatform = PlatformManager;

if (typeof module !== "undefined" && module.exports) module.exports = PlatformManager;
