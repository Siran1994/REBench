import json
import os

def apply_text_translations(file_path):
    print(f"Translating {file_path}...")
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    replacements = [
        # UI headers
        ('[2,"Game Completion"]', '[2,"游戏完成度"]'),
        ('[2," / SEC"]', '[2,"/秒"]'),
        
        # Max text
        ('[2,"Max"]', '[2,"满级"]'),
        
        # Shop ad texts
        ('[2," Watch ad to get 10 cash"]', '[2," 观看视频获得10钞票"]'),
        ('[2," Free Cash available in "]', '[2," 距离获得免费钞票还剩 "]'),
        ('[2," Boost Available In \\n "]', '[2," 距离增益生效还剩 \\n "]'),
        
        # In-game loading tips
        ('[2,"You can earn extra coins by playing the dice game"]', '[2,"通过玩骰子游戏可以赚取额外金币"]'),
        ('[2,"If you go offline and come back later, you will still get the coins"]', '[2,"离线后再次进入游戏，依然可以获得金币收益"]'),
        ('[2,"Upgrading elevator and outlet is as much important as adding more floors "]', '[2,"升级电梯与出餐配送和扩建更多楼层同样重要"]'),
        ('[2,"Managers comes with perks as well which increses the workers effectiveness"]', '[2,"经理自带增益技能，能大幅提升员工的工作效率"]'),
        ('[2,"Use cash to purhcase powerful perks from shop"]', '[2,"使用钞票可在商城购买强力增益加成"]'),
        ('[2,"Going higher will increase the production of chefs"]', '[2,"建造更高楼层可以提高厨师的披萨产量"]'),
        
        # Dice game praise
        ('[2,"Good Job"]', '[2,"做得好"]'),
        ('[2,"Bravo"]', '[2,"太棒了"]'),
        ('[2,"Well Done"]', '[2,"干得漂亮"]'),
        ('[2,"Superb"]', '[2,"精彩绝伦"]')
    ]

    for target, repl in replacements:
        count = content.count(target)
        print(f"  {target} -> found {count} times")
        if count > 0:
            content = content.replace(target, repl)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"Finished {file_path}.")

apply_text_translations('data/data.json')
apply_text_translations('data/data.js')

# Validate data.json parses cleanly
with open('data/data.json', 'r', encoding='utf-8') as f:
    json.load(f)
print("data.json validated successfully!")
