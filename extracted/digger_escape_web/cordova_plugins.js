cordova.define('cordova/plugin_list', function(require, exports, module) {
  module.exports = [
    {
      "id": "cordova-plugin-inappbrowser.inappbrowser",
      "file": "plugins/cordova-plugin-inappbrowser/www/inappbrowser.js",
      "pluginId": "cordova-plugin-inappbrowser",
      "clobbers": [
        "cordova.InAppBrowser.open"
      ]
    },
    {
      "id": "cordova-plugin-firebase-analytics.FirebaseAnalytics",
      "file": "plugins/cordova-plugin-firebase-analytics/www/FirebaseAnalytics.js",
      "pluginId": "cordova-plugin-firebase-analytics",
      "merges": [
        "cordova.plugins.firebase.analytics"
      ]
    },
    {
      "id": "emi-cordova-applovin-max-appopenad.emiMaxAppOpenAd",
      "file": "plugins/emi-cordova-applovin-max-appopenad/www/emiMaxAppOpenAd.js",
      "pluginId": "emi-cordova-applovin-max-appopenad",
      "clobbers": [
        "cordova.plugins.emiMaxAppOpenAd"
      ]
    },
    {
      "id": "cordova-plugin-applovin-max.AppLovinMAX",
      "file": "plugins/cordova-plugin-applovin-max/www/applovinmax.js",
      "pluginId": "cordova-plugin-applovin-max",
      "clobbers": [
        "applovin"
      ]
    },
    {
      "id": "cordova-plugin-fullscreen.AndroidFullScreen",
      "file": "plugins/cordova-plugin-fullscreen/www/AndroidFullScreen.js",
      "pluginId": "cordova-plugin-fullscreen",
      "clobbers": [
        "AndroidFullScreen"
      ]
    },
    {
      "id": "cordova-plugin-android-notch.notch",
      "file": "plugins/cordova-plugin-android-notch/www/notch.js",
      "pluginId": "cordova-plugin-android-notch",
      "clobbers": [
        "window.AndroidNotch"
      ]
    }
  ];
  module.exports.metadata = {
    "cordova-plugin-inappbrowser": "6.0.0",
    "cordova-support-android-plugin": "2.0.4",
    "cordova-plugin-firebase-analytics": "7.0.5",
    "emi-cordova-applovin-max-appopenad": "0.0.5",
    "cordova-plugin-applovin-max": "1.1.5",
    "cordova-plugin-fullscreen": "1.3.0",
    "cordova-plugin-android-notch": "1.0.0"
  };
});