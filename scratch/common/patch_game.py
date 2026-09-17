game_path = r'D:\Desktop\REBench\reverse\perfect-landing-tt-minigame\game.js'
with open(game_path, 'r', encoding='utf-8') as f:
    text = f.read()

old_bridge = '''let bridgeName = null;
let readySent = false;

function notifyReady() {
  if (root.unityGame && bridgeName) {
    try {
      root.unityGame.SendMessage(bridgeName, "ready");
      readySent = true;
      console.log("[PokiBridge] 成功向 Unity GameObject 派发 ready 状态:", bridgeName);
    } catch (e) {}
  }
}

root.initPokiBridge = function (name) {
  bridgeName = name;
  console.log("[PokiBridge] 注册 Unity 桥接对象:", name);
  notifyReady();
  let count = 0;
  const timer = setInterval(function () {
    count++;
    if (readySent || count >= 3) {
      clearInterval(timer);
      return;
    }
    notifyReady();
  }, 300);
};'''

new_bridge = '''let bridgeName = null;
let readyTimer = null;

function notifyReady() {
  if (root.unityGame && bridgeName) {
    try {
      root.unityGame.SendMessage(bridgeName, "ready");
      console.log("[PokiBridge] 成功向 Unity GameObject 派发 ready 状态:", bridgeName);
    } catch (e) {}
  }
}

root.initPokiBridge = function (name) {
  bridgeName = name;
  console.log("[PokiBridge] 注册 Unity 桥接对象:", name);
  notifyReady();
  let count = 0;
  if (readyTimer) clearInterval(readyTimer);
  readyTimer = setInterval(function () {
    count++;
    notifyReady();
    if (count >= 25) {
      clearInterval(readyTimer);
      readyTimer = null;
    }
  }, 200);
};

// 交互手势保活唤醒 (对齐 Web 试玩版的 pointerdown/keydown 唤醒行为)
if (typeof tt !== 'undefined' && tt.onTouchStart) {
  tt.onTouchStart(function () {
    notifyReady();
  });
}'''

if old_bridge in text:
    text = text.replace(old_bridge, new_bridge, 1)
    print("Patched bridge in game.js!")
else:
    print("WARNING: old_bridge not found!")

with open(game_path, 'w', encoding='utf-8') as f:
    f.write(text)

print("Saved game.js successfully!")
