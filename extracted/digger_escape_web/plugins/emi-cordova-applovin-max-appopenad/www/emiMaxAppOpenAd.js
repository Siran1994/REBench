cordova.define("emi-cordova-applovin-max-appopenad.emiMaxAppOpenAd", function(require, exports, module) {
var exec = require('cordova/exec');
exports.maxSdkInitialize = function (arg0, success, error) {
    exec(success, error, 'emiMaxAppOpenAd', 'maxSdkInitialize', arg0);
};
exports.privacySettings = function (arg0, success, error) {
    exec(success, error, 'emiMaxAppOpenAd', 'privacySettings', arg0);
};
exports.showConsentFlow = function (arg0, success, error) {
    exec(success, error, 'emiMaxAppOpenAd', 'showConsentFlow', arg0);
};
exports.loadAppOpenAd = function (arg0, success, error) {
    exec(success, error, 'emiMaxAppOpenAd', 'loadAppOpenAd', arg0);
};
exports.showAppOpenAd = function (success, error) {
    exec(success, error, 'emiMaxAppOpenAd', 'showAppOpenAd', []);
};
exports.requestIDFA = function (success, error) {
    exec(success, error, 'emiMaxAppOpenAd', 'requestIDFA', []);
};
});
