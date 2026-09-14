

const scriptsInEvents = {

	async EventSheet1_Event15_Act1(runtime, localVars)
	{
		PokiSDK.customEvent('game','segment',{segment:runtime.layout.name})
	},

	async Epokimanager_Event10_Act4(runtime, localVars)
	{
		PokiSDK.commercialBreak().then(
		    () => {
		        console.log("Commercial break finished, proceeding to game");
				runtime.globalVars.PokiIsPaused = false;
				runtime.globalVars.PokiHasSounds = true;
				
				runtime.globalVars.PokiIsPlayingMidrollAd=false;
				PokiSDK.gameplayStart();
				
		        // your code to continue to game
		    }
		);
	},

	async Epokimanager_Event12_Act4(runtime, localVars)
	{
		PokiSDK.gameplayStop();
		
		PokiSDK.rewardedBreak().then(
		    (success) => {
		        if(success) {
		          // video was displayed, give reward
				  runtime.globalVars.PokiIsPaused = false;
				  runtime.globalVars.PokiHasSounds = true;
				  runtime.globalVars.PokiIsPlayingRewardedAd=false;
				  PokiSDK.gameplayStart();	
				  runtime.globalVars.PokiGiveReward=true;
		
		        }
		        else {
				runtime.globalVars.PokiIsPaused = false;
				runtime.globalVars.PokiHasSounds = true;
				  runtime.globalVars.PokiIsPlayingRewardedAd=false;
				  PokiSDK.gameplayStart();
				  //runtime.globalVars.PokiGiveReward=true;
				  //runtime.globalVars.gm_GoBackGame=true;
				  
		          // video not displayed, should probably not give reward
				 
		        }
		    }
		);
	},

	async Epokimanager_Event14_Act1(runtime, localVars)
	{
		PokiSDK.gameplayStart();
		console.log("Gameplay has started");
	},

	async Epokimanager_Event16_Act1(runtime, localVars)
	{
		PokiSDK.gameplayStop();
		console.log("Gameplay has stopped");
	},

	async Epokimanager_Event18_Act1(runtime, localVars)
	{
		PokiSDK.gameLoadingFinished();
	},

	async Eadsmanager_Event39_Act4(runtime, localVars)
	{
		if (confirm("Rewarded Ad: Do you want to get the reward?")) {
		    console.log("Granting ad reward");
			runtime.callFunction('PokiUnmuteSound');
			// runtime.callFunction('PokiEnableControls');
			runtime.callFunction('PokiUnpauseGame');
			runtime.globalVars.PokiIsPlayingRewardedAd=false;
			runtime.callFunction('PokiGiveReward');
			console.log("Completed rewarded ad")
		} else {
		    console.log("Skipping ad reward");
			runtime.callFunction('PokiUnmuteSound');
			// runtime.callFunction('PokiEnableControls');
			runtime.callFunction('PokiUnpauseGame');
			runtime.globalVars.PokiIsPlayingRewardedAd=false;
			console.log("Skipped rewarded ad")
		}
	}
};

globalThis.C3.JavaScriptInEvents = scriptsInEvents;
