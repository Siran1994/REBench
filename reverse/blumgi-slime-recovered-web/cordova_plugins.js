cordova.define('cordova/plugin_list', function(require, exports, module) {
  module.exports = [
    {
      "id": "community-admob-plus-cordova.AdMob",
      "file": "plugins/community-admob-plus-cordova/www/admob.js",
      "pluginId": "community-admob-plus-cordova",
      "clobbers": [
        "admob"
      ]
    },
    {
      "id": "cordova-plugin-consent.Consent",
      "file": "plugins/cordova-plugin-consent/www/consent.js",
      "pluginId": "cordova-plugin-consent",
      "clobbers": [
        "consent"
      ]
    },
    {
      "id": "cordova-plugin-device.device",
      "file": "plugins/cordova-plugin-device/www/device.js",
      "pluginId": "cordova-plugin-device",
      "clobbers": [
        "device"
      ]
    },
    {
      "id": "cordova-plugin-inappbrowser.inappbrowser",
      "file": "plugins/cordova-plugin-inappbrowser/www/inappbrowser.js",
      "pluginId": "cordova-plugin-inappbrowser",
      "clobbers": [
        "cordova.InAppBrowser.open"
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
    "community-admob-plus-cordova": "1.32.8",
    "cordova-plugin-consent": "2.2.0",
    "cordova-plugin-device": "2.0.3",
    "construct-mobile-export2": "1.0.5",
    "cordova-plugin-inappbrowser": "6.0.0",
    "cordova-plugin-fullscreen": "1.3.0",
    "cordova-plugin-android-notch": "1.0.0"
  };
});