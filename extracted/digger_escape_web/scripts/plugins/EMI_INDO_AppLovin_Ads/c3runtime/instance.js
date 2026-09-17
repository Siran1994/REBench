"use strict";
{

    globalThis.C3.Plugins.EMI_INDO_AppLovin_Ads.Instance = class AppLovin_AdsInstance extends globalThis.ISDKInstanceBase {

        constructor() {
            super();

            this.sdkKey = "";
            this.isTest = false;
            this.gaId = "";
            this.enablePolicyFlow = true;
            this.setPrivacyPolicyUri = "";
            this.setTermsOfServiceUri = "";

            this._setHasUser = false;
            this._setIsAgeRestricted = false;
            this._setDoNotSel = false;
            this._isDebugLog = false;

            const properties = this._getInitProperties();

            if (properties) {

                this.sdkKey = properties[0];
                this.isTest = properties[1];
                this.gaId = properties[2];
                this.enablePolicyFlow = properties[3];
                this.setPrivacyPolicyUri = properties[4];
                this.setTermsOfServiceUri = properties[5];

                this._setHasUser = properties[6];
                this._setIsAgeRestricted = properties[7];
                this._setDoNotSel = properties[8];

                this._isDebugLog = properties[12];

            }

            this.constStatus = "";
            this.responseEvent = "";


            this._isTrusted = "";
            this._adUnitId = "";
            this._creativeId = "";
            this._networkName = "";
            this._placement = "";
            this._revenue = "";


            this._statusIDFA = 0;
            this._countryCode = "";
            this._testMode = false;

            this._errorResponse = "";

            this._isCordovaReady = false;

            let AppLovinMAX;



            this.EMI_INDO = globalThis.C3.Plugins.EMI_INDO_AppLovin_Ads.Cnds;

            this.BANNER_AD_UNIT_IDS;
            this.INTER_AD_UNIT_IDS;
            this.REWARDED_AD_UNIT_IDS;
            this.MREC_AD_UNIT_IDS;


            const self = this;

            if (typeof globalThis.cordova !== 'undefined') {

                this._isCordovaReady = true;

                this.Max = cordova.plugins.emiMaxAppOpenAd;
                AppLovinMAX = cordova.require('cordova-plugin-applovin-max.AppLovinMAX');

                AppLovinMAX.setHasUserConsent(this._setHasUser);
                AppLovinMAX.setIsAgeRestrictedUser(this._setIsAgeRestricted);
                AppLovinMAX.setDoNotSell(this._setDoNotSel);


                if (globalThis.cordova.platformId === 'android') {

                    cordova.plugins.emiMaxAppOpenAd.maxSdkInitialize([
                        this.isTest,
                        this.gaId,
                        this.enablePolicyFlow,
                        this.setPrivacyPolicyUri,
                        this.setTermsOfServiceUri
                    ], (result) => {
                        if (this.isTest) {
                            AppLovinMAX.setTestDeviceAdvertisingIds(this.gaId);
                        }
                        AppLovinMAX.initialize(this.sdkKey);
                        this._countryCode = result.countryCode;
                        this._testMode = result.testMode;
                        this._isDebugLog && (this.responseEvent = "On sdk Initialization");
                        this._trigger(this.EMI_INDO.OnInitialization);
                    }, (error) => {
                        if (this.isTest) {
                            AppLovinMAX.setTestDeviceAdvertisingIds(this.gaId);
                        }
                        AppLovinMAX.initialize(this.sdkKey);
                        this._isDebugLog && (this.responseEvent = "SDK initialization failed:", error);
                        this._trigger(this.EMI_INDO.OnError);
                    });

                } else {

                    cordova.plugins.emiMaxAppOpenAd.requestIDFA((status) => {

                        this._statusIDFA = status;

                        cordova.plugins.emiMaxAppOpenAd.maxSdkInitialize([
                            this.sdkKey,
                            this.isTest,
                            this.gaId,
                            this.enablePolicyFlow,
                            this.setPrivacyPolicyUri,
                            this.setTermsOfServiceUri
                        ], (result) => {
                            if (this.isTest) {
                                AppLovinMAX.setTestDeviceAdvertisingIds(this.gaId);
                            }
                            AppLovinMAX.initialize(this.sdkKey);
                            this._countryCode = result.countryCode;
                            this._testMode = result.testMode;
                            this._isDebugLog && (this.responseEvent = "On sdk Initialization");
                            this._trigger(this.EMI_INDO.OnInitialization);
                        }, (error) => {

                            if (this.isTest) {
                                AppLovinMAX.setTestDeviceAdvertisingIds(this.gaId);
                            }
                            AppLovinMAX.initialize(this.sdkKey);

                            this._isDebugLog && (this.responseEvent = "SDK initialization failed:", error);
                            this._trigger(this.EMI_INDO.OnError);
                        });



                    }, (error) => {

                        this._isDebugLog && (this.responseEvent = "IDFA request failed:", error);
                        this._trigger(this.EMI_INDO.OnError);

                        cordova.plugins.emiMaxAppOpenAd.maxSdkInitialize([
                            this.sdkKey,
                            this.isTest,
                            this.gaId,
                            this.enablePolicyFlow,
                            this.setPrivacyPolicyUri,
                            this.setTermsOfServiceUri
                        ], (result) => {
                            if (this.isTest) {
                                AppLovinMAX.setTestDeviceAdvertisingIds(this.gaId);
                            }
                            AppLovinMAX.initialize(this.sdkKey);

                            this._countryCode = result.countryCode;
                            this._testMode = result.testMode;
                            this._isDebugLog && (this.responseEvent = "On sdk Initialization");
                            this._trigger(this.EMI_INDO.OnInitialization);
                        }, (error) => {

                            if (this.isTest) {
                                AppLovinMAX.setTestDeviceAdvertisingIds(this.gaId);
                            }
                            AppLovinMAX.initialize(this.sdkKey);

                            this._isDebugLog && (this._errorResponse = "SDK initialization failed:", error);
                            this._trigger(this.EMI_INDO.OnError);
                        });
                    });


                }

            }




            const setMuted = () => {
                if (this._isCordovaReady) {
                    AppLovinMAX.setMuted(this.setMuted(Muted));
                }
            };


            let loadBanner = function (BANNER_AD_UNIT_ID, bannerPosition, background) {

                if (this._isCordovaReady) {

                    try {

                        AppLovinMAX.isTablet()
                        AppLovinMAX.setBannerBackgroundColor(BANNER_AD_UNIT_ID, background);
                        AppLovinMAX.createBanner(BANNER_AD_UNIT_ID, bannerPosition === 0 ? AppLovinMAX.AdViewPosition.TOP_CENTER : AppLovinMAX.AdViewPosition.BOTTOM_CENTER);

                    }
                    catch (e) {

                        self._isDebugLog && (self._errorResponse = "load Banner error:", JSON.stringify(e));
                        self._trigger(self.EMI_INDO.OnError);

                    }
                }

            };


            const bannerShow = function () {
                if (this._isCordovaReady) {
                    AppLovinMAX.isTablet();
                    AppLovinMAX.showBanner(this.BANNER_AD_UNIT_IDS);
                }

            };


            const bannerHide = function () {
                if (this._isCordovaReady) {
                    AppLovinMAX.hideBanner(this.BANNER_AD_UNIT_IDS);
                }

            };


            const loadInterstitial = function (INTER_AD_UNIT_ID) {

                if (this._isCordovaReady) {

                    try {
                        AppLovinMAX.loadInterstitial(INTER_AD_UNIT_ID);
                    }
                    catch (e) {

                        self._isDebugLog && (self._errorResponse = "load Interstitial error :", JSON.stringify(e));
                        self._trigger(self.EMI_INDO.OnError);

                    }
                }

            };


            const showInterstitial = function () {
                if (this._isCordovaReady) {
                    AppLovinMAX.showInterstitial(this.INTER_AD_UNIT_IDS);
                }
            };



            const loadRewardedAd = function (REWARDED_AD_UNIT_ID) {

                if (this._isCordovaReady) {

                    try {
                        AppLovinMAX.loadRewardedAd(REWARDED_AD_UNIT_ID);
                    }
                    catch (e) {
                        self._isDebugLog && (self._errorResponse = "load Rewarded Ad error:", JSON.stringify(e));
                        self._trigger(self.EMI_INDO.OnError);
                    }
                }

            };


            const showRewardedAd = function () {
                if (this._isCordovaReady) {
                    AppLovinMAX.showRewardedAd(this.REWARDED_AD_UNIT_IDS);
                }
            };



            const loadMrec = function (MREC_AD_UNIT_ID, bannerPosition, background) {

                if (this._isCordovaReady) {
                    try {

                        AppLovinMAX.isTablet();
                        AppLovinMAX.setBannerBackgroundColor(MREC_AD_UNIT_ID, background);
                        AppLovinMAX.createBanner(MREC_AD_UNIT_ID, bannerPosition == 0 ? AppLovinMAX.AdViewPosition.TOP_CENTER : AppLovinMAX.AdViewPosition.BOTTOM_CENTER);

                    }
                    catch (e) {
                        self._isDebugLog && (self._errorResponse = "load Mrec error:", JSON.stringify(e));
                        self._trigger(self.EMI_INDO.OnError);
                    }
                }

            }


            const MrecShow = function () {
                if (this._isCordovaReady) {
                    AppLovinMAX.isTablet();
                    AppLovinMAX.showMRec(this.MREC_AD_UNIT_IDS);
                }
            };


            const MrecHide = function () {
                if (this._isCordovaReady) {
                    AppLovinMAX.hideMRec(this.MREC_AD_UNIT_IDS);
                }
            }


            const loadAppOpenAd = (adUnitId) => {

                if (this._isCordovaReady) {

                    this.Max.loadAppOpenAd([adUnitId],
                        (adInfo) => {
                            self.info(adInfo);
                        }, (error) => {
                            self._isDebugLog && (self._errorResponse = "load AppOpen Ad:", JSON.stringify(error));
                            self._trigger(self.EMI_INDO.OnError);
                        });
                }

            }


            let showAppOpenAd = () => {

                if (this._isCordovaReady) {
                    this.Max.showAppOpenAd(() => {
                    }, (error) => {
                        self._isDebugLog && (self._errorResponse = "show AppOpen Ad:", JSON.stringify(error));
                        self._trigger(self.EMI_INDO.OnError);
                    });
                }

            }


            if (this._isCordovaReady) {

                document.addEventListener('onAppOpenAdLoaded', (adInfo) => {
                    self.info(adInfo);
                    self._isDebugLog && (self.responseEvent = "on App Open Ad Loaded");
                    self._trigger(self.EMI_INDO.Onappopenadloaded);

                });

                document.addEventListener('onAppOpenAdDisplayed', () => {

                    self._isDebugLog && (self.responseEvent = "on App Open Ad Displayed");
                    self._trigger(self.EMI_INDO.Onappopenaddisplayed);

                });

                document.addEventListener('onAppOpenAdHidden', () => {

                    self._isDebugLog && (self.responseEvent = "on App Open Ad Hidden");
                    self._trigger(self.EMI_INDO.Onappopenadhidden);

                });

                document.addEventListener('onAppOpenAdClicked', () => {

                    self._isDebugLog && (self.responseEvent = "on App Open Ad Clicked");
                    self._trigger(self.EMI_INDO.Onappopenadclicked);

                });

                document.addEventListener('onAppOpenAdLoadFailed', () => {

                    self._isDebugLog && (self.responseEvent = "on App Open Ad Load Failed");
                    self._trigger(self.EMI_INDO.Onappopenadloadfailed);

                });

                document.addEventListener('onAppOpenAdDisplayFailed', () => {

                    self._isDebugLog && (self.responseEvent = "on App Open Ad Display Failed");
                    self._trigger(self.EMI_INDO.Onappopenaddisplayfailed);

                });

                document.addEventListener('onAppOpenAdRevenuePaid', () => {

                    self._isDebugLog && (self.responseEvent = "on App Open Ad Revenue Paid");
                    self._trigger(self.EMI_INDO.Onappopenadrevenuepaid);

                });

            }

            /////////////////////////////////////

            globalThis.addEventListener('OnMRecAdLoadedEvent', function (adInfo) {
                self.info(adInfo);
                self._isDebugLog && (self.responseEvent = 'On MRec Ad Loaded');
                self._trigger(self.EMI_INDO.Onmrecadloaded);
            });
            globalThis.addEventListener('OnMRecAdLoadFailedEvent', function (adInfo) {
                self.info(adInfo);
                self._isDebugLog && (self.responseEvent = 'On MRec Ad Load Failed');
                self._trigger(self.EMI_INDO.Onmrecadloadfailed);
            });
            globalThis.addEventListener('OnMRecAdClickedEvent', function (adInfo) {
                self.info(adInfo);
                self._isDebugLog && (self.responseEvent = 'On MRec Ad Clicked');
                self._trigger(self.EMI_INDO.Onmrecadclicked);
            });
            globalThis.addEventListener('OnMRecAdCollapsedEvent', function (adInfo) {
                self.info(adInfo);
                self._isDebugLog && (self.responseEvent = 'On MRec Ad Collapsed');
                self._trigger(self.EMI_INDO.Onmrecadcollapsed);
            });
            globalThis.addEventListener('OnMRecAdExpandedEvent', function (adInfo) {
                self.info(adInfo);
                self._isDebugLog && (self.responseEvent = 'On MRec Ad Expanded');
                self._trigger(self.EMI_INDO.Onmrecadexpanded);
            });


            globalThis.addEventListener('OnBannerAdLoadedEvent', function (adInfo) {

                self.info(adInfo);
                self._isDebugLog && (self.responseEvent = 'On Banner Ad Loaded Event');
                self._trigger(self.EMI_INDO.Onbanneradloaded);

            });



            globalThis.addEventListener('OnBannerAdLoadFailedEvent', function (adInfo) {
                self.info(adInfo);
                self._isDebugLog && (self.responseEvent = 'On Banner Ad Load Failed Event');
                self._trigger(self.EMI_INDO.Onbanneradloadfailed);
            });

            globalThis.addEventListener('OnBannerAdClickedEvent', function (adInfo) {
                self.info(adInfo);
                self._isDebugLog && (self.responseEvent = 'On Banner Ad Clicked Event');
                self._trigger(self.EMI_INDO.Onbanneradclickedevent);
            });

            globalThis.addEventListener('OnBannerAdCollapsedEvent', function (adInfo) {
                self.info(adInfo);
                self._isDebugLog && (self.responseEvent = 'On Banner Ad Collapsed Event');
                self._trigger(self.EMI_INDO.Onbanneradcollapsedevent);
            });

            globalThis.addEventListener('OnBannerAdExpandedEvent', function (adInfo) {
                self.info(adInfo);
                self._isDebugLog && (self.responseEvent = 'On Banner Ad Expanded Event');
                self._trigger(self.EMI_INDO.Onbanneradexpandedevent);
            });





            globalThis.addEventListener('OnInterstitialLoadedEvent', function (adInfo) {

                self.info(adInfo);
                self._isDebugLog && (self.responseEvent = 'On Interstitial Loaded Event');
                self._trigger(self.EMI_INDO.Oninterstitialloaded);
            });

            globalThis.addEventListener('OnInterstitialLoadFailedEvent', function (adInfo) {
                self.info(adInfo);
                self._isDebugLog && (self.responseEvent = 'On Interstitial Load Failed Event');
                self._trigger(self.EMI_INDO.Oninterstitialloadfailed);
            });

            globalThis.addEventListener('OnInterstitialClickedEvent', function (adInfo) {
                self.info(adInfo);
                self._isDebugLog && (self.responseEvent = 'On Interstitial Clicked Event');
                self._trigger(self.EMI_INDO.Oninterstitialclicked);
            });

            globalThis.addEventListener('OnInterstitialDisplayedEvent', function (adInfo) {
                self.info(adInfo);
                self._isDebugLog && (self.responseEvent = 'On Interstitial Displayed Event');
                self._trigger(self.EMI_INDO.Oninterstitialdisplayed);
            });

            globalThis.addEventListener('OnInterstitialAdFailedToDisplayEvent', function (adInfo) {
                self.info(adInfo);
                self._isDebugLog && (self.responseEvent = 'On Interstitial Ad Failed To Display Event');
                self._trigger(self.EMI_INDO.Oninterstitialadfailedtodisplay);
            });

            globalThis.addEventListener('OnInterstitialHiddenEvent', function (adInfo) {
                self.info(adInfo);
                self._isDebugLog && (self.responseEvent = 'On Interstitial Hidden Event');
                self._trigger(self.EMI_INDO.Oninterstitialhidden);
            });


            globalThis.addEventListener('OnRewardedAdLoadedEvent', function (adInfo) {
                self.info(adInfo);
                self._isDebugLog && (self.responseEvent = 'On Rewarded Ad Loaded Event');
                self._trigger(self.EMI_INDO.Onrewardedadloaded);
            });

            globalThis.addEventListener('OnRewardedAdLoadFailedEvent', function (adInfo) {
                self.info(adInfo);
                self._isDebugLog && (self.responseEvent = 'On Rewarded Ad Load Failed Event');
                self._trigger(self.EMI_INDO.Onrewardedadloadfailed);
            });

            globalThis.addEventListener('OnRewardedAdClickedEvent', function (adInfo) {
                self.info(adInfo);
                self._isDebugLog && (self.responseEvent = 'On Rewarded Ad Clicked Event');
                self._trigger(self.EMI_INDO.Onrewardedadclicked);
            });

            globalThis.addEventListener('OnRewardedAdDisplayedEvent', function (adInfo) {
                self.info(adInfo);
                self._isDebugLog && (self.responseEvent = 'On Rewarded Ad Displayed Event');
                self._trigger(self.EMI_INDO.Onrewardedaddisplayed);
            });

            globalThis.addEventListener('OnRewardedAdAdFailedToDisplayEvent', function (adInfo) {
                self.info(adInfo);
                self._isDebugLog && (self.responseEvent = 'On Rewarded Ad Failed To Display Event');
                self._trigger(self.EMI_INDO.Onrewardedadadfailedtodisplay);
            });

            globalThis.addEventListener('OnRewardedAdHiddenEvent', function (adInfo) {
                self.info(adInfo);
                self._isDebugLog && (self.responseEvent = 'On Rewarded Ad Hidden Event');
                self._trigger(self.EMI_INDO.Onrewardedadhidden);
            });

            globalThis.addEventListener('OnRewardedAdReceivedRewardEvent', function (adInfo) {
                self.info(adInfo);
                self._isDebugLog && (self.responseEvent = 'On Rewarded Ad Received Reward Event');
                self._trigger(self.EMI_INDO.Onrewardedadreceivedreward);
            });




            this.loadAppOpenAd = loadAppOpenAd;
            this.showAppOpenAd = showAppOpenAd;


            this.loadBanner = loadBanner;
            this.bannerShow = bannerShow;
            this.bannerHide = bannerHide;

            this.loadInterstitial = loadInterstitial;
            this.showInterstitial = showInterstitial;

            this.loadRewardedAd = loadRewardedAd;
            this.showRewardedAd = showRewardedAd;

            this.loadMrec = loadMrec;
            this.MrecShow = MrecShow;
            this.MrecHide = MrecHide;

          //  this.setHasUser = setHasUser;
         //   this.setIsAgeRestricted = setIsAgeRestricted;
         //   this.setDoNotSel = setDoNotSel;

            this.setMuted = setMuted;




        }

        _release() {
            super._release();
        }

        _saveToJson() {
            return {
                // data to be saved for savegames
            };
        }

        _loadFromJson(o) {
            // load state for savegames
        }


        info(adInfo) {

            this._isTrusted = adInfo.isTrusted;
            this._adUnitId = adInfo.adUnitId;
            this._creativeId = adInfo.creativeId;
            this._networkName = adInfo.networkName;
            this._placement = adInfo.placement;
            this._revenue = adInfo.revenue;

        }



        setTestMoode(_index) {
            switch (_index) {
                case 0:
                    return true;
                case 1:
                    return false;

            }
        };


        SetPolicyFlow(_index) {
            switch (_index) {
                case 0:
                    return true;
                case 1:
                    return false;

            }
        };

        setMuted(_index) {
            switch (_index) {
                case 0:
                    return true;
                case 1:
                    return false;

            }
        };


/*
        setHas(_index) {
            switch (_index) {
                case 0:
                    return true;
                case 1:
                    return false;

            }
        };




        setDo(_index) {
            switch (_index) {
                case 0:
                    return true;
                case 1:
                    return false;

            }
        };

        setIsAge(_index) {
            switch (_index) {
                case 0:
                    return true;
                case 1:
                    return false;

            }
        };
*/


        bannerPos(_index) {
            switch (_index) {
                case 0:
                    return "TOP_CENTER";
                case 1:
                    return "BOTTOM_CENTER";

            }
        };


        ConsentFlow(_index) {
            switch (_index) {
                case 0:
                    return true;
                case 1:
                    return false;

            }
        };


    };
}