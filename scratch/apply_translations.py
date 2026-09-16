import json
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

corrected_zh = {
    "tutorial": {
        "seq_1": "欢迎来到披萨塔的世界！",
        "seq_2": "组建属于你的专属披萨外送系统",
        "seq_3": "点击金币按钮建造新的厨房楼层",
        "seq_4": "太棒了！",
        "seq_5": "厨师已经开始烘烤美味披萨啦",
        "seq_6": "但过一段时间他们就会偷懒哦",
        "seq_7": "点击高亮区域聘请楼层主管",
        "seq_9": "干得漂亮！",
        "seq_10": "点击电梯将做好的披萨运送下去",
        "seq_11": "太好了！",
        "seq_12": "外卖骑手会立即把披萨配送给顾客",
        "seq_13": "全面升级设施，获取丰厚收益！",
        "seq_14": "还可以玩骰子对决赚取更多金币",
        "seq_15": "祝你生意兴隆！"
    },
    "buttons": {
        "watch_video_ad": "看视频广告",
        "no_thanks": "不用了",
        "claim": "领取奖励",
        "home": "主页",
        "concede": "认输",
        "resume": "继续游戏",
        "unlock": "解锁",
        "quit": "退出",
        "start_match": "开始对决",
        "dice_game": "骰子对决",
        "boost": "一键加速"
    },
    "ingame": {
        "common": {
            "reach_to_level": "升级至等级",
            "for_reward": " 即可领取奖励",
            "get_reward_for_manager": "聘请主管领取奖励",
            "mine_no": "楼层",
            "add_new_mine": "开辟新楼层"
        },
        "perks": {
            "production": "收益",
            "reduction": "成本",
            "winnings": "额外奖金"
        },
        "tunnel": {
            "header": "厨房楼层",
            "level": "- 等级",
            "manager": "楼层主管",
            "manager_level": "楼层主管 - 等级"
        },
        "elevator": {
            "header": "电梯 - 等级",
            "manager": "电梯主管",
            "manager_level": "电梯主管 - 等级"
        },
        "warehouse": {
            "header": "外送中心 - 等级",
            "manager": "外送主管",
            "manager_level": "外送主管 - 等级"
        },
        "stats": {
            "cps": "每秒金币 (CPS)",
            "pps": "每秒披萨产量 (PPS)",
            "workers_tunnel": "烘烤厨师",
            "workers_warehouse": "外卖骑手",
            "storage_elevator": "电梯载重上限",
            "move_speed": "移动速度",
            "work_speed_tunnel": "烘烤速度",
            "work_speed_elevator": "运送速度",
            "work_speed_warehouse": "打包配送速度",
            "load_capacity_tunnel": "单次出炉量",
            "load_capacity_elevator": "单次运载量",
            "load_capacity_warehouse": "骑手携带上限"
        },
        "manager": {
            "hire_manager": "聘请主管",
            "upgrade_manager": "主管晋升",
            "boost_miners": "厨师极速烘烤",
            "boost_elevator": "电梯极速运送",
            "boost_warehouse": "骑手狂飙配送",
            "text_1": "主管可自动督促员工工作",
            "text_2": "并大幅提高工作效率",
            "boost_available": "加速冷却时间：",
            "seconds": "秒"
        }
    },
    "common": {
        "coins": " 金币",
        "pizzas": " 个披萨",
        "level": "等级",
        "upgrade": "升级",
        "max_level": "满级",
        "max_level_achieved": " 已达满级"
    },
    "unlock": {
        "header": "🎉 解锁新楼层！",
        "sub_header": "升至等级 "
    },
    "life": {
        "header": "看视频立即补满体力"
    },
    "offline": {
        "header": " 挂机离线收益",
        "sub_header": "在您休息时，员工们依然在勤劳烘烤披萨！"
    },
    "ge": {
        "text_1": "本局获胜金币",
        "text_2": "本局扣除金币",
        "text_3": "关闭拦截器即可领取",
        "text_4": "看视频即可获得",
        "text_5": "恭喜获得奖励："
    },
    "shop": {
        "header": " 披萨商城",
        "production": {
            "header": " 全局金币产出",
            "details": " 金币产出效率提升 ",
            "details_max": " 金币产出累计提升 "
        },
        "reduction": {
            "header": " 升级建造特惠",
            "details": " 建筑与升级花费降低 ",
            "details_max": " 建筑与升级花费已降低 "
        },
        "winnings": {
            "header": " 骰子奖池暴击",
            "details": " 骰子对决获胜金币增加 ",
            "details_max": " 骰子对决获胜金币累计增加 "
        },
        "free_gems": {
            "header": " 免费钞票",
            "details": " 观看视频领 10 钞票"
        }
    },
    "achievements": {
        "header": " 成就勋章",
        "coins_collector": {
            "header": " 披萨大亨",
            "details": " 累计送出 ",
            "details_max": " 你已成为声名显赫的披萨大亨！"
        },
        "production_unlocker": {
            "header": " 烘烤宗师",
            "details": " 厨房楼层升至等级 ",
            "details_max": " 恭喜！您已开辟并解锁所有楼层！"
        },
        "storage_unlocker": {
            "header": " 运输工程大师",
            "details": " 电梯升至等级 ",
            "details_max": " 你已经打造出最高效的自动化披萨塔！"
        },
        "warehouse_unlocker": {
            "header": " 极速外送王者",
            "details": " 外送前台升至等级 ",
            "details_max": " 订单爆满！您的披萨风靡全城！"
        }
    },
    "deposit": {
        "header": "下注金币",
        "sub_header": "请选择您要下注的金币数量",
        "details": "获胜可得奖金："
    },
    "concede": {
        "header": "放弃比赛",
        "sub_header": "确定要认输并放弃本场对决吗？"
    },
    "dg": {
        "you": "我方",
        "opponent": "对手",
        "pawns_left": "剩余棋子",
        "welldone": "太棒了！",
        "cannot_move": "无有效走法",
        "time_out": "思考超时！"
    }
}

target_files = [
    "reverse/pizza-tower-tt-minigame/data/localisation.json",
    "reverse/pizza-tower-tt-minigame/localisation.json",
    "Noad-freelinks/pizza_tower/localisation.json",
    "reverse/pizza_tower_package/localisation.json"
]

for tf in target_files:
    if os.path.exists(tf):
        with open(tf, "r", encoding="utf-8") as f:
            data = json.load(f)
        data["zh"] = corrected_zh
        with open(tf, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
        print(f"✓ Updated translations in: {tf}")
    else:
        print(f"✗ File not found: {tf}")

print("All localization files have been successfully updated!")
