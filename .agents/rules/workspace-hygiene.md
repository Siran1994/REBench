# REBench 工作区目录规范与产出物存放红线

本规则适用于在 `d:\Desktop\REBench` 工作区内的所有逆向、适配、调试及文档生成任务。所有 Agent 与开发者必须严格遵守以下文件存放路径规范，杜绝目录混乱。

---

## 核心产出物存放映射矩阵

| 产出物类别 | 唯一标准存放路径 | 命名格式规范 | 强制约束与红线 |
|---|---|---|---|
| **1. 原始交付安装包** | `apk/` | `apk/<game_name>.<apk\|xapk\|rar\|zip>` | 仅存放待分析原始压缩包，已被 git 忽略。严禁就地解压！ |
| **2. 原始解压资产工程** | `extracted/` | `extracted/<game_name>_package/` | 所有解压源码/APK内部Web静态文件必须统一放于此，严禁散落至 `reverse/` 或根目录！ |
| **3. 抖音小游戏工程成品** | `reverse/` | `reverse/<game_name>-tt-minigame/` | 小游戏成品唯一存放目录。内部必须遵循 `wasm/`、`data/`、`images/`、`media/` 4MB 分包规范。 |
| **4. 审计报告与复盘文档** | `reverse/docs/` | `PORTING_<GAME_NAME>.md`<br/>`<game_name>_audit.json` | 所有逆向报告、审计 JSON、架构复盘文档必须集中归档于 `reverse/docs/`，严禁放置于根目录。 |
| **5. 调试临时脚本与历史痕迹** | `scratch/` | `scratch/<game_name>/<script>.<py\|js>` | **【绝对红线】严禁在项目根目录或业务目录直接创建一次性排错脚本！** 所有临时补丁、探针、临时数据分析脚本必须存放于 `scratch/<game_name>/`。 |
| **6. CDN 免广告试玩版本** | `Noad-freelinks/` | `Noad-freelinks/<game_name>/` | 浏览器脱机试玩版本，必须在抖音端跑通后按需生成，配套统一入口 `启动所有免广告试玩.bat`。 |
| **7. 通用工具链与脚本** | `tools/` | `tools/<tool_name>.<py\|js\|exe>` | 存放全局可复用的命令行工具（`inspect_apk.py`、`validate-package.js`、`UnRAR.exe` 等），不存放单项目临时逻辑。 |

---

## 绝对禁止的行为（Anti-Patterns）

1. **严禁在根目录新建任何临时 `.py` / `.js` / `.json` 文件**（除 `.gitignore`, `README.md`, `LICENSE` 外，根目录不得有散落文件）。
2. **严禁将未解压包直接解压到 `reverse/`**（`reverse/` 仅用于存放移植成品的抖音小游戏工程 `*-tt-minigame` 与 `docs/`）。
3. **严禁在小游戏端调通前提前制作 `Noad-freelinks/`**（平台适配是核心里程碑，必须优先做抖音端）。
4. **排错脚本使用完后，必须保存在 `scratch/<game_name>/`**，以便后续追溯复盘，不得随意丢弃在根目录或工具目录。
