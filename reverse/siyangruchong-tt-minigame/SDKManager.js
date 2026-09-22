"use strict";

/**
 * SDKManager - ByteDance MiniGame (抖音小游戏) 广告与平台能力统一管理器标准模板
 * 
 * 核心特性：
 * 1. 广告调用统一收拢：所有激励视频与插屏广告均走本管理器调度。
 * 2. 开发/测试兜底模式 (development-fallback-success)：
 *    在未配置真实广告位、网络失败或调试环境下，点击激励广告默认按观看完成发放奖励，
 *    插屏广告安全快速完成，保证游戏流程顺畅无阻塞。
 * 3. 完备的超时熔断与事件注销机制，彻底防止 Promise 悬挂。
 * 4. 抖音原生能力支持：短震动 (vibrateShort)、分享 (share)、添加桌面 (AddDeskTop)、侧边栏 (AddSideBar)。
 * 5. 测试与调试工具箱：
 *    - clearSaveOnStart: false（布尔变量，用于控制每次进入游戏时是否删除存档）
 *    - clearSaveData(key): 控制台随时可调用的清档方法
 */

var root = typeof globalThis !== "undefined" ? globalThis : (typeof window !== "undefined" ? window : self);

function callSoon(callback, value) {
  if (typeof callback !== "function") return;
  Promise.resolve().then(function () { callback(value); });
}

function showToast(title) {
  var api = root.tt;
  if (api && api.showToast) {
    api.showToast({
      title: title,
      icon: "none",
      duration: 2000,
      fail: function () {}
    });
  }
}

function finishPlatformAction(callback, succeeded, detail) {
  if (typeof callback !== "function") return;
  try {
    callback(succeeded === true, detail || null);
  } catch (error) {
    console.warn("[SDKManager] 平台能力回调执行失败", error);
  }
}

function adKindName(kind) {
  return kind === "rewarded" ? "激励视频广告" : (kind === "interstitial" ? "插屏广告" : String(kind || "未知广告"));
}

var SDKManager = {
  // 模式："development-fallback-success" (默认发奖模式) 或 "production" (正式上线模式)
  adMode: "development-fallback-success",
  rewardedAdUnitId: "",
  interstitialAdUnitId: "",
  quietDevelopmentFallback: false,
  
  // 默认游戏存档 Key（可通过 configure({ saveKey: 'your_key' }) 修改）
  saveKey: "minigame_savedata",

  // 控制每次进入游戏时是否删除存档（便于测试初始新手流程，设为 true 则每次启动清空存档，默认 false）
  clearSaveOnStart: false,

  rewarded: null,
  interstitial: null,

  /**
   * 清除游戏本地存档
   * @param {string} [customKey] 可选，指定特定 key 清除，默认使用 this.saveKey
   */
  clearSaveData: function (customKey) {
    var key = customKey || this.saveKey;
    console.warn("[SDKManager] clearSaveOnStart 生效，正在清除游戏本地存档 key: " + key + " ...");
    try {
      if (typeof tt !== "undefined" && tt.removeStorageSync) {
        tt.removeStorageSync(key);
      }
      if (typeof localStorage !== "undefined" && localStorage.removeItem) {
        localStorage.removeItem(key);
      }
      if (typeof window !== "undefined" && window.localStorage && window.localStorage.removeItem) {
        window.localStorage.removeItem(key);
      }
      console.info("[SDKManager] 游戏本地存档已成功清除！");
    } catch (e) {
      console.warn("[SDKManager] 清除本地存档异常：", e);
    }
  },

  /**
   * 配置管理器参数
   * @param {Object} options
   */
  configure: function (options) {
    options = options || {};
    this.adMode = String(options.adMode || this.adMode || "development-fallback-success");
    this.rewardedAdUnitId = String(options.rewardedAdUnitId || this.rewardedAdUnitId || "");
    this.interstitialAdUnitId = String(options.interstitialAdUnitId || this.interstitialAdUnitId || "");
    this.quietDevelopmentFallback = options.quietDevelopmentFallback === true;
    if (options.saveKey) {
      this.saveKey = String(options.saveKey);
    }
    if (typeof options.clearSaveOnStart === "boolean") {
      this.clearSaveOnStart = options.clearSaveOnStart;
    }
    if (this.clearSaveOnStart) {
      this.clearSaveData();
    }
    if (this.adMode === "development-fallback-success" && !this.quietDevelopmentFallback) {
      console.warn("[SDKManager] 当前处于开发降级模式：广告未配置或失败时将默认按观看成功并发放奖励");
    }
  },

  /**
   * 降级/默认发奖处理
   */
  developmentFallback: function (kind, reason) {
    if (this.adMode !== "development-fallback-success") return false;
    if (!this.quietDevelopmentFallback) {
      console.warn("[SDKManager]", adKindName(kind), "触发默认完成处理：", reason || "默认给奖励");
      if (kind === "rewarded") {
        showToast("获得广告奖励");
      }
    }
    return true;
  },

  /**
   * 统一广告入口
   * @param {string} kind "rewarded" | "interstitial"
   * @param {Object} [context] 上下文附加信息（如 signal 等）
   * @returns {Promise<boolean>}
   */
  showAd: function (kind, context) {
    kind = String(kind || "");
    var source = context && context.signal ? "（信号: " + context.signal + "）" : "";
    console.info("[SDKManager] 广告请求统一调度：" + adKindName(kind) + source);
    if (kind === "rewarded") return this.showRewarded(context);
    if (kind === "interstitial") return this.showInterstitial(context);
    return Promise.resolve(true);
  },

  /**
   * 展示插屏广告
   * @param {Object} [context]
   * @returns {Promise<boolean>}
   */
  showInterstitial: function (context) {
    var self = this;
    var api = root.tt;
    // 如果无广告位或宿主不支持插屏，走安全快速回调
    if (!self.interstitialAdUnitId || !api || typeof api.createInterstitialAd !== "function") {
      console.info("[SDKManager] 插屏广告接口或广告位未配置，继续执行游戏流程");
      return Promise.resolve(self.developmentFallback("interstitial", "missing ad unit or API"));
    }

    return new Promise(function (resolve) {
      var settled = false;
      // 1500ms 超时熔断，防止插屏阻塞游戏主流程
      var timer = setTimeout(function () {
        if (settled) return;
        settled = true;
        console.warn("[SDKManager] 插屏广告加载超时，熔断放行");
        resolve(self.developmentFallback("interstitial", "timeout"));
      }, 1500);

      function finish(val) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(val);
      }

      try {
        if (!self.interstitial) {
          self.interstitial = api.createInterstitialAd({ adUnitId: self.interstitialAdUnitId });
        }
        var ad = self.interstitial;
        var onError = function (err) {
          console.warn("[SDKManager] 插屏广告加载或展示失败", err);
          if (ad.offError) ad.offError(onError);
          finish(self.developmentFallback("interstitial", err && err.errMsg || "ad error"));
        };
        if (ad.onError) ad.onError(onError);

        ad.load().then(function () {
          return ad.show();
        }).then(function () {
          console.info("[SDKManager] 插屏广告展示成功");
          if (ad.offError) ad.offError(onError);
          finish(true);
        }).catch(onError);
      } catch (e) {
        console.warn("[SDKManager] 插屏广告调用异常", e);
        finish(self.developmentFallback("interstitial", e && e.message || "exception"));
      }
    });
  },

  /**
   * 展示激励视频广告
   * @param {Object} [context]
   * @returns {Promise<boolean>} 返回 true 表示应发放奖励
   */
  showRewarded: function (context) {
    var self = this;
    var api = root.tt;
    // 如果没有配置激励视频广告位或宿主不支持，直接默认发放奖励
    if (!self.rewardedAdUnitId || !api || typeof api.createRewardedVideoAd !== "function") {
      console.info("[SDKManager] 激励视频广告位未配置，点击默认发放奖励");
      var fallback = self.developmentFallback("rewarded", "missing ad unit or API");
      return Promise.resolve(fallback);
    }

    return new Promise(function (resolve) {
      var settled = false;
      // 5000ms 超时熔断，超时自动降级并发奖
      var timer = setTimeout(function () {
        if (settled) return;
        settled = true;
        console.warn("[SDKManager] 激励视频加载超时，默认发放奖励");
        resolve(self.developmentFallback("rewarded", "timeout"));
      }, 5000);

      function finish(val) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(val);
      }

      try {
        if (!self.rewarded) {
          self.rewarded = api.createRewardedVideoAd({ adUnitId: self.rewardedAdUnitId });
        }
        var ad = self.rewarded;

        var onClose = function (res) {
          var isEnded = !!(res && (res.isEnded || res.count > 0));
          console.info("[SDKManager] 激励视频关闭，是否完整播放:", isEnded);
          cleanup();
          if (isEnded) {
            finish(true);
          } else {
            finish(self.developmentFallback("rewarded", "user closed early"));
          }
        };

        var onError = function (err) {
          console.warn("[SDKManager] 激励视频展示错误:", err);
          cleanup();
          finish(self.developmentFallback("rewarded", err && err.errMsg || "load/show failed"));
        };

        function cleanup() {
          if (ad.offClose) ad.offClose(onClose);
          if (ad.offError) ad.offError(onError);
        }

        if (ad.onClose) ad.onClose(onClose);
        if (ad.onError) ad.onError(onError);

        ad.show().catch(function () {
          ad.load().then(function () {
            return ad.show();
          }).catch(onError);
        });
      } catch (err) {
        console.warn("[SDKManager] 激励视频调用异常", err);
        finish(self.developmentFallback("rewarded", err && err.message || "exception"));
      }
    });
  },

  /**
   * 短震动反馈
   */
  vibrateShort: function () {
    var api = root.tt;
    if (api && api.vibrateShort) api.vibrateShort({ fail: function () {} });
  },

  /**
   * 分享功能
   */
  share: function (options) {
    var api = root.tt;
    if (!api || !api.shareAppMessage) return Promise.resolve(false);
    return new Promise(function (resolve) {
      var payload = options || {};
      payload.success = function () { resolve(true); };
      payload.fail = function () { resolve(false); };
      api.shareAppMessage(payload);
    });
  },

  /**
   * 添加到桌面快捷方式（必须从用户点击链同步进入）
   */
  AddDeskTop: function (completeCallback) {
    var api = root.tt;
    if (!api || typeof api.addShortcut !== "function") {
      var unsupported = { errMsg: "tt.addShortcut is unavailable" };
      console.warn("[SDKManager] 当前宿主不支持添加到桌面", unsupported);
      showToast("当前版本暂不支持添加桌面");
      finishPlatformAction(completeCallback, false, unsupported);
      return false;
    }
    console.info("[SDKManager] 添加桌面请求已进入 SDKManager");
    try {
      api.addShortcut({
        success: function (result) {
          console.info("[SDKManager] 添加到桌面成功", result || "");
          showToast("已添加到桌面");
          finishPlatformAction(completeCallback, true, result);
        },
        fail: function (error) {
          console.warn("[SDKManager] 添加到桌面失败", error || "");
          showToast(error && Number(error.errNo) === 21305 ? "已取消添加桌面" : "添加桌面失败，请稍后重试");
          finishPlatformAction(completeCallback, false, error);
        }
      });
      return true;
    } catch (error) {
      console.warn("[SDKManager] 添加桌面接口调用异常", error);
      showToast("添加桌面失败，请稍后重试");
      finishPlatformAction(completeCallback, false, error);
      return false;
    }
  },

  /**
   * 跳转侧边栏（必须保持同步调用）
   */
  AddSideBar: function (completeCallback) {
    var api = root.tt;
    if (!api || typeof api.navigateToScene !== "function") {
      var unsupported = { errMsg: "tt.navigateToScene is unavailable" };
      console.warn("[SDKManager] 当前宿主不支持侧边栏入口", unsupported);
      showToast("当前版本暂不支持侧边栏");
      finishPlatformAction(completeCallback, false, unsupported);
      return false;
    }
    console.info("[SDKManager] 侧边栏请求已进入 SDKManager");
    try {
      api.navigateToScene({
        scene: "sidebar",
        success: function (result) {
          console.info("[SDKManager] 已跳转抖音首页侧边栏", result || "");
          finishPlatformAction(completeCallback, true, result);
        },
        fail: function (error) {
          console.warn("[SDKManager] 跳转侧边栏失败", error || "");
          showToast("侧边栏暂不可用，请稍后重试");
          finishPlatformAction(completeCallback, false, error);
        }
      });
      return true;
    } catch (error) {
      console.warn("[SDKManager] 侧边栏接口调用异常", error);
      showToast("侧边栏暂不可用，请稍后重试");
      finishPlatformAction(completeCallback, false, error);
      return false;
    }
  },

  callSoon: callSoon
};

// 挂载到全局
root.SDKManager = SDKManager;
if (typeof window !== "undefined") window.SDKManager = SDKManager;
if (typeof self !== "undefined") self.SDKManager = SDKManager;
if (typeof globalThis !== "undefined") globalThis.SDKManager = SDKManager;

if (SDKManager.clearSaveOnStart) {
  SDKManager.clearSaveData();
}

if (typeof module !== "undefined" && module.exports) module.exports = SDKManager;
