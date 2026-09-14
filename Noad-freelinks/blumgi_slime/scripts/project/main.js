function addScript(src, id, onload) {
    if (document.getElementById(id)) return;
    let fjs = document.getElementsByTagName("script")[0];
    let js = document.createElement("script");
    js.id = id;
    fjs.parentNode.insertBefore(js, fjs);
    js.onload = onload;
    js.src = src;
}

// Prevent page jump, cf. https://sdk.poki.com/html5.html#prevent-page-jump
window.addEventListener('keydown', ev => { if (['ArrowDown', 'ArrowUp', ' '].includes(ev.key)) { ev.preventDefault(); } });
window.addEventListener('wheel', ev => ev.preventDefault(), { passive: false });

runOnStartup(async runtime =>
{
    if (runtime.platformInfo.exportType.includes("cordova") === false) {
		const advertPlugin = window.C3?.Plugins?.advert;
		if (advertPlugin?.Instance?.prototype) {
			advertPlugin.Instance.prototype._OnBeforeRuntimeStart = function() {
				console.log("Mobile Advert disabled");
			};
		}
    }

    // cf. https://sdk.poki.com/html5.html#1-initialize-the-sdk
    if (runtime.platformInfo.exportType === "html5") {
        runtime.globalVars.PokiIsSupported = true;
        console.log("Poki SDK supported, initializing...");
        addScript('https://game-cdn.poki.com/scripts/v2/poki-sdk.js', "poki-sdk", () => {
            PokiSDK.init().then(
                () => {
                    console.log("Poki SDK successfully initialized");
                    runtime.globalVars.PokiHasInitialised = true;
                }
            ).catch(
                () => {
                    console.log("Initialized, but the user likely has adblock");
                    runtime.globalVars.PokiHasInitialised = true;
                }
            );
            PokiSDK.setDebug(false);
        })
    }
});