/**
 * Idle Ants Project Scripts Bundle for ByteDance MiniGame
 * Bundled to eliminate ES6 import/export syntax in CommonJS runtime
 */

// 1. CoroutineYield
class CoroutineYield {
  constructor(){

  }
  process(){
  	return new Promise((resolve, reject)=>{
    	resolve()
    })
  }
}

class WaitForSeconds extends CoroutineYield{
  constructor(time){
    super()
    this.time = time
  }

  process(){
    return new Promise((resolve, reject)=>{
      setTimeout(()=>{
        resolve()
      }, this.time*1000)
    })
  }
}

// 2. FastBigInt
class FastBigInt {

  // Initialise a new instance of FastBigInt with a main number, an exponent and a remainder.
  // For instance, you can define 145003 using either new FastBigInt(145, 1, 3) or new FastBigInt(0, 0, 145003)
  // Usually you can just initialise using only the remainder, unless you need to initialise to a number bigger than Number.MAX_SAFE_INTEGER
	constructor(main = 0, exponent = 0, remainder = 0) {
		this.main = main;
		this.exponent = exponent;
		this.remainder = remainder;
		this.readjust();
	}

  // You don't need to call this method, it is usually called automatically
	readjust() {
		this._readjust_balance();
		this._readjust_exponent();
		this._readjust_clamp();
	}

	_readjust_clamp() {
		if (this.main < 0) {
			this.main = 0;
			this.remainder = 0;
			this.exponent = 0;
		}
		if (this.main >= 1000 && this.exponent === FastBigInt.maxExponent) {
			this.main = 999;
			this.remainder = Math.pow(10, 3 * this.exponent) - 1;
		}
	}

	_readjust_exponent() {
		while (this.remainder < 0 && this.exponent > 0) {
			this.decrementExponent();
		}
		while (this.main === 0 && this.exponent > 0) {
			this.decrementExponent();
		}
		while (this.main >= 1000 && this.exponent < FastBigInt.maxExponent) {
			this.incrementExponent();
		}

		if (this.exponent === 0) {
			this.main += this.remainder;
			this.remainder = 0;
		}

		while (this.remainder >= Math.pow(10, 3 * this.exponent) 
			   && this.exponent < FastBigInt.maxExponent) {
			this.incrementExponent();
		}
	}

	_readjust_balance() {
		if (this.remainder >= Math.pow(10, 3 * this.exponent)) {
			let remainder = this.remainder % Math.pow(10, this.exponent * 3);
			let remToAddToMain = (this.remainder - remainder) / Math.pow(10, this.exponent * 3);
			this.main += remToAddToMain;
			this.remainder = remainder;
		}

		if (this.remainder < 0) {
			let mainRem = this.main % 1000;
			this.main = (this.main - mainRem)/1000;
			mainRem = mainRem * Math.pow(10, this.exponent * 3);
			this.remainder += mainRem;
		}
	}

  // You usually don't need to call this, but basically it increments the exponent. So 100K becomes 0.1M
	incrementExponent() {
		if (this.exponent === FastBigInt.maxExponent)
			return;
		let main = this.main;
		let mainRem = this.main % 1000;
		this.main = (main - mainRem)/1000;
		mainRem = mainRem * Math.pow(10, this.exponent * 3);
		this.exponent++;
		this.remainder += mainRem;
	}

  // You usually don't need to call this, but basically it decrements the exponent. So 0.1M becomes 100K
	decrementExponent() {
		if (this.exponent === 0)
			return;
		this.main = this.main * 1000;
		this.exponent--;
		let remainder = this.remainder % Math.pow(10, this.exponent * 3);
		let remToAddToMain = (this.remainder - remainder) / Math.pow(10, this.exponent * 3);
		this.main += remToAddToMain;
		this.remainder = remainder;
	}

  // Addition. Can take a Number or another FastBigInt as an argument.
	add(other) {
		if (typeof other === "number") {
			this.remainder += other;
		} 
		else if (other instanceof FastBigInt) {
			while (other.exponent < this.exponent) {
				other.incrementExponent();
			}
			while (other.exponent > this.exponent) {
				other.decrementExponent();
			}
			this.remainder += other.remainder;
			this.main += other.main;
		}
		else {
			throw new Error("Cannot add anything that is not a number of a FastBigInt");
		}
		this.readjust();
	}

  // Subtraction. Can take a Number or another FastBigInt as an argument.
	subtract(other) {
		if (typeof other === "number") {
			this.remainder -= other;
		} 
		else if (other instanceof FastBigInt) {
			while (other.exponent < this.exponent) {
				other.incrementExponent();
			}
			while (other.exponent > this.exponent) {
				other.decrementExponent();
			}
			this.remainder -= other.remainder;
			this.main -= other.main;
		}
		else {
			throw new Error("Cannot subtract anything that is not a number of a FastBigInt");
		}
		this.readjust();
	}

  // Comparison. Compares the current value to either a Number or another FastBigInt. Returns 0 if equal, 1 if superior and -1 if inferior
	compare(other) {
		if (typeof other === "number") {
			return this.compare(new FastBigInt(0, 0, other));
		}
		if (other instanceof FastBigInt) {
			this.readjust();
			other.readjust();
			if (this.exponent > other.exponent) {
				return 1;
			}
			if (this.exponent < other.exponent) {
				return -1;
			}
			if (this.main > other.main) {
				return 1;
			}
			if (this.main < other.main) {
				return -1;
			}
			if (this.remainder > other.remainder) {
				return 1;
			}
			if (this.remainder < other.remainder) {
				return -1;
			}
			return 0;
		}
		else {
			throw new Error("Cannot subtract anything that is not a number of a FastBigInt");
		}
	}

  // Set the value. Can take a Number or another FastBigInt
	setValue(other) {
		if (typeof other === "number") {
			this.remainder = other;
			this.main = 0;
			this.exponent = 0;
		} 
		else if (other instanceof FastBigInt) {
			this.remainder = other.remainder;
			this.main = other.main;
			this.exponent = other.exponent;
		}
		else {
			throw new Error("Cannot set value to anything that is not a number of a FastBigInt");
		}
		this.readjust();
	}

  // Formats the remainder to a string with all the leading zeroes necessary for it to print properly
  // Aka (new FastBigInt(1, 2, 3)).formatedRemainder returns '000003'
	get formatedRemainder() {
		let res = this.remainder.toString().padStart(this.exponent * 3, '0');
		return res.slice(Math.max(0, res.length - this.exponent * 3), res.length);
	}

  // Stringifies the number to the shortened value. (new FastBigInt(1, 1, 234)).toString() returns 1.23K 
	toString() {
		let nb = this.main.toString();
		let rem = this.formatedRemainder;
		if (nb.length == 2 && rem.length > 0 && rem[0] != '0') nb += "," + rem.toString()[0]
		if (nb.length == 1 && rem.length > 0 && (rem[0] != '0' || rem[1] != '0')) nb += "," + rem.toString()[0] + rem.toString()[1]
		return `${nb}${FastBigInt.exponentShorthands[this.exponent]}`
	}

  // Stringifies the number to the full value. (new FastBigInt(1, 1, 234)).toString() returns 1234 
	fullNumber() {
		return `${this.main}${this.formatedRemainder}`
	}
	
  // Saves the state of the FastBigInt object to a JSON object
	saveToJson() {
		return {
			main: this.main,
			exponent: this.exponent,
			remainder: this.remainder
		}
	}
	
  // Loads the state of the FastBigInt object from a JSON object
	loadFromJson(o) {
		this.main = o.main;
		this.exponent = o.exponent;
		this.remainder = o.remainder;
	}
}

// The maximum exponent the FastBigInt class supports. You can extend this when needed
Object.defineProperty(FastBigInt, 'maxExponent', {
	value: 5,
	writable : false,
	enumerable : true,
	configurable : false
});

// The exponent shorthands the FastBigInt class supports. You can extend this when needed
Object.defineProperty(FastBigInt, 'exponentShorthands', {
	value: Object.freeze(['', 'K', 'M', 'B', 't', 'q']),
	writable : false,
	enumerable : true,
	configurable : false
});

// 3. Language
const language = {
	"zh": {
		newWorld: "[outline=rgba(255,255,255,1)]敬请期待更多世界[/outline]",
		tuto1: "升级你的蚂蚁！",
		tuto2: "点击加速蚂蚁！",
		tuto3: "解锁全新世界！",
		continue: "继续",
		headerTutorial: "[outline=rgba(238,193,14,1)]新手教程[/outline]",
		welcomeBack: "[outline=rgba(238,193,14,1)]欢迎回来[/outline]",
		welcomeBackText: "离线期间蚂蚁仍在辛勤工作！",
		collect2: "领取 x2",
		collect3: "领取 x3",
		victory: "[outline=rgba(238,193,14,1)]胜利[/outline]",
		freemoney: "获得免费金币！",
		nextWorld: "下一个世界",
		nextWorldOutline: "[linethickness=6][outline=#FFFFFF]下一个世界[/outline][/linethickness]",
		upgrade: "升级",
		speed: "速度",
		workers: "工人数量",
		strength: "搬运力量",
		buttonLevel(lv) { return `等级 ${lv}`},
		doubleProfit: "双倍收益",
		doubleSpeed: "双倍速度",
		disableAdblock: "[outline=rgba(200, 20, 4,1)][color=rgb(255, 70, 20)]关闭广告拦截[/color][/outline]",
		noAdAvailable: "[outline=rgba(200, 20, 4,1)][color=rgb(255, 70, 20)]暂无可用广告[/color][/outline]",
		passiveIncome(val) {return `[outline=rgba(255, 176, 91, 1)]${val}[lineThickness=0.05][b]/[/b][/lineThickness]秒[/outline]`},
		settings: "[outline=rgba(238,193,14,1)]设置[/outline]",
		audio: "音效",
		replayTutorial: "重播教程",
		language: "语言",
		back: "返回",
		freeMoneyBag: "免费",
		antSquad: "蚁群加成",
		specialAnts: "[outline=rgba(100, 106, 255,1)]特殊蚂蚁[/outline]",
		shop: "[outline=rgba(127,118,241,1)]商店",
		shopSubtitle: "[lineThickness=1.5][outline=rgba(100, 106, 255,1)]永久在所有世界生效[/outline]",
		shopHelp: "通关世界或观看广告解锁",
		flashName: "[outline=#000]极速蚁",
		flashDesc: "全宇宙最快\n的蚂蚁",
		flashUnlockAt: "世界 2\n免费解锁",
		roboName: "[outline=#000]机甲蚁",
		roboDesc: "强壮敏捷的\n机械蚂蚁",
		roboUnlockAt: "世界 3\n免费解锁",
		goldName: "[outline=#000]黄金蚁",
		goldDesc: "搬运的食物\n价值 10 倍",
		goldUnlockAt: "世界 4\n免费解锁",
		unlockNow: "立即\n解锁",
		unkownAnt: "[outline=#000]???",
		comingSoon: "敬请\n期待",
		antUnlocked: "[outline=rgba(100, 106, 255,1)]蚂蚁已解锁[/outline]"
	},
	"en": {
		newWorld: "[outline=rgba(255,255,255,1)]New worlds coming soon[/outline]",
		tuto1: "Upgrade your ants!",
		tuto2: "Tap to speed up your ants!",
		tuto3: "Unlock new worlds!",
		continue: "Continue",
		headerTutorial: "[outline=rgba(238,193,14,1)]TUTORIAL[/outline]",
		welcomeBack: "[outline=rgba(238,193,14,1)]WELCOME BACK[/outline]",
		welcomeBackText: "Your ants were working while you were away!",
		collect2: "Collect x2",
		collect3: "Collect x3",
		victory: "[outline=rgba(238,193,14,1)]VICTORY[/outline]",
		freemoney: "You get free money!",
		nextWorld: "Next world",
		nextWorldOutline: "[linethickness=6][outline=#FFFFFF]Next world[/outline][/linethickness]",
		upgrade: "UPGRADE",
		speed: "Speed",
		workers: "Workers",
		strength: "Strength",
		buttonLevel(lv) { return `lv.${lv}`},
		doubleProfit: "Double Profit",
		doubleSpeed: "Double Speed",
		disableAdblock: "[outline=rgba(200, 20, 4,1)][color=rgb(255, 70, 20)]Disable adblock[/color][/outline]",
		noAdAvailable: "[outline=rgba(200, 20, 4,1)][color=rgb(255, 70, 20)]No ad available[/color][/outline]",
		passiveIncome(val) {return `[outline=rgba(255, 176, 91, 1)]${val}[lineThickness=0.05][b]/[/b][/lineThickness]s[/outline]`},
		settings: "[outline=rgba(238,193,14,1)]SETTINGS[/outline]",
		audio: "Audio",
		replayTutorial: "Tutorial",
		language: "Language",
		back: "Back",
		freeMoneyBag: "Free",
		antSquad: "Squad Bonus",
		specialAnts: "[outline=rgba(100, 106, 255,1)]SPECIAL ANTS[/outline]",
		shop: "[outline=rgba(127,118,241,1)]Shop",
		shopSubtitle: "[lineThickness=1.5][outline=rgba(100, 106, 255,1)]Forever on all worlds[/outline]",
		shopHelp: "Unlock by completing worlds, or by watching ads",
		flashName: "[outline=#000]FlashAnt",
		flashDesc: "The fastest ant\nin the universe",
		flashUnlockAt: "Unlock at\nworld 2",
		roboName: "[outline=#000]MechAnt",
		roboDesc: "This robot ant is\nstrong and fast",
		roboUnlockAt: "Unlock at\nworld 3",
		goldName: "[outline=#000]GoldAnt",
		goldDesc: "The food it \nfetches is \nworth x10",
		goldUnlockAt: "Unlock at\nworld 4",
		unlockNow: "Unlock\nnow",
		unkownAnt: "[outline=#000]???",
		comingSoon: "Coming\nsoon",
		antUnlocked: "[outline=rgba(100, 106, 255,1)]ANT UNLOCKED[/outline]"
	},
	"fr": {
		newWorld: "[outline=rgba(255,255,255,1)]Des nouveaux mondes arrivent bientôt[/outline]",
		tuto1: "Améliore tes fourmis!",
		tuto2: "Appuie pour accélérer tes fourmis!",
		tuto3: "Débloque de nouveaux mondes!",
		continue: "Suivant",
		headerTutorial: "[outline=rgba(238,193,14,1)]TUTORIEL[/outline]",
		welcomeBack: "[outline=rgba(238,193,14,1)]BIENVENUE[/outline]",
		welcomeBackText: "Tes fourmis ont travaillé pendant que tu étais absent!",
		collect2: "Gagner x2",
		collect3: "Gagner x3",
		victory: "[outline=rgba(238,193,14,1)]VICTOIRE[/outline]",
		freemoney: "Tu as gagné de l'argent!",
		nextWorld: "Prochain monde",
		nextWorldOutline: "[linethickness=6][outline=#FFFFFF]Prochain monde[/outline][/linethickness]",
		upgrade: "AMÉLIORER",
		speed: "Vitesse",
		workers: "Fourmis",
		strength: "Force",
		buttonLevel(lv) { return `nv.${lv}`},
		doubleProfit: "Profit Doublé",
		doubleSpeed: "Vitesse Doublée",
		disableAdblock: "[outline=rgba(200, 20, 4,1)][color=rgb(255, 70, 20)]Désactive adblock[/color][/outline]",
		noAdAvailable: "[outline=rgba(200, 20, 4,1)][color=rgb(255, 70, 20)]Pas de pub disponnible[/color][/outline]",
		passiveIncome(val) {return `[outline=rgba(255, 176, 91, 1)]${val}[lineThickness=0.05][b]/[/b][/lineThickness]s[/outline]`},
		settings: "[outline=rgba(238,193,14,1)]PARAMÈTRES[/outline]",
		audio: "Audio",
		replayTutorial: "Tutoriel",
		language: "Langage",
		back: "Retour",
		freeMoneyBag: "Gratuit",
		antSquad: "Fourmis Bonus",
		specialAnts: "[outline=rgba(100, 106, 255,1)]FOURMIS SPÉCIALES[/outline]",
		shop: "[outline=rgba(127,118,241,1)]Boutique",
		shopSubtitle: "[lineThickness=1.5][outline=rgba(100, 106, 255,1)]Dans tous les mondes[/outline]",
		shopHelp: "[size=23]Obtiens les en finissant des mondes, ou en regardant des pubs",
		flashName: "[outline=#000]FourmiFlash",
		flashDesc: "La fourmi la plus\nrapide de l'univers",
		flashUnlockAt: "Gratuit au\nmonde 2",
		roboName: "[outline=#000]FourmiBot",
		roboDesc: "Cette fourmi\nrobot est\nforte et rapide",
		roboUnlockAt: "Gratuit au\nmonde 3",
		goldName: "[outline=#000]FourmiOr",
		goldDesc: "La nourriture\nqu'elle apporte\nvaut 10x plus",
		goldUnlockAt: "Gratuit au\nmonde 4",
		unlockNow: "Obtenir",
		unkownAnt: "[outline=#000]???",
		comingSoon: "Bientôt\ndispo.",
		antUnlocked: "[outline=rgba(100, 106, 255,1)]FOURMI DÉBLOQUÉE[/outline]"
	},
	"es": {
		newWorld: "[outline=rgba(255,255,255,1)]Pronto llegarán\nnuevos mundos[/outline]",
		tuto1: "¡Mejora tus hormigas!",
		tuto2: "¡Haz clic para acelerar tus hormigas!",
		tuto3: "¡Desbloquea nuevos mundos!",
		continue: "Siguiente",
		headerTutorial: "[outline=rgba(238,193,14,1)]TUTORIAL[/outline]",
		welcomeBack: "[outline=rgba(238,193,14,1)]BIENVENIDO[/outline]",
		welcomeBackText: "¡Tus hormigas siguen trabajando mientras no estabas!",
		collect2: "Obtener x2",
		collect3: "Obtener x3",
		victory: "[outline=rgba(238,193,14,1)]VICTORIA[/outline]",
		freemoney: "¡Gana dinero gratis!",
		nextWorld: "Próximo mundo",
		nextWorldOutline: "[linethickness=6][outline=#FFFFFF]Próximo mundo[/outline][/linethickness]",
		upgrade: "POTENCIAR",
		speed: "Velocidad",
		workers: "Hormigas",
		strength: "Fuerza",
		buttonLevel(lv) { return `nv.${lv}`},
		doubleProfit: "Doble Beneficio",
		doubleSpeed: "Doble Velocidad",
		disableAdblock: "[outline=rgba(200, 20, 4,1)][color=rgb(255, 70, 20)]Deshabilite su adblock[/color][/outline]",
		noAdAvailable: "[outline=rgba(200, 20, 4,1)][color=rgb(255, 70, 20)]No hay anuncios disponibles[/color][/outline]",
		passiveIncome(val) {return `[outline=rgba(255, 176, 91, 1)]${val}[lineThickness=0.05][b]/[/b][/lineThickness]s[/outline]`},
		settings: "[outline=rgba(238,193,14,1)]OPCIONES[/outline]",
		audio: "Audio",
		replayTutorial: "Tutorial",
		language: "Idioma",
		back: "Volver",
		freeMoneyBag: "Gratis",
		antSquad: "Hormigas Bonus",
		specialAnts: "[outline=rgba(100, 106, 255,1)]HORMIGAS ESPECIALES[/outline]",
		shop: "[outline=rgba(127,118,241,1)]Tienda",
		shopSubtitle: "[lineThickness=1.5][outline=rgba(100, 106, 255,1)]Para siempre en todos los mundos[/outline]",
		shopHelp: "Desbloquea completando mundos o viendo anuncios",
		flashName: "[outline=#000]Rápida",
		flashDesc: "La hormiga más\nrápida del universo",
		flashUnlockAt: "Gratis en el\nmundo 2",
		roboName: "[outline=#000]Mecanizante",
		roboDesc: "Esta hormiga\nrobot es\nfuerte y rápida",
		roboUnlockAt: "Gratis en el\nmundo 3",
		goldName: "[outline=#000]Dorada",
		goldDesc: "La comida que\nconsiga x10",
		goldUnlockAt: "Gratis en el\nmundo 4",
		unlockNow: "[size=20]Obtener[/size]\nahora",
		unkownAnt: "[outline=#000]???",
		comingSoon: "Próxima\nvez",
		antUnlocked: "[outline=rgba(100, 106, 255,1)]HORMIGA DESBLOQUEADA[/outline]"
	},
	"pt-br": {
		newWorld: "[outline=rgba(255,255,255,1)]Novos mundos\nchegando em breve[/outline]",
		tuto1: "Clique para melhorar o nível das suas formigas!",
		tuto2: "Clique para acelerar suas formigas!",
		tuto3: "Desbloqueie novos mundos!",
		continue: "Próximo",
		headerTutorial: "[outline=rgba(238,193,14,1)]TUTORIAL[/outline]",
		welcomeBack: "[outline=rgba(238,193,14,1)]BEM-VINDO[/outline]",
		welcomeBackText: "Suas formigas trabalharam enquanto você estava fora!",
		collect2: "Ganhe x2",
		collect3: "Ganhe x3",
		victory: "[outline=rgba(238,193,14,1)]VITÓRIA[/outline]",
		freemoney: "Ganhe dinheiro grátis!",
		nextWorld: "Próximo mundo",
		nextWorldOutline: "[linethickness=6][outline=#FFFFFF]Próximo mundo[/outline][/linethickness]",
		upgrade: "MELHORIA",
		speed: "Velocidade",
		workers: "Operárias",
		strength: "Força",
		buttonLevel(lv) { return `nv.${lv}`},
		doubleProfit: "Lucro Dobrado",
		doubleSpeed: "Velocidade Dobrada",
		disableAdblock: "[outline=rgba(200, 20, 4,1)][color=rgb(255, 70, 20)]Desative seu adblock[/color][/outline]",
		noAdAvailable: "[outline=rgba(200, 20, 4,1)][color=rgb(255, 70, 20)]Nenhum anúncio disponível[/color][/outline]",
		passiveIncome(val) {return `[outline=rgba(255, 176, 91, 1)]${val}[lineThickness=0.05][b]/[/b][/lineThickness]s[/outline]`},
		settings: "[outline=rgba(238,193,14,1)]OPÇÕES[/outline]",
		audio: "Áudio",
		replayTutorial: "Tutorial",
		language: "Idioma",
		back: "Voltar",
		freeMoneyBag: "Grátis",
		antSquad: "Formigas Bonus",
		specialAnts: "[outline=rgba(100, 106, 255,1)]FORMIGAS ESPECIAIS[/outline]",
		shop: "[outline=rgba(127,118,241,1)]Loja",
		shopSubtitle: "[lineThickness=1.5][outline=rgba(100, 106, 255,1)]Para sempre em todos os mundos[/outline]",
		shopHelp: "Desbloqueie completando mundos ou assistindo a anúncios",
		flashName: "[outline=#000]Rápida",
		flashDesc: "A formiga mais\nrápida do universo",
		flashUnlockAt: "Grátis no\nmundo 2",
		roboName: "[outline=#000]Mecâmiga",
		roboDesc: "Esta formiga robô\né forte e rápida",
		roboUnlockAt: "Grátis no\nmundo 3",
		goldName: "[outline=#000]Dourada",
		goldDesc: "A comida que ela\nbusca vale x10",
		goldUnlockAt: "Grátis no\nmundo 4",
		unlockNow: "[size=20]Obtenha[/size]\nagora",
		unkownAnt: "[outline=#000]???",
		comingSoon: "Em breve",
		antUnlocked: "[outline=rgba(100, 106, 255,1)]FORMIGA DESBLOQUEADA[/outline]"
	}
}

// 4. StaticData
class WorldStaticData {
	constructor({
		name,
		uid,
		icon,
		cost,
		maxNbWorkers,
		maxNbSpeed,
		maxNbStrength,
		nbLevelsToComplete,
		moneyPerFragment,
		bgLayer,
		color = -281492157629439,
		layerColor = -281492157629439,
		holeColor = -281492157629439,
		levels = [],
	}) {
		let properties = {
			name,
			uid,
			icon,
			cost,
			maxNbWorkers,
			maxNbSpeed,
			maxNbStrength,
			nbLevelsToComplete,
			moneyPerFragment,
			bgLayer,
			color,
			layerColor,
			holeColor,
			levels,
		}
		Object.keys(properties).forEach(key => {this[key] = properties[key]})
	}
}

class SpecialAntStaticData {
	constructor({
		skin,
		name,
		description,
		world,
		rewardedCount,
		icon,
		walkDurationFunction,
		eatDurationFunction,
		spawnDurationFunction,
		strengthFunction,
		scaleFunction,
		moneyFunction,
		rotateSpeedFunction,
		cooldown,
		cooldownReduceOnBoost,
	}) {
		let properties = {
			skin,
			name,
			description,
			world,
			rewardedCount,
			icon,
			walkDurationFunction,
			eatDurationFunction,
			spawnDurationFunction,
			strengthFunction,
			scaleFunction,
			moneyFunction,
			rotateSpeedFunction,
			cooldown,
			cooldownReduceOnBoost
		}
		Object.keys(properties).forEach(key => {this[key] = properties[key]})
	}
}

class LevelStaticData {
	constructor({
		item,
		fragments,
		level,
		hasFg,
		hasBg,
		offsetX,
		offsetY,
		hasSlideIn,
		slideOffsetX,
		slideOffsetY,
		slideDuration,
		isBossLevel
	}) {
		let properties = {
			item,
			fragments,
			level,
			hasFg,
			hasBg,
			offsetX,
			offsetY,
			hasSlideIn,
			slideOffsetX,
			slideOffsetY,
			slideDuration,
			isBossLevel
		}
		Object.keys(properties).forEach(key => {this[key] = properties[key]})
	}
}

class StaticData {
	constructor({
		worlds = [],
		globalValues = {},
		specialAnts = {}
	}) {
		this.worlds = worlds;
		this.globalValues = globalValues;
		this.specialAnts = specialAnts;
	}
}

let levels = {
	"Sheet": new LevelStaticData({
		item: "Sheet",
		fragments: 55,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"Cookie": new LevelStaticData({
		item: "Cookie",
		fragments: 110,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"Dollar": new LevelStaticData({
		item: "Dollar",
		fragments: 235, 
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"Donut": new LevelStaticData({
		item: "Donut",
		fragments: 586,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"Watermelon": new LevelStaticData({
		item: "Watermelon",
		fragments: 618,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"Sausage": new LevelStaticData({
		item: "Sausage",
		fragments: 650,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"Fish": new LevelStaticData({
		item: "Fish",
		fragments: 410,
		hasFg: false,
		hasBg: true,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"Cookie3": new LevelStaticData({
		item: "Cookie3",
		fragments: 477,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"HotDog": new LevelStaticData({
		item: "HotDog",
		fragments: 980,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"ChickenLeg": new LevelStaticData({
		item: "ChickenLeg",
		fragments: 609,
		hasFg: false,
		hasBg: true,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"Airplane": new LevelStaticData({
		item: "Airplane",
		fragments: 1200,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"PizzaSlice": new LevelStaticData({
		item: "PizzaSlice",
		fragments: 213,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"Starbuck": new LevelStaticData({
		item: "Starbuck",
		fragments: 338,
		hasFg: true,
		hasBg: true,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"DogPoop": new LevelStaticData({
		item: "DogPoop",
		fragments: 359,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"FrenchFries": new LevelStaticData({
		item: "FrenchFries",
		fragments: 488,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"Lollipop": new LevelStaticData({
		item: "Lollipop",
		fragments: 515,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"PlasticDuck": new LevelStaticData({
		item: "PlasticDuck",
		fragments: 513,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"Donut2": new LevelStaticData({
		item: "Donut2",
		fragments: 1005,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"Cupcake": new LevelStaticData({
		item: "Cupcake",
		fragments: 650,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"Chocolate": new LevelStaticData({
		item: "Chocolate",
		fragments: 567,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"Burger": new LevelStaticData({
		item: "Burger",
		fragments: 879,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"Eiffel tower": new LevelStaticData({
		item: "Eiffel tower",
		fragments: 1300,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"Esquimo": new LevelStaticData({
		item: "Esquimo",
		fragments: 298,
		hasFg: false,
		hasBg: true,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"Apple": new LevelStaticData({
		item: "Apple",
		fragments: 323,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"IceCream": new LevelStaticData({
		item: "IceCream",
		fragments: 389,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"Cigarettes": new LevelStaticData({
		item: "Cigarettes",
		fragments: 393,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"Coconut": new LevelStaticData({
		item: "Coconut",
		fragments: 413,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"Watermelon2": new LevelStaticData({
		item: "Watermelon2",
		fragments: 906,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"Starfish": new LevelStaticData({
		item: "Starfish",
		fragments: 720,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"SandCastle": new LevelStaticData({
		item: "SandCastle",
		fragments: 825,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"Tong": new LevelStaticData({
		item: "Tong",
		fragments: 682,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"Chest": new LevelStaticData({
		item: "Chest",
		fragments: 854,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"Boat": new LevelStaticData({
		item: "Boat",
		fragments: 1400,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"Chips": new LevelStaticData({
		item: "Chips",
		fragments: 241,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"Egg": new LevelStaticData({
		item: "Egg",
		fragments: 382,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"Bacon": new LevelStaticData({
		item: "Bacon",
		fragments: 328,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"MouseTapette": new LevelStaticData({
		item: "MouseTapette",
		fragments: 367,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"Avocado": new LevelStaticData({
		item: "Avocado",
		fragments: 461,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"Cookie5": new LevelStaticData({
		item: "Cookie5",
		fragments: 795,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"RainbowCake": new LevelStaticData({
		item: "RainbowCake",
		fragments: 618,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"PlateSteak": new LevelStaticData({
		item: "PlateSteak",
		fragments: 664,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"Sushi": new LevelStaticData({
		item: "Sushi",
		fragments: 735,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"ChocolatineAndCroissant": new LevelStaticData({
		item: "ChocolatineAndCroissant",
		fragments: 979,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"Phone": new LevelStaticData({
		item: "Phone",
		fragments: 1500,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"CandyCane": new LevelStaticData({
		item: "CandyCane",
		fragments: 303,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"Churros": new LevelStaticData({
		item: "Churros",
		fragments: 340,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"CornDog": new LevelStaticData({
		item: "CornDog",
		fragments: 515,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"CottonCandy": new LevelStaticData({
		item: "CottonCandy",
		fragments: 531,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"PizzaSlice3": new LevelStaticData({
		item: "PizzaSlice3",
		fragments: 639,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"Waffle": new LevelStaticData({
		item: "Waffle",
		fragments: 621,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"Pinata": new LevelStaticData({
		item: "Pinata",
		fragments: 671,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"CandyApple": new LevelStaticData({
		item: "CandyApple",
		fragments: 736,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"PopCorn": new LevelStaticData({
		item: "PopCorn",
		fragments: 802,
		hasFg: true,
		hasBg: true,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"TeddyBear": new LevelStaticData({
		item: "TeddyBear",
		fragments: 813,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"BigWheel": new LevelStaticData({
		item: "BigWheel",
		fragments: 1600,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"Oreo": new LevelStaticData({
		item: "Oreo",
		fragments: 258,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"PQ": new LevelStaticData({
		item: "PQ",
		fragments: 264,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"Banana": new LevelStaticData({
		item: "Banana",
		fragments: 338,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"NewsPaper": new LevelStaticData({
		item: "NewsPaper",
		fragments: 381,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"Tacos": new LevelStaticData({
		item: "Tacos",
		fragments: 446,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"ChocolateBar": new LevelStaticData({
		item: "ChocolateBar",
		fragments: 530,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"SandwichTriange": new LevelStaticData({
		item: "SandwichTriange",
		fragments: 619,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"Flower": new LevelStaticData({
		item: "Flower",
		fragments: 680,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"PerfectSubway": new LevelStaticData({
		item: "PerfectSubway",
		fragments: 795,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"BigBurger": new LevelStaticData({
		item: "BigBurger",
		fragments: 1700,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"Turnip": new LevelStaticData({
		item: "Turnip",
		fragments: 463,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"Eggplant": new LevelStaticData({
		item: "Eggplant",
		fragments: 509,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"Peas": new LevelStaticData({
		item: "Peas",
		fragments: 552,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"Carrots": new LevelStaticData({
		item: "Carrots",
		fragments: 591,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"Marijuana": new LevelStaticData({
		item: "Marijuana",
		fragments: 605,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"Lettuce": new LevelStaticData({
		item: "Lettuce",
		fragments: 685,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"PizzaFull": new LevelStaticData({
		item: "PizzaFull",
		fragments: 1113,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"WateringCan": new LevelStaticData({
		item: "WateringCan",
		fragments: 804,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"Strawberries": new LevelStaticData({
		item: "Strawberries",
		fragments: 949,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"Tomatoes": new LevelStaticData({
		item: "Tomatoes",
		fragments: 999,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"Corn": new LevelStaticData({
		item: "Corn",
		fragments: 1800,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"PacquetBonbon": new LevelStaticData({
		item: "PacquetBonbon",
		fragments: 282,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"Pancakes": new LevelStaticData({
		item: "Pancakes",
		fragments: 321,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"Salade": new LevelStaticData({
		item: "Salade",
		fragments: 347,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"Letter": new LevelStaticData({
		item: "Letter",
		fragments: 369,
		hasFg: false,
		hasBg: true,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"CoffeeCup": new LevelStaticData({
		item: "CoffeeCup",
		fragments: 403,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"ChewingGum": new LevelStaticData({
		item: "ChewingGum",
		fragments: 454,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"Watermelon3": new LevelStaticData({
		item: "Watermelon3",
		fragments: 1359,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"Noodle": new LevelStaticData({
		item: "Noodle",
		fragments: 510,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"Macaron": new LevelStaticData({
		item: "Macaron",
		fragments: 669,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"FruitCorbeille": new LevelStaticData({
		item: "FruitCorbeille",
		fragments: 718,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"Clavier": new LevelStaticData({
		item: "Clavier",
		fragments: 495,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"Computer": new LevelStaticData({
		item: "Computer",
		fragments: 1900,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"Crayon": new LevelStaticData({
		item: "Crayon",
		fragments: 272,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"OrangeJuice": new LevelStaticData({
		item: "OrangeJuice",
		fragments: 369,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"PotYaourt": new LevelStaticData({
		item: "PotYaourt",
		fragments: 307,
		hasFg: true,
		hasBg: true,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"PotEnfant": new LevelStaticData({
		item: "PotEnfant",
		fragments: 523,
		hasFg: true,
		hasBg: true,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"CrocoBonbon": new LevelStaticData({
		item: "CrocoBonbon",
		fragments: 472,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"Plateau": new LevelStaticData({
		item: "Plateau",
		fragments: 614,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"PotNutella": new LevelStaticData({
		item: "PotNutella",
		fragments: 716,
		hasFg: true,
		hasBg: true,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"Rabbit": new LevelStaticData({
		item: "Rabbit",
		fragments: 720,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"MarbleCake": new LevelStaticData({
		item: "MarbleCake",
		fragments: 779,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"BabyBottle": new LevelStaticData({
		item: "BabyBottle",
		fragments: 785,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"Donut3": new LevelStaticData({
		item: "Donut3",
		fragments: 2010,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
	"School": new LevelStaticData({
		item: "School",
		fragments: 2000,
		hasFg: false,
		hasBg: false,
		offsetX: 0,
		offsetY: 0,
		hasSlideIn: false,
		slideOffsetX: 1000,
		slideOffsetY: -300,
		slideDuration: 1.5,
		isBossLevel: false
	}),
}

class LevelContainer {
	constructor(levelData, levelId, worldId) {
		this.data = levelData;
		this.id = levelId;
		this.worldId = worldId;
	}
	money() {
		return StaticData.worlds[this.worldId].moneyPerFragment * this.data.fragments;
	}
}

StaticData.worlds = [
	new WorldStaticData({
		name: "Basic",
		id: 0,
		icon: 0,
		maxNbWorkers: 40,
		maxNbSpeed: 100,
		maxNbStrength: 100,
		nbLevelsToComplete: 12,
		moneyPerFragment: 5,
		bgLayer: "Basic",
		layerColor: -281492157629439,
		color: -64874877598719,
		levels: [
			new LevelContainer(levels["Sheet"], 1, 0),
			new LevelContainer(levels["Cookie"], 2, 0),
			new LevelContainer(levels["Dollar"], 3, 0),
			new LevelContainer(levels["Donut"], 4, 0),
			new LevelContainer(levels["Watermelon"], 5, 0),
			new LevelContainer(levels["Sausage"], 6, 0),
			new LevelContainer(levels["Fish"], 7, 0),
			new LevelContainer(levels["Cookie3"], 8, 0),
			new LevelContainer(levels["HotDog"], 9, 0),
			new LevelContainer(levels["ChickenLeg"], 10, 0),
			new LevelContainer(levels["Sheet"], 11, 0),
			new LevelContainer(levels["Airplane"], 12, 0)
		],
	}),
	new WorldStaticData({
		name: "The Garden",
		id: 1,
		icon: 1,
		maxNbWorkers: 50,
		maxNbSpeed: 100,
		maxNbStrength: 100,
		nbLevelsToComplete: 12,
		moneyPerFragment: 50,
		bgLayer: "The Garden",
		color: -46184605619199,
		layerColor: -195179940945919,
		holeColor: -112441891928063,
		levels: [
			new LevelContainer(levels["PizzaSlice"], 1, 1),
			new LevelContainer(levels["Starbuck"], 2, 1),
			new LevelContainer(levels["DogPoop"], 3, 1),
			new LevelContainer(levels["FrenchFries"], 4, 1),
			new LevelContainer(levels["Lollipop"], 5, 1),
			new LevelContainer(levels["PlasticDuck"], 6, 1),
			new LevelContainer(levels["Donut2"], 7, 1),
			new LevelContainer(levels["Cupcake"], 8, 1),
			new LevelContainer(levels["Chocolate"], 9, 1),
			new LevelContainer(levels["Burger"], 10, 1),
			new LevelContainer(levels["PizzaSlice"], 11, 1),
			new LevelContainer(levels["Eiffel tower"], 12, 1)
		],
	}),
	new WorldStaticData({
		name: "The Beach",
		id: 2,
		icon: 2,
		maxNbWorkers: 60,
		maxNbSpeed: 100,
		maxNbStrength: 100,
		nbLevelsToComplete: 12,
		moneyPerFragment: 500,
		bgLayer: "The Beach",
		color: -138820540589055,
		layerColor: -281491737783295,
		holeColor: -262523416978431,
		levels: [
			new LevelContainer(levels["Esquimo"], 1, 2),
			new LevelContainer(levels["Apple"], 2, 2),
			new LevelContainer(levels["IceCream"], 3, 2),
			new LevelContainer(levels["Cigarettes"], 4, 2),
			new LevelContainer(levels["Coconut"], 5, 2),
			new LevelContainer(levels["Watermelon2"], 6, 2),
			new LevelContainer(levels["Starfish"], 7, 2),
			new LevelContainer(levels["SandCastle"], 8, 2),
			new LevelContainer(levels["Tong"], 9, 2),
			new LevelContainer(levels["Chest"], 10, 2),
			new LevelContainer(levels["Esquimo"], 11, 2),
			new LevelContainer(levels["Boat"], 12, 2)
		],
	}),
	new WorldStaticData({
		name: "The Kitchen",
		id: 3,
		icon: 3,
		maxNbWorkers: 70,
		maxNbSpeed: 100,
		maxNbStrength: 100,
		nbLevelsToComplete: 12,
		moneyPerFragment: 5000,
		bgLayer: "The Kitchen",
		color: -126722339095551,
		layerColor: -281487828671487,
		holeColor: -255921096030207,
		levels: [
			new LevelContainer(levels["Chips"], 1, 3),
			new LevelContainer(levels["Egg"], 2, 3),
			new LevelContainer(levels["Bacon"], 3, 3),
			new LevelContainer(levels["MouseTapette"], 4, 3),
			new LevelContainer(levels["Avocado"], 5, 3),
			new LevelContainer(levels["Cookie5"], 6, 3),
			new LevelContainer(levels["RainbowCake"], 7, 3),
			new LevelContainer(levels["PlateSteak"], 8, 3),
			new LevelContainer(levels["Sushi"], 9, 3),
			new LevelContainer(levels["ChocolatineAndCroissant"], 10, 3),
			new LevelContainer(levels["Chips"], 11, 3),
			new LevelContainer(levels["Phone"], 12, 3)
		],
	}),
	new WorldStaticData({
		name: "The Fairground",
		id: 4,
		icon: 4,
		maxNbWorkers: 80,
		maxNbSpeed: 100,
		maxNbStrength: 100,
		nbLevelsToComplete: 12,
		moneyPerFragment: 50000,
		bgLayer: "The Fairground",
		color: -83839909233663,
		layerColor: -281489859006463,
		holeColor: -281486620810239,
		levels: [
			new LevelContainer(levels["CandyCane"], 1, 4),
			new LevelContainer(levels["Churros"], 2, 4),
			new LevelContainer(levels["CornDog"], 3, 4),
			new LevelContainer(levels["CottonCandy"], 4, 4),
			new LevelContainer(levels["PizzaSlice3"], 5, 4),
			new LevelContainer(levels["Waffle"], 6, 4),
			new LevelContainer(levels["Pinata"], 7, 4),
			new LevelContainer(levels["CandyApple"], 8, 4),
			new LevelContainer(levels["PopCorn"], 9, 4),
			new LevelContainer(levels["TeddyBear"], 10, 4),
			new LevelContainer(levels["CandyCane"], 11, 4),
			new LevelContainer(levels["BigWheel"], 12, 4)
		],
	}),
	new WorldStaticData({
		name: "The Street",
		id: 5,
		icon: 5,
		maxNbWorkers: 90,
		maxNbSpeed: 100,
		maxNbStrength: 100,
		nbLevelsToComplete: 12,
		moneyPerFragment: 500000,
		bgLayer: "The Street",
		color: -59377520580607,
		layerColor: -235035090120703,
		holeColor: -241634861010943,
		levels: [
			new LevelContainer(levels["Oreo"], 1, 5),
			new LevelContainer(levels["PQ"], 2, 5),
			new LevelContainer(levels["Banana"], 3, 5),
			new LevelContainer(levels["NewsPaper"], 4, 5),
			new LevelContainer(levels["Tacos"], 5, 5),
			new LevelContainer(levels["Donut2"], 6, 5),
			new LevelContainer(levels["ChocolateBar"], 7, 5),
			new LevelContainer(levels["SandwichTriange"], 8, 5),
			new LevelContainer(levels["Flower"], 9, 5),
			new LevelContainer(levels["PerfectSubway"], 10, 5),
			new LevelContainer(levels["Oreo"], 11, 5),
			new LevelContainer(levels["BigBurger"], 12, 5)
		],
	}),
	new WorldStaticData({
		name: "The Field",
		id: 6,
		icon: 6,
		maxNbWorkers: 100,
		maxNbSpeed: 100,
		maxNbStrength: 100,
		nbLevelsToComplete: 14,
		moneyPerFragment: 5000000,
		bgLayer: "The Field",
		color: -58279703229439,
		layerColor: -224040711871487,
		holeColor: -239435837553663,
		levels: [
			new LevelContainer(levels["Turnip"], 1, 6),
			new LevelContainer(levels["Eggplant"], 2, 6),
			new LevelContainer(levels["Peas"], 3, 6),
			new LevelContainer(levels["Carrots"], 4, 6),
			new LevelContainer(levels["Marijuana"], 5, 6),
			new LevelContainer(levels["Lettuce"], 6, 6),
			new LevelContainer(levels["PizzaFull"], 7, 6),
			new LevelContainer(levels["WateringCan"], 8, 6),
			new LevelContainer(levels["Strawberries"], 9, 6),
			new LevelContainer(levels["Tomatoes"], 10, 6),
			new LevelContainer(levels["Turnip"], 11, 6),
			new LevelContainer(levels["Eggplant"], 12, 6),
			new LevelContainer(levels["Peas"], 13, 6),
			new LevelContainer(levels["Corn"], 14, 6)
		],
	}),
	new WorldStaticData({
		name: "The Office",
		id: 7,
		icon: 7,
		maxNbWorkers: 110,
		maxNbSpeed: 100,
		maxNbStrength: 100,
		nbLevelsToComplete: 16,
		moneyPerFragment: 50000000,
		bgLayer: "The Office",
		color: -106932421608447,
		layerColor: -262522880547839,
		holeColor: -281487291714559,
		levels: [
			new LevelContainer(levels["PacquetBonbon"], 1, 7),
			new LevelContainer(levels["Pancakes"], 2, 7),
			new LevelContainer(levels["Salade"], 3, 7),
			new LevelContainer(levels["Letter"], 4, 7),
			new LevelContainer(levels["CoffeeCup"], 5, 7),
			new LevelContainer(levels["ChewingGum"], 6, 7),
			new LevelContainer(levels["Watermelon3"], 7, 7),
			new LevelContainer(levels["Noodle"], 8, 7),
			new LevelContainer(levels["Macaron"], 9, 7),
			new LevelContainer(levels["FruitCorbeille"], 10, 7),
			new LevelContainer(levels["PacquetBonbon"], 11, 7),
			new LevelContainer(levels["Pancakes"], 12, 7),
			new LevelContainer(levels["Salade"], 13, 7),
			new LevelContainer(levels["Clavier"], 14, 7),
			new LevelContainer(levels["CoffeeCup"], 15, 7),
			new LevelContainer(levels["Computer"], 16, 7)
		],
	}),
	new WorldStaticData({
		name: "The Playground",
		id: 8,
		icon: 8,
		maxNbWorkers: 120,
		maxNbSpeed: 100,
		maxNbStrength: 100,
		nbLevelsToComplete: 18,
		moneyPerFragment: 500000000,
		bgLayer: "The Playground",
		color: -53880231000063,
		layerColor: -235035358625791,
		holeColor: -255926750675967,
		levels: [
			new LevelContainer(levels["Crayon"], 1, 8),
			new LevelContainer(levels["OrangeJuice"], 2, 8),
			new LevelContainer(levels["PotYaourt"], 3, 8),
			new LevelContainer(levels["PotEnfant"], 4, 8),
			new LevelContainer(levels["CrocoBonbon"], 5, 8),
			new LevelContainer(levels["Plateau"], 6, 8),
			new LevelContainer(levels["PotNutella"], 7, 8),
			new LevelContainer(levels["Rabbit"], 8, 8),
			new LevelContainer(levels["MarbleCake"], 9, 8),
			new LevelContainer(levels["BabyBottle"], 10, 8),
			new LevelContainer(levels["Crayon"], 11, 8),
			new LevelContainer(levels["OrangeJuice"], 12, 8),
			new LevelContainer(levels["Donut3"], 13, 8),
			new LevelContainer(levels["PotEnfant"], 14, 8),
			new LevelContainer(levels["CrocoBonbon"], 15, 8),
			new LevelContainer(levels["Plateau"], 16, 8),
			new LevelContainer(levels["PotNutella"], 17, 8),
			new LevelContainer(levels["School"], 18, 8)
		],
	})
]

StaticData.specialAnts = {
	flash: new SpecialAntStaticData({
		skin: "flash",
		name: "flashName",
		description: "flashDesc",
		world: 1,
		rewardedCount: 2,
		icon: 0,
		walkDurationFunction: x => x/10,
		eatDurationFunction: x => x/4,
		spawnDurationFunction: x => x/6,
		strengthFunction: x => 1,
		scaleFunction: x => 1.5*x,
		moneyFunction: x => x,
		rotateSpeedFunction: x => x*2,
		cooldown: 2,
		cooldownReduceOnBoost: 0.5
	}),
	robo: new SpecialAntStaticData({
		skin: "robo",
		name: "roboName",
		description: "roboDesc",
		world: 2,
		rewardedCount: 3,
		icon: 1,
		walkDurationFunction: x => x * 1.2,
		eatDurationFunction: x => x / 3,
		spawnDurationFunction: x => x * 1.2,
		strengthFunction: x => x + 1,
		scaleFunction: x => 1.5*x,
		moneyFunction: x => x,
		rotateSpeedFunction: x => x*0.8,
		cooldown: 3,
		cooldownReduceOnBoost: 0.5
	}),
	gold: new SpecialAntStaticData({
		skin: "gold",
		name: "goldName",
		description: "goldDesc",
		world: 3,
		rewardedCount: 4,
		icon: 2,
		walkDurationFunction: x => x * 0.9,
		eatDurationFunction: x => x,
		spawnDurationFunction: x => x,
		strengthFunction: x => x,
		scaleFunction: x => 1.5*x,
		moneyFunction: x => 10*x,
		rotateSpeedFunction: x => x*1.1,
		cooldown: 7,
		cooldownReduceOnBoost: 0.5
	}),
};

StaticData.globalValues = {
	maxMinutesAway: 240,
	minMinutesAwayThreshold: 2,
	minMinutesAway: 5,
	ascendPriceCoef: 60,
}

/* StaticData exported */

const staticData = StaticData;

// 5. SaveData
class WorldSaveData {
	constructor({
		unlocked = false,
		finished = false,
		eatenBits = 0,
		curLevel = 0,
		workerLevel = 0,
		strengthLevel = 0,
		speedLevel = 0,
		uid
	}, staticData) {
		
		this.unlocked = unlocked;
		this.finished = finished;
		this.eatenBits = eatenBits;
		this.curLevel = curLevel;
		this.workerLevel = workerLevel;
		this.strengthLevel = strengthLevel;
		this.speedLevel = speedLevel;
		this.uid = uid;
		this.staticData = staticData;
	}
	
	get lastProgress() {
		return 100 * this.eatenBits/this.staticData.levels[this.curLevel].data.fragments;
	}
	
	isMaxWorker() { return this.workerLevel >= this.staticData.maxNbWorkers }
	upgradeWorker() { !this.isMaxWorker() && this.workerLevel++ }
	
	isMaxSpeed() { return this.speedLevel >= this.staticData.maxNbSpeed	}
	upgradeSpeed() { !this.isMaxSpeed() && this.speedLevel++ }
	
	isMaxStrength() { return this.strengthLevel >= this.staticData.maxNbStrength }
	upgradeStrength() { !this.isMaxStrength() && this.strengthLevel++ }
	
	eatBit(boost = 1) {
		this.eatenBits++;
		return Math.ceil(this.staticData.moneyPerFragment * boost);
	}
	
	nextLevel() {
		this.curLevel++;
		this.eatenBits = 0;
		if (this.curLevel >= this.staticData.nbLevelsToComplete) {
			this.curLevel = 0
			this.finished = true;
			return true;
		}
		return false;
	}
	
	saveToJson() {
		return {
			unlocked: this.unlocked,
			finished: this.finished,
			eatenBits: this.eatenBits,
			curLevel: this.curLevel,
			workerLevel: this.workerLevel,
			strengthLevel: this.strengthLevel,
			speedLevel: this.speedLevel,
			uid: this.uid,
		};
	}
	
	loadFromJson(o) {
		this.unlocked = o.unlocked || this.unlocked;
		this.finished = o.finished || this.finished;
		this.eatenBits = o.eatenBits || this.eatenBits;
		this.curLevel = o.curLevel || this.curLevel;
		this.workerLevel = o.workerLevel || this.workerLevel;
		this.strengthLevel = o.strengthLevel || this.strengthLevel;
		this.speedLevel = o.speedLevel || this.speedLevel;
		this.uid = o.uid || this.uid;
	}
}

class SpecialAntSaveData {
	constructor({
		key
	}, staticData, saveData) {
		this.unlocked = false;
		this.needPopUp = false;
		this.lastEnterPoint = -Infinity;
		this.inUse = false;
		this.watchedRewardeds = 0;
		this.staticData = staticData;
		this.saveData = saveData
		this.checkUnlock();
	}
	
	setUnlocked() {
		if (this.unlocked) return;
		this.unlocked = true;
		this.needPopUp = true;
	}
	
	closePopUp() {
		this.needPopUp = false;
	}
	
	onEnterHole(runtime) {
		this.inUse = false;
		this.lastEnterPoint = runtime.gameTime;
	}
	
	isAvailable(runtime) {
		this.checkUnlock();
		return this.unlocked && !this.inUse && (this.lastEnterPoint + this.staticData.cooldown <= runtime.gameTime);
	}
	
	onUsed() {
		this.inUse = true;
	}
	
	isInCooldown() {
		return !this.inUse && this.unlocked && !this.isAvailable(this);
	}
	
	onBoost(runtime) {
		this.lastEnterPoint -= this.staticData.cooldownReduceOnBoost;
	}
	
	checkUnlock() {
		if (this.unlocked) return;
		if (this.saveData.worlds[this.staticData.world].unlocked || this.watchedRewardeds >= this.staticData.rewardedCount)
			this.setUnlocked();
	}
	
	watchRewarded() {
		this.watchedRewardeds++;
		this.checkUnlock();
	}
	
	saveToJson() {
		return {
			unlocked: this.unlocked,
			watchedRewardeds: this.watchedRewardeds,
			needPopUp: this.needPopUp
		};
	}
	
	loadFromJson(o) {
		this.unlocked = o.unlocked || this.unlocked;
		this.watchedRewardeds = o.watchedRewardeds || this.watchedRewardeds;
		if (o.hasOwnProperty("needPopUp")) this.needPopUp = o.needPopUp || this.needPopUp;
		this.checkUnlock();
	}
}

class SaveData {
	constructor(staticData, baseCashPool, langs) {
		this.worlds = staticData.worlds.map(x=>new WorldSaveData({worldId: x.worldId}, x));
		this.specialAnts = {};
		Object.keys(staticData.specialAnts).forEach(key=>{
			this.specialAnts[key] = new SpecialAntSaveData({key}, staticData.specialAnts[key], this)
		});
		this.timestamp = Date.now();
		this.curWorldId = 0;
		for(let i = 0; i <= this.curWorldId; i++) this.unlockWorld(i);
		this.hasSeenTuto = false;
		this._awayTime = 0;
		this.money = baseCashPool;
		this.staticData = staticData;
		this.audio = true;
		this.freeMoneyBagHasHappened = false;
		this.language = this.detectLanguage(langs);
		this.langs = langs;
	}
	
	detectLanguage(langs) {
	  if (langs.includes("zh")) return "zh";
	  var userLangs = (typeof navigator !== 'undefined' ? (navigator.language || navigator.userLanguage) : 'zh') || 'zh';
	  userLangs = (typeof navigator !== 'undefined' ? navigator.languages : null) || [userLangs];
	  let compareLangs = (lang, curLang) => {
		if (curLang.toLowerCase() === lang.slice(0, curLang.length).toLowerCase()) {
		  return true;
		}
		let subLang = curLang.split("-")[0];
		return (
		  subLang.toLowerCase() === lang.slice(0, subLang.length).toLowerCase()
		);
	  };
	  for (let i = 0; i < userLangs.length; i++) {
		let curLang = userLangs[i];
		let res = langs.find(compareLangs.bind(null, curLang));
		if (res) return res;
	  }
	  return "zh";
	}
	
	setLanguage(lang) {
		if (this.langs.includes(lang))
			this.language = lang
	}
	
	awayTime() {
		let a = this._awayTime;
		this._awayTime = 0;
		return a;
	}
	
	setWorld(worldId) {
		worldId = Math.min(Math.max(0, worldId), this.worlds.length - 1);
		this.curWorldId = worldId;
	}
	
	unlockWorld(worldId) {
		if (worldId !== Math.min(Math.max(0, worldId), this.worlds.length - 1)) return;
		this.worlds[worldId].unlocked = true;
	}
	
	canUnlockWorld(worldId) {
		if (worldId !== Math.min(Math.max(0, worldId), this.worlds.length - 1)) return false;
		return !this.worlds[worldId].unlocked;
	}
	
	nextLevel() {
		let curWorld = this.worlds[this.curWorldId];
		let hasWrapped = curWorld.nextLevel();
		if (hasWrapped && this.canUnlockWorld(this.curWorldId + 1)) {
			this.unlockWorld(this.curWorldId + 1);
			return true;
		}
		return false;
	}
	
	saveSpecialAntsToJson() {
		let ret = {}
		Object.keys(this.specialAnts).forEach(key=>{
			ret[key] = this.specialAnts[key].saveToJson();
		});
		return ret;
	}
	
	loadSpecialAntsFromJson(data) {
		Object.keys(data).forEach(key=>{
			if (this.specialAnts.hasOwnProperty(key)) this.specialAnts[key].loadFromJson(data[key]);
		});
	}
	
	saveToJson() {
		this.timestamp = Date.now();
		return {
			worlds: this.worlds.map(x=>x.saveToJson()),
			timestamp: this.timestamp,
			curWorldId: this.curWorldId,
			money: this.money.saveToJson(),
			hasSeenTuto: this.hasSeenTuto,
			freeMoneyBagHasHappened: this.freeMoneyBagHasHappened,
			audio: this.audio,
			language: this.language,
			specialAnts: this.saveSpecialAntsToJson(),
		};
	}
	
	getLastUnlockedWorld() {
		for(let i = this.worlds.length - 1; i >= 0; i--) {
			if (this.worlds[i].unlocked) return i;
		}
		return 0;
	}
	
	loadFromJson(o) {
		this.worlds.forEach((world, i) => {
			world.loadFromJson(o.worlds[i]);
		});
		
		this._awayTime = (new Date(this.timestamp) - new Date(o.timestamp))/(1000 * 60);
		if (this._awayTime < this.staticData.globalValues.minMinutesAwayThreshold) {
			this._awayTime = 0;
		} else {
			this._awayTime = Math.max(this.staticData.globalValues.minMinutesAway, Math.min(this.staticData.globalValues.maxMinutesAway, this._awayTime));
		}
		
		
		this.curWorldId = o.curWorldId || this.curWorldId;
		if (o.hasOwnProperty("money")) this.money.loadFromJson(o.money)
		if (o.hasOwnProperty("hasSeenTuto")) this.hasSeenTuto = o.hasSeenTuto;
		if (o.hasOwnProperty("audio")) this.audio = o.audio;
		if (o.hasOwnProperty("freeMoneyBagHasHappened")) this.freeMoneyBagHasHappened = o.freeMoneyBagHasHappened;
		if (o.hasOwnProperty("language")) this.setLanguage(o.language);
		if (o.hasOwnProperty("specialAnts")) this.loadSpecialAntsFromJson(o.specialAnts);
	}
	
	save() {
		return JSON.stringify(this.saveToJson());
	}
	
	load(str) {
		try {
			this.loadFromJson(JSON.parse(str));
		} catch(e) {console.error("invalid save data, resetting", e, str)}
	}
}

// 6. WebSdkWrapper
globalThis.WebSdkWrapper = (function () {
	function addScript(src, id, onload) {
		if (document.getElementById(id)) return;
		let fjs = document.getElementsByTagName("script")[0];
		let js = document.createElement("script");
		js.id = id;
		fjs.parentNode.insertBefore(js, fjs);
		js.onload = onload;
		js.src = src;
	}

	window.addEventListener("keydown", (ev) => {
		if (["ArrowDown", "ArrowUp", " "].includes(ev.key)) {
			ev.preventDefault();
		}
	});
	window.addEventListener("wheel", (ev) => ev.preventDefault(), {
		passive: false,
	});

	/*
  ==============  EVENT DISPATCHER  =================
  vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv
  */
	const events = {};

	function listen(event, fn, { once = false } = {}) {
		events[event] = events[event] || [];
		events[event].push({
			fn,
			once,
		});
	}

	function listenOnce(event, fn) {
		listen(event, fn, { once: true });
	}

	function dispatch(event, ...data) {
		(events[event] || []).forEach((fnObj) => {
			fnObj.fn(...data);
		});
		events[event] = (events[event] || []).filter((fnObj) => !fnObj.once);
	}
	/*
  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  ==============  EVENT DISPATCHER  =================
  */
	let sdk;
	const sdkContext = {};
	let supportedNetworks = [
		{
			name: "Poki",
			get sdk() {
				return globalThis.PokiSDK;
			},
			scriptSrc: "//game-cdn.poki.com/scripts/v2/poki-sdk.js",
			hasAds: true,
			hasBanner: false,
			enableOnlyInProduction: false,
			implementation: {
				//async preInit(debug = false) {},
				init(debug = false) {
					return new Promise((resolve) => {
						sdk
							.init()
							.then(() => {
							sdkContext.hasAdblock = false;
							resolve();
						})
							.catch(() => {
							sdkContext.hasAdblock = true;
							resolve();
						});
						sdk.setDebug(debug);
						// Sitelock bypassed for local offline play
					});
				},
				setUpEventListeners() {
					listen("loadingStart", () => {
						sdk.gameLoadingStart();
					});
					listen("loadingEnd", () => {
						sdk.gameLoadingFinished();
					});
					listen("gameplayStart", () => {
						if (sdkContext.gameplayStarted) return;
						sdkContext.gameplayStarted = true;
						sdk.gameplayStart();
					});
					listen("gameplayStop", () => {
						if (!sdkContext.gameplayStarted) return;
						sdkContext.gameplayStarted = false;
						sdk.gameplayStop();
					});
					listen("interstitial", () => {
						dispatch("adStarted", sdkContext.lastRequestedAd);
						sdk.commercialBreak().then(() => {
							dispatch("interstitialEnd", true);
						});
					});
					listen("rewarded", () => {
						dispatch("adStarted", sdkContext.lastRequestedAd);
						sdk.rewardedBreak().then((success) => {
							dispatch("rewardedEnd", success);
						});
					});
					listen("happyTime", (scale) => {
						sdk.happyTime(scale);
					});
				},
				hasAdblock() {
					return !!sdkContext.hasAdblock;
				},
			},
		},
		{
			name: "CrazyGames",
			get sdk() {
				if (!sdkContext.crazysdk && globalThis.CrazyGames && globalThis.CrazyGames.CrazySDK)
					sdkContext.crazysdk = globalThis.CrazyGames.CrazySDK.getInstance();
				return sdkContext.crazysdk;
			},
			scriptSrc: "//sdk.crazygames.com/crazygames-sdk-v1.js",
			hasAds: true,
			enableOnlyInProduction: false,
			hasBanner: true,
			implementation: {
				//async preInit(debug = false) {},
				init() {
					return new Promise((resolve) => {
						sdk.addEventListener("adblockDetectionExecuted", (event) => {
							sdkContext.hasAdblock = event.hasAdblock;
							resolve();
						});
						sdk.init();
					});
				},
				setUpEventListeners() {
					sdk.addEventListener("adStarted", () => {
						dispatch("adStarted", sdkContext.lastRequestedAd);
					});
					sdk.addEventListener("adFinished", () => {
						if (sdkContext.lastRequestedAd === "interstitial")
							dispatch("interstitialEnd", true);
						else dispatch("rewardedEnd", true);
					});
					sdk.addEventListener("adFinished", () => {
						if (sdkContext.lastRequestedAd === "interstitial")
							dispatch("interstitialEnd", true);
						else dispatch("rewardedEnd", true);
					});
					sdk.addEventListener("adError", () => {
						if (sdkContext.lastRequestedAd === "interstitial")
							dispatch("interstitialEnd", false);
						else dispatch("rewardedEnd", false);
					});
					listen("gameplayStart", () => {
						if (sdkContext.gameplayStarted) return;
						sdkContext.gameplayStarted = true;
						sdk.gameplayStart();
					});
					listen("gameplayStop", () => {
						if (!sdkContext.gameplayStarted) return;
						sdkContext.gameplayStarted = false;
						sdk.gameplayStop();
					});
					listen("interstitial", () => {
						sdkContext.lastRequestedAd = "interstitial";
						sdk.requestAd("midgame");
					});
					listen("rewarded", () => {
						sdkContext.lastRequestedAd = "rewarded";
						sdk.requestAd("rewarded");
					});
					listen("happyTime", () => {
						sdk.happytime();
					});
					listen("banner", (data) => {
						sdk.requestBanner(data);
					});
				},
				hasAdblock() {
					return !!sdkContext.hasAdblock;
				},
			},
		},
		{
			name: "GamePix",
			get sdk() {
				return globalThis.GamePix;
			},
			scriptSrc: "//integration.gamepix.com/sdk/v3/gamepix.sdk.js",
			hasAds: true,
			enableOnlyInProduction: true,
			hasBanner: false,
			implementation: {
				//async preInit(debug = false) {},
				//init() {},
				setUpEventListeners() {
					listen("loadingProgress", (progress) => {
						sdk.loading(progress);
					});
					listen("loadingEnd", () => {
						sdk.loaded();
					});
					sdk.pause = () => {
						dispatch("pause");
					};
					sdk.resume = () => {
						dispatch("resume");
					};
					listen("levelStart", (level) => {
						sdk.updateLevel(level);
					});
					listen("score", (score) => {
						sdk.updateScore(score);
					});
					listen("interstitial", () => {
						dispatch("adStarted", sdkContext.lastRequestedAd);
						sdk.interstitialAd().then(() => {
							dispatch("interstitialEnd", true);
						});
					});
					listen("rewarded", () => {
						dispatch("adStarted", sdkContext.lastRequestedAd);
						sdk.rewardAd().then((res) => {
							dispatch("rewardedEnd", res.success);
						});
					});
					listen("happyTime", () => {
						sdk.happyMoment();
					});
				},
				hasAdblock() {
					return false;
				},
			},
		},
		{
			name: "GameDistribution",
			get sdk() {
				return globalThis.gdsdk;
			},
			scriptSrc: "//html5.api.gamedistribution.com/main.min.js",
			hasAds: true,
			enableOnlyInProduction: true,
			hasBanner: false,
			implementation: {
				async preInit(debug = false, data) {
					sdkContext.errors = 0;
					window["GD_OPTIONS"] = {
						gameId: data.gameId,
						debug,
						testing: debug,
						onEvent: function (event) {
							switch (event.name) {
								case "SDK_GAME_START":
									sdkContext.errors = 0;
									// if (sdkContext.lastRequestedAd === "interstitial")
									//   dispatch("interstitialEnd", true);
									// else dispatch("rewardedEnd", true);
									break;
								case "SDK_GAME_PAUSE":
									dispatch("pause");
									break;
								case "SDK_GDPR_TRACKING":
									// this event is triggered when your user doesn't want to be tracked
									break;
								case "SDK_GDPR_TARGETING":
									// this event is triggered when your user doesn't want personalised targeting of ads and such
									break;
								case "AD_ERROR":
									sdkContext.errors += 1;
									// if (sdkContext.errors >= 2) {
									//   if (sdkContext.lastRequestedAd === "interstitial")
									//     dispatch("interstitialEnd", false);
									//   else dispatch("rewardedEnd", false);
									// } else {
									//   dispatch(sdkContext.lastRequestedAd);
									// }
									break;
							}
						},
					};
				},
				//init() {},
				setUpEventListeners() {
					listen("interstitial", () => {
						sdkContext.lastRequestedAd = "interstitial";
						dispatch("adStarted", sdkContext.lastRequestedAd);
						sdk
							.showAd()
							.then((response) => {
							dispatch("interstitialEnd", true);
						})
							.catch((error) => {
							dispatch("interstitialEnd", false);
						});
					});
					listen("rewarded", () => {
						sdkContext.lastRequestedAd = "rewarded";
						dispatch("adStarted", sdkContext.lastRequestedAd);
						sdk
							.showAd("rewarded")
							.then((response) => {
							dispatch("rewardedEnd", true);
						})
							.catch((error) => {
							dispatch("rewardedEnd", false);
						});
					});
				},
				hasAdblock() {
					return false;
				},
			},
		},
		{
			name: "GameMonetize",
			get sdk() {
				return globalThis.sdk;
			},
			scriptSrc: "//html5.api.gamedistribution.com/main.min.js",
			hasAds: true,
			enableOnlyInProduction: true,
			hasBanner: false,
			implementation: {
				async preInit(debug = false, data) {
					window["SDK_OPTIONS "] = {
						gameId: data.gameId,
						debug,
						testing: debug,
						onEvent: function (event) {
							switch (event.name) {
								case "SDK_GAME_START":
									if (sdkContext.lastRequestedAd === "interstitial")
										dispatch("interstitialEnd", true);
									else dispatch("rewardedEnd", true);
									break;
								case "SDK_GAME_PAUSE":
									dispatch("pause");
									break;
								case "SDK_GDPR_TRACKING":
									// this event is triggered when your user doesn't want to be tracked
									break;
								case "SDK_GDPR_TARGETING":
									// this event is triggered when your user doesn't want personalised targeting of ads and such
									break;
								case "AD_ERROR":
									sdkContext.errors += 1;
									if (sdkContext.errors >= 2) {
										if (sdkContext.lastRequestedAd === "interstitial")
											dispatch("interstitialEnd", false);
										else dispatch("rewardedEnd", false);
									} else {
										dispatch(sdkContext.lastRequestedAd);
									}
									break;
							}
						},
					};
				},
				//init() {},
				setUpEventListeners() {
					listen("interstitial", () => {
						dispatch("adStarted", sdkContext.lastRequestedAd);
						sdk.showBanner();
					});
					listen("rewarded", () => {
						dispatch("adStarted", sdkContext.lastRequestedAd);
						sdk.showBanner();
					});
				},
				hasAdblock() {
					return false;
				},
			},
		},
		{
			name: "CoolMathGames",
			get sdk() {
				return null;
			},
			scriptSrc: null,
			hasAds: false,
			enableOnlyInProduction: true,
			hasBanner: false,
			implementation: {
				//async preInit(debug = false, data) {},
				init() {},
				setUpEventListeners() {
					listen("replayLevel", (level) => {
						self.parent.cmgGameEvent("replay", level.toString());
					});
					listen("gameplayStart", () => {
						self.parent.cmgGameEvent("start");
					});
					listen("levelStart", (level) => {
						self.parent.cmgGameEvent("start", level.toString());
					});
				},
				hasAdblock() {
					return false;
				},
			},
		},
	];

	let currentSdk = null;
	let enabled = false;
	const Wrapper = {
		get enabled() {
			return enabled;
		},
		get currentSdk() {
			return currentSdk;
		},
		async init(name, debug = false, data = {}) {
			return new Promise(async (resolve) => {
				currentSdk = supportedNetworks.find(
					(x) => x.name.toLowerCase() === name.toLowerCase()
				);
				if (currentSdk) {
					enabled = true;
					if (currentSdk.enableOnlyInProduction && debug) {
						enabled = false;
						resolve();
					} else {
						if (currentSdk.implementation.preInit)
							await currentSdk.implementation.preInit(debug, data);
						if (currentSdk.scriptSrc) {
							addScript(
								currentSdk.scriptSrc,
								currentSdk.name + "-jssdk",
								async () => {
									sdk = currentSdk.sdk;
									currentSdk.implementation.setUpEventListeners();
									if (currentSdk.implementation.init)
										await currentSdk.implementation.init(debug, data);
									resolve();
								}
							);
						} else {
							resolve();
						}
					}
				} else {
					resolve();
				}
			});
		},
		onPause(fn) {
			listen("pause", fn);
		},
		pause() {
			dispatch("pause");
		},
		onResume(fn) {
			listen("resume", fn);
		},
		resume() {
			dispatch("resume");
		},
		onMute(fn) {
			listen("mute", fn);
		},
		mute() {
			dispatch("mute");
		},
		onUnmute(fn) {
			listen("unmute", fn);
		},
		unmute() {
			dispatch("unmute");
		},
		onUnlockAllLevels(fn) {
			window.unlockAllLevels = fn;
		},
		hasAdblock() {
			if (currentSdk && currentSdk.implementation.hasAdblock)
				return currentSdk.implementation.hasAdblock();
			return false;
		},
		loadingStart() {
			dispatch("loadingStart");
		},
		loadingProgress(progress) {
			progress = Math.min(Math.max(0, progress), 100);
			dispatch("loadingProgress", progress);
		},
		loadingEnd() {
			dispatch("loadingEnd");
		},
		gameplayStart() {
			dispatch("gameplayStart");
		},
		gameplayStop() {
			dispatch("gameplayStop");
		},
		happyTime() {
			dispatch("happyTime");
		},
		levelStart(level) {
			dispatch("levelStart", level);
		},
		replayLevel(level) {
			dispatch("replayLevel", level);
		},
		score(score) {
			dispatch("score", score);
		},
		banner(data) {
			dispatch("banner", data);
		},
		interstitial() {
			sdkContext.lastRequestedAd = "interstitial";
			if (globalThis.SDKManager) {
				return globalThis.SDKManager.showInterstitial();
			}
			if (!currentSdk || !currentSdk.hasAds) {
				dispatch("adStarted", sdkContext.lastRequestedAd);
				return Promise.resolve(true);
			}
			return new Promise((resolve) => {
				let gameplayStarted = sdkContext.gameplayStarted;
				if (gameplayStarted) Wrapper.gameplayStop();
				Wrapper.mute();
				let finished = false;
				const timer = setTimeout(() => {
					if (finished) return;
					finished = true;
					if (gameplayStarted) Wrapper.gameplayStart();
					Wrapper.unmute();
					resolve(true);
				}, 1000);
				dispatch("interstitial");
				listenOnce("interstitialEnd", (...args) => {
					if (finished) return;
					finished = true;
					clearTimeout(timer);
					if (gameplayStarted) Wrapper.gameplayStart();
					Wrapper.unmute();
					resolve(...args);
				});
			});
		},
		rewarded() {
			sdkContext.lastRequestedAd = "rewarded";
			if (globalThis.SDKManager) {
				return globalThis.SDKManager.showRewarded();
			}
			if (!currentSdk || !currentSdk.hasAds) {
				dispatch("adStarted", sdkContext.lastRequestedAd);
				return Promise.resolve(true);
			}
			return new Promise((resolve) => {
				let gameplayStarted = sdkContext.gameplayStarted;
				if (gameplayStarted) Wrapper.gameplayStop();
				Wrapper.mute();
				let finished = false;
				const timer = setTimeout(() => {
					if (finished) return;
					finished = true;
					if (gameplayStarted) Wrapper.gameplayStart();
					Wrapper.unmute();
					resolve(true);
				}, 3000);
				dispatch("rewarded");
				listenOnce("rewardedEnd", (...args) => {
					if (finished) return;
					finished = true;
					clearTimeout(timer);
					if (gameplayStarted) Wrapper.gameplayStart();
					Wrapper.unmute();
					resolve(...args);
				});
			});
		},
		onAdStarted(fn) {
			listen("adStarted", fn);
		},
		hasAds() {
			return currentSdk && currentSdk.hasAds ? 1 : 0;
		},
	};
	return Wrapper;
})();

function initWebSdkWrapper(runtime, network = "", debug = false) {

	let WebSdkWrapper = globalThis.WebSdkWrapper;
	let postInit = () => {
		WebSdkWrapper.onPause(() => {
			runtime.callFunction("M_Monetisation_Pause");
		});
		WebSdkWrapper.onResume(() => {
			runtime.callFunction("M_Monetisation_Resume");
		});
		WebSdkWrapper.onMute(() => {
			runtime.callFunction("M_Monetisation_Mute");
		});
		WebSdkWrapper.onUnmute(() => {
			runtime.callFunction("M_Monetisation_Unmute");
		});
		WebSdkWrapper.onAdStarted(() => {
			runtime.callFunction("M_Monetisation_AdStarted");
		});
		runtime.callFunction("M_Monetisation_LoadingStart");
	};

	WebSdkWrapper.init(network, !!debug, {}).then(postInit);
}


// 7. RuntimeMixin

let tickCallbacks = {}
let tickId = 0

function Tick(runtime){
	//console.log('Tick')
	Object.values(tickCallbacks).forEach(fn => {
		fn()
	})
}

const BASE_CASH_POOL = 50;

let saveData = new SaveData(staticData, new FastBigInt(0,0, 0), Object.keys(language));

function calculateArithmeticoGeometricTerm(a, b, u0, n) {
	if (a === 1){
		return u0 + b * n;
	}
	let r = b/(1-a);
	return Math.round(Math.pow(a, n) * (u0-r) + r);
}

const RuntimeMixin = {
	startCoroutine(coroutine) {
		const coroutineId = tickId++
		return new Promise((resolve, reject) => {
			function progress(){
				let ret = coroutine.next()
				if(ret.done){
					resolve()
					delete tickCallbacks[coroutineId]
				} else {
					let promise
					let usePromise = true
					if(ret.value instanceof Promise){
						promise = ret.value
					} else if(ret.value instanceof CoroutineYield) {
						promise = ret.value.process()
					}

					if(promise != undefined){
						delete tickCallbacks[coroutineId]
						promise.then(()=>{
							tickCallbacks[coroutineId] = progress
							progress()
						})
					}
				}
			}
			tickCallbacks[coroutineId] = progress
			progress()
		})
	},
	getNextSpecialAntPopUp() {
		let antsToPopUp = Object.keys(this.saveData.specialAnts).filter(key => this.saveData.specialAnts[key].needPopUp);
		if (antsToPopUp.length === 0) return null;
		const ant = this.saveData.specialAnts[antsToPopUp[0]];
		ant.needPopUp = false;
		return ant;
	},
	getNbAvailableSpecialAnts() {
		let availableAnts = Object.keys(this.saveData.specialAnts).filter(key => this.saveData.specialAnts[key].isAvailable(this) || this.saveData.specialAnts[key].inUse)
		return availableAnts.length;
	},
	getAvailableSpecialAntProfile() {
		let availableAnts = Object.keys(this.saveData.specialAnts).filter(key => this.saveData.specialAnts[key].isAvailable(this))
		if (availableAnts.length === 0) return "";
		let selectedAnt = availableAnts[Math.floor(Math.random() * availableAnts.length)];
		this.saveData.specialAnts[selectedAnt].onUsed();
		return selectedAnt;
	},
	boostRandomSpecialAnt() {
		let unavailableAnts = Object.keys(this.saveData.specialAnts).filter(key => this.saveData.specialAnts[key].isInCooldown())
		if (unavailableAnts.length === 0) return;
		let selectedAnt = unavailableAnts[Math.floor(Math.random() * unavailableAnts.length)];
		this.saveData.specialAnts[selectedAnt].onBoost(this);
	},
	profileCameBackToHole(profile) {
		let ant = this.saveData.specialAnts[profile];
		if (!!ant) {
			ant.onEnterHole(this);
		}
	},
	watchSpecialAntRewarded(profile) {
		let ant = this.saveData.specialAnts[profile];
		if (!!ant) {
			ant.watchRewarded(this);
		}
	},
	getSpecialAntUnlocked(profile) {
		return !!saveData.specialAnts[profile] && !!saveData.specialAnts[profile].unlocked;
	},
	computeProfileMultiplier(profile, fnName, input) {
		if (!staticData.specialAnts.hasOwnProperty(profile)) return input;
		
		let fn = staticData.specialAnts[profile][fnName];
		if (typeof fn === "function") return fn(input);
		
		return input;
	},
	getProfileValue(profile, key, def) {
		if (
			!staticData.specialAnts.hasOwnProperty(profile) 
		 || !staticData.specialAnts[profile].hasOwnProperty(key)
		) {
		  return def;
		}
		
		return staticData.specialAnts[profile][key];
	},
	getLanguage(key, params) {
		let languageKey = language[saveData.language][key];
		if (languageKey && typeof languageKey === "function") return languageKey(...params);
		return languageKey.toString();
	},
	keyExists(key) {
		let languageKey = language[saveData.language][key];
		if (languageKey && typeof languageKey !== "function") return true;
		return false;
	},
	setLanguage(lang) {
		saveData.setLanguage(lang);
	},
	getCurLang() {
		return saveData.language;
	},
	getNbLangs() {
		return saveData.langs.length;
	},
	getLangAt(id) {
		if (id >= 0 && id < saveData.langs.length)
			return saveData.langs[id];
		return "en"
	},
	addBaseCashPool() {
		this.money().add(BASE_CASH_POOL);
	},
	initWebSdkWrapper,
	saveData,
	staticData,
	getEndOfLevelBonus(id) {
		const levels = this.staticData.worlds[this.curWorldId()].levels;
		id = ((id%levels.length) + levels.length)%levels.length;
		const money = levels[id].money();
		return Math.round(money * 0.1);
	},
	money() {return this.saveData.money},
	formatPrice(price) {return new FastBigInt(0, 0, price).toString()},
	curWorldId() {return this.saveData.curWorldId},
	curWorld() {return this.saveData.worlds[this.curWorldId()]},
	curLevelId() {
		return this.curWorld().curLevel;
	},
	curLevel() {
		return this.staticData.worlds[this.curWorldId()].levels[this.curWorld().curLevel];
	},
	lerp(start, end, x){
	  return (1 - x) * start + x * end;
	},
	unlerp(start, end, x){
	  return (x - start) / (end - start);
	},
	welcomeBackIncome() {
		let now = Date.now();
		let lastDate = this.saveData.timestamp;
	},
	getAllPassiveIncome(includeCurWorld = false) {
		let ret = 0;
		this.saveData.worlds.forEach((world, i) => {
			if (!world.unlocked || (i === this.curWorldId() && !includeCurWorld)) return;
			ret += this.passiveIncomePerMinute(i);
		})
		return ret;
	},
	addPassiveIncome() {
		this.money().add(Math.round(this.getAllPassiveIncome()/90));
	},
	passiveIncomePerMinute(worldId) {
		if (worldId === undefined) worldId = this.curWorldId();
		let world = this.saveData.worlds[worldId];
		let nbAnts = world.workerLevel + 1;
		let antSpeed = world.speedLevel;
		let moneyPerFrag = world.staticData.moneyPerFragment;
		
		return Math.round(moneyPerFrag * nbAnts * (this.lerp(2, 20, this.unlerp(0, 100, antSpeed))));
	},
	getWelcomeBackAmount() {
		return Math.round(this.saveData.awayTime() * this.getAllPassiveIncome(true));
	},
	moneyBag(amount) {
		this.money().add(Math.round(amount));
	},
	eatBit(double = false, profile) {
		globalThis._isLevelNextRunning = false;
		let money = this.curWorld().eatBit(this.globalVars.G_AB_FragmentBoost);
		money = this.computeProfileMultiplier(profile, "moneyFunction", money);
		this.money().add(double? money * 2: money);
	},
	workerUpgradePrice(worldId, upgradeLevel) {
		let a = 1.115;
		let b = 4;
		let u0 = 5;
		let price = calculateArithmeticoGeometricTerm(a, b, u0, upgradeLevel);
		return Math.pow(10, worldId) * price;
	},
	speedUpgradePrice(worldId, upgradeLevel) {
		let a = 1.165;
		let b = 7;
		let u0 = 10;
		let price = calculateArithmeticoGeometricTerm(a, b, u0, upgradeLevel);
		return Math.pow(10, worldId) * price;
	},
	strengthUpgradePrice(worldId, upgradeLevel) {
		let a = 1.85;
		let b = 450;
		let u0 = 300;
		let price = calculateArithmeticoGeometricTerm(a, b, u0, upgradeLevel);
		return Math.pow(10, worldId) * price;
	},
	eatingDuration(upgradeLevel) {
		let a = 1;
		let b = -0.1;
		let u0 = 4;
		let value = calculateArithmeticoGeometricTerm(a, b, u0, upgradeLevel);
		return Math.max(value, 0.1);
	},
	spawnDuration(upgradeLevel) {
		let a = 1;
		let b = -0.02;
		let u0 = 0.6;
		let value = calculateArithmeticoGeometricTerm(a, b, u0, upgradeLevel);
		return Math.max(value, 0.05);
	},
	speedValue(upgradeLevel) {
		let a = 1;
		let b = 0.27;
		let u0 = 1.8;
		let value = calculateArithmeticoGeometricTerm(a, b, u0, upgradeLevel);
		return value * 1.3;
	},
}

runOnStartup(async runtime =>
			 {
	// Code to run on the loading screen
	runtime.addEventListener("tick", () => Tick(runtime));
	extend(runtime, RuntimeMixin);
	globalThis.runtime = runtime
});

function extend(obj1, obj2){
	Object.keys(obj2).forEach(key => {
		if(obj1.hasOwnProperty(key) || obj1.__proto__.hasOwnProperty(key)){
			console.warn("key " + key + " already exists")
			delete obj2[key]
		}
	})
	Object.assign(obj1, obj2);
}

/* RuntimeMixin exported */

// 8. Main Project Entry

// Import any other script files here, e.g.:
// import * as myModule from "./mymodule.js";
//import "./vconsole.js"

let globalRuntime = null;
let lastAutoSaveTime = Date.now();

runOnStartup(async runtime =>
{
	globalRuntime = runtime;
	// Code to run on the loading screen.
	// Note layouts, objects etc. are not yet available.
	
	// Register ByteDance MiniGame lifecycle save
	try {
		if (typeof tt !== "undefined" && tt.onHide) {
			tt.onHide(() => {
				console.log("[IdleAnts] App hidden, auto-saving data...");
				try {
					if (globalRuntime && globalRuntime.saveData) {
						const data = globalRuntime.saveData.save();
						tt.setStorageSync("idle_ants_savedata", data);
					}
				} catch (e) {
					console.warn("[IdleAnts] OnHide save error:", e);
				}
			});
		}
	} catch (e) {}

	runtime.addEventListener("beforeprojectstart", () => OnBeforeProjectStart(runtime));
});

async function OnBeforeProjectStart(runtime)
{
	// Code to run just before 'On start of layout' on
	// the first layout. Loading has finished and initial
	// instances are created and available to use here.
	
	runtime.addEventListener("tick", () => Tick(runtime));
}

let loadingStartTime = Date.now();
let hasTransitionedToLevel = false;

function Tick(runtime)
{
	// Code to run every tick
	if (!hasTransitionedToLevel && runtime.layout && runtime.layout.name === "Loading") {
		const elapsed = Date.now() - loadingStartTime;
		if (elapsed > 2000) {
			hasTransitionedToLevel = true;
			console.log("[IdleAnts Watchdog] Transitioning from Loading to Level...");

			// Attempt restoration from persistent storage if available
			if (typeof globalThis !== "undefined" && globalThis.SDKManager && globalThis.SDKManager.clearSaveOnStart) {
				console.warn("[IdleAnts] SDKManager.clearSaveOnStart 为 true，跳过恢复本地存档");
			} else {
				try {
					if (runtime.saveData) {
						let saved = null;
						if (typeof tt !== "undefined" && tt.getStorageSync) {
							saved = tt.getStorageSync("idle_ants_savedata");
						} else if (typeof localStorage !== "undefined") {
							saved = localStorage.getItem("idle_ants_savedata");
						}
						if (saved) {
							console.log("[IdleAnts] Restoring save data from persistent storage...");
							runtime.saveData.load(saved);
						}
					}
				} catch (e) {
					console.warn("[IdleAnts] Save restoration error:", e);
				}
			}

			try { runtime.callFunction("M_Save_MaybeLoadData"); } catch (e) {}
			try { runtime.callFunction("M_Monetisation_LoadingEnd"); } catch (e) {}
			try { runtime.callFunction("M_Monetisation_AdEnd", "loading complete"); } catch (e) {}
			try { runtime.goToLayout("Level"); } catch (e) {
				try { runtime.goToLayout(19); } catch (e2) {}
			}
		}
	}
}

// Post-tick hook called every frame right after C3 event sheets run and before Render()
self._idleAntsPostTick = function(c3Runtime) {
	try {
		if (!globalRuntime) return;

		// 1. Auto-save every 15 seconds
		const now = Date.now();
		if (now - lastAutoSaveTime > 15000) {
			lastAutoSaveTime = now;
			try {
				if (globalRuntime.saveData) {
					const data = globalRuntime.saveData.save();
					if (typeof tt !== "undefined" && tt.setStorageSync) {
						tt.setStorageSync("idle_ants_savedata", data);
					} else if (typeof localStorage !== "undefined") {
						localStorage.setItem("idle_ants_savedata", data);
					}
				}
			} catch (e) {}
		}

		// 2. Reposition Top UI bars: Money on left (Box 1), Ants right next to it (Box 2)
		const uiBars = globalRuntime.objects.UIBar ? globalRuntime.objects.UIBar.getAllInstances() : [];
		if (!uiBars || uiBars.length < 2) return;

		let moneyBar = null;
		let antBar = null;
		for (const b of uiBars) {
			const isAnt = b.uid === 21 ||
				b.animationName === "Animation 2" ||
				(b._instVarValues && b._instVarValues[0] === 1);
			if (isAnt) antBar = b;
			else moneyBar = b;
		}
		if (!moneyBar || !antBar) return;

		const uiBarEnds = globalRuntime.objects.UIBarEnd ? globalRuntime.objects.UIBarEnd.getAllInstances() : [];
		if (!uiBarEnds || uiBarEnds.length < 2) return;

		let moneyEnd = null;
		let antEnd = null;
		for (const end of uiBarEnds) {
			if (end.uid === 22) {
				antEnd = end;
			} else if (end.uid === 26) {
				moneyEnd = end;
			} else if (!moneyEnd || end.x < moneyEnd.x) {
				if (moneyEnd) antEnd = moneyEnd;
				moneyEnd = end;
			} else {
				antEnd = end;
			}
		}

		// Box 1 (Money Bar): left anchored at x=0, width around 210-250px
		const moneyW = Math.min(250, Math.max(210, moneyBar.width));
		moneyBar.x = 0;
		moneyBar.width = moneyW;
		if (moneyEnd) {
			moneyEnd.x = moneyW;
		}

		// Visual right edge of Money Bar:
		// moneyEnd (origin=(1, 0.5), angle=PI) extends 128px to the right of moneyEnd.x
		const moneyRightEdge = (moneyEnd ? moneyEnd.x : moneyW) + 128;

		// User requirement: gap between the two bars should be 10~15px
		const GAP = 12; // 12px clean visual gap between Money right cap and Ants left cap

		// Box 2 (Ant Bar):
		// antEnd (origin=(1, 0.5), angle=0) extends 128px to the LEFT of antEnd.x (from antEnd.x - 128 to antEnd.x)
		// To ensure (antEnd.x - 128) - moneyRightEdge === GAP:
		// antEnd.x = moneyRightEdge + GAP + 128
		const antStartX = moneyRightEdge + GAP + 128;

		// User requested: shrink ant bar to match red box in screenshot (width ~218px visual total)
		// antEnd takes 128px on the left cap, so antBar body is 90px wide (total visual 128 + 90 = 218px)
		const antW = 90;
		if (antEnd) {
			antEnd.x = antStartX;
		}
		antBar.width = antW;
		// Origin of antBar is 1 (mirrored), so right edge is at antStartX + antW
		antBar.x = antStartX + antW;

		// Move child UIText and BarIcon inside the compact ant bar [antStartX - 128, antStartX + antW]
		const uiTexts = globalRuntime.objects.UIText ? globalRuntime.objects.UIText.getAllInstances() : [];
		for (const t of uiTexts) {
			if (t.uid === 24) {
				// UIText is right-aligned with origin 0.5 (width 266).
				// Right edge aligns to t.x + 133.
				// We want right edge to be at antStartX - 10 (just left of the ant icon):
				// t.x = antStartX - 10 - 133 = antStartX - 143.
				t.x = antStartX - 143;
			}
		}
		const barIcons = globalRuntime.objects.BarIcon ? globalRuntime.objects.BarIcon.getAllInstances() : [];
		for (const ic of barIcons) {
			if (ic.uid === 54) {
				// Ant icon inside the right portion of the compact bar
				ic.x = antStartX + 45;
				ic.width = 65;
				ic.height = 65;
			} else if (ic.uid === 198) {
				// Keep money icon (cash) anchored within the money rounded cap
				ic.x = (moneyEnd ? moneyEnd.x : moneyW) + 24;
			}
		}

		// 3. Fix Upgrade Button left drift on repeated fast taps:
		// Cache fixed layout home coordinates (Speed: 214.775, Workers: 539.775, Strength: 865.775)
		// and ensure buttons return to home position when not actively playing shake animation
		const uiButtons = globalRuntime.objects.UIButton ? globalRuntime.objects.UIButton.getAllInstances() : [];
		for (const btn of uiButtons) {
			let homeX = 539.775;
			if (btn.uid === 11 || btn.uid === 72) homeX = 214.775;
			else if (btn.uid === 10 || btn.uid === 71) homeX = 539.775;
			else if (btn.uid === 9 || btn.uid === 70) homeX = 865.775;
			else if (typeof btn._baseHomeX === "number" && !isNaN(btn._baseHomeX)) homeX = btn._baseHomeX;
			else if (typeof btn.x === "number" && !isNaN(btn.x)) homeX = btn.x;

			btn._baseHomeX = homeX;

			// If button position is NaN, restore it immediately to home coordinate
			if (isNaN(btn.x)) {
				btn.x = homeX;
			}

			// If not actively shaking and position is off, restore to home position
			const isShaking = (btn._shakeEndTime && Date.now() < btn._shakeEndTime);
			if (!isShaking && Math.abs(btn.x - homeX) > 0.01) {
				btn.x = homeX;
			}
		}

		// 4. Ensure M_Food_SlideAnimEnd is released and ant creation never stalls after level food switch
		if (c3Runtime && typeof c3Runtime.GetEventSheetManager === "function") {
			const esm = c3Runtime.GetEventSheetManager();
			if (esm && esm.scheduledWaits) {
				for (const w of esm.scheduledWaits()) {
					if (w && typeof w.IsSignal === "function" && w.IsSignal()) {
						const tag = String(w.GetSignalTag()).toLowerCase();
						if (tag === "m_food_slideanimend" || tag === "snapshot") {
							w.SetSignalled();
						}
					}
				}
			}
		}

	} catch (e) {
		// Silent safety fallback
	}
};


if (typeof module !== 'undefined') {
    module.exports = RuntimeMixin;
}
