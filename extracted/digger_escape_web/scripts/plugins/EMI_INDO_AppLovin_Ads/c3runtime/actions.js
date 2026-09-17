"use strict";
{
    globalThis.C3.Plugins.EMI_INDO_AppLovin_Ads.Acts = {
        Bannerload(BANNER_AD_UNIT_ID, bannerPosition, background) {
            if (this._isCordovaReady) {
                this.BANNER_AD_UNIT_IDS = BANNER_AD_UNIT_ID;
                return this.loadBanner(BANNER_AD_UNIT_ID, bannerPosition, background);
            }
        },

        Bannershow() {
            if (this._isCordovaReady) {
                return this.bannerShow();
            }
        },

        Bannerhide() {
            if (this._isCordovaReady) {
                return this.bannerHide();
            }
        },

        Loadinterstitial(INTER_AD_UNIT_ID) {
            if (this._isCordovaReady) {
                this.INTER_AD_UNIT_IDS = INTER_AD_UNIT_ID;
                return this.loadInterstitial(INTER_AD_UNIT_ID);
            }
        },

        Showinterstitial() {
            if (this._isCordovaReady) {
                return this.showInterstitial();
            }
        },

        Loadrewardedad(REWARDED_AD_UNIT_ID) {
            if (this._isCordovaReady) {
                this.REWARDED_AD_UNIT_IDS = REWARDED_AD_UNIT_ID;
                return this.loadRewardedAd(REWARDED_AD_UNIT_ID);
            }
        },

        Showrewardedad() {
            if (this._isCordovaReady) {
                return this.showRewardedAd();
            }
        },

        Sethasuser(has) {
            if (this._isCordovaReady) {
                return this.setHasUser(has);
            }
        },

        Setisage(IsAge) {
            if (this._isCordovaReady) {
                return this.setIsAgeRestricted(IsAge);
            }
        },

        Setdonotsel(setDoNot) {
            if (this._isCordovaReady) {
                return this.setDoNotSel(setDoNot);
            }
        },

        Loadmrec(MREC_AD_UNIT_ID, bannerPosition, background) {
            if (this._isCordovaReady) {
                this.MREC_AD_UNIT_IDS = MREC_AD_UNIT_ID;
                return this.loadMrec(MREC_AD_UNIT_ID, bannerPosition, background);
            }
        },

        Mrecshow() {
            if (this._isCordovaReady) {
                return this.MrecShow();
            }
        },

        Mrechide() {
            if (this._isCordovaReady) {
                return this.MrecHide();
            }
        },

        async Setmuted(Muted) {
            if (this._isCordovaReady) {
                await this.setMuted(Muted);
            }
        },

        MaxSdkInitialize(isTest, gaId, enablePolicyFlow, setPrivacyPolicyUri, setTermsOfServiceUri) {
            //  if (typeof cordova === 'undefined') {
            //     return;
            //  }

            //  this.MaxSdk(isTest, gaId, enablePolicyFlow, setPrivacyPolicyUri, setTermsOfServiceUri);
        },

        LoadAppOpenAd(adUnitId) {
            if (this._isCordovaReady) {
                return this.loadAppOpenAd(adUnitId);
            }
        },

        ShowAppOpenAd() {
            if (this._isCordovaReady) {
                return this.showAppOpenAd();
            }
        },

        ShowConsentFlow(isTesting) {
            if (this._isCordovaReady) {
                const self = this;
                cordova.plugins.emiMaxAppOpenAd.showConsentFlow([this.ConsentFlow(isTesting)], (sussess) => {
                    console.log(sussess);
                }, (error) => {
                    self._errorResponse = ("show Consent Flow:", JSON.stringify(error));
                    self._trigger(self.EMI_INDO.OnError);
                });
            }
        }
    };
}