# Cowcoming / 牛来

牛来黑客松项目，当前网站为 React + Three.js 交互原型。

## 开始使用

| 你想做什么 | 从这里开始 |
| --- | --- |
| 直接体验牛来 | 打开 [WORK 页面](https://cowcoming.world/?section=work)，无需克隆源码 |
| 了解形态切换、自动进化和重置 | 阅读 [使用指南](docs/getting-started.md) |
| 接入自己的 JEV、语言模型或机械臂 | 先读 [硬件开发交接](docs/hardware-handoff.md)，再按 [设备 API 指南](docs/live-device.md) 联调 |
| 在自己的电脑运行或修改网页 | 按下方本地运行步骤开始 |

**连接设备后可用：**手动选择六种逻辑形态、调整进化周期、重置为小牛，以及密钥房间内的设备事件、视频与文本流接口。自动进化默认每 5 轮完整对话评估一次，但必须接入真实会话并配置符合合同的评估网关；独立形态模型和真实硬件仍需接入。预设示例不计入进化轮数。

## 项目资料

- 线上网站：https://cowcoming.world/
- 产品真源：[飞书产品文档](https://uxl9fceo481.feishu.cn/wiki/Ehc9w5bs1ic2gEkwZjCc8Eo1nmb)
- **给 AI / 新会话：先读 [AGENTS.md](AGENTS.md)。** Claude 的入口为 [CLAUDE.md](CLAUDE.md)。其他工具也请明确让它先读 AGENTS.md。
- [产品快照与更新](docs/product/README.md) · [项目现状](docs/project-context.md) · [部署说明](docs/deployment.md)

## 本地运行

仓库已公开，可直接 clone；准备 Node 24 和 Git：

```sh
git clone https://github.com/ericshang98/cowcoming.git
cd cowcoming
npm ci
npm run dev
```

打开终端输出的本地地址（默认 http://127.0.0.1:4178）。如已使用 nvm，可以先 `nvm install && nvm use`。端口被占用时用 `npm run dev -- --port 4189`，不要停止别人的进程。

在 Codex / Claude 中打开这个仓库目录作为项目；第一次可以直接说：**“先读 AGENTS.md 和产品文档，再开始本次任务。”** 文档、规则和源代码都在仓库中，不依赖这次聊天或本机 Skill。

仅运行网页不需要飞书、Cloudflare 登录或模型密钥。贡献代码时，没有仓库写权限的开发者可以先 fork，再向本仓库提交 PR。

换设备前提交并 push；另一台机器在干净工作区运行 `git pull --ff-only`，如果在开发分支则拉取对应分支。Git 不会同步未提交文件，也不会替另一台 Mac 自动执行 pull。GitHub、飞书和 Cloudflare 的登录在各设备单独完成。

## 常用命令

```sh
npm test          # 行为与模型控制单元测试
npm run build    # 生成 dist/
npm run preview  # 本地查看构建产物
npm run docs:sync # 可选：通过已授权 lark-cli 更新产品快照
```

`npm run qa:*` 是继承的浏览器验收脚本，运行前需本地服务器和 Chrome，并先 `mkdir -p .pwc`。部分脚本只支持默认 4178 端口，具体见脚本；它们不在 CI 自动运行。文档更新、普通开发和构建不要求安装飞书 CLI。

## 目录

| 路径 | 用途 |
| --- | --- |
| `src/` | 网页和 3D 场景 |
| `public/` | 模型、图片、字体等静态资源 |
| `tests/` | 行为逻辑、嘴型控制测试 |
| `docs/getting-started.md` | 面向使用者的操作和接入入口 |
| `examples/device/` | Python 设备示例与可替换的 JEV / 硬件 / 语言适配器 |
| `shared/` / `server/` | 实时协议与云端设备房间 |
| `docs/product/` | 飞书产品文档快照、来源与修订信息 |
| `docs/project-context.md` | 产品决策、实现边界、交接信息 |
| `docs/deployment.md` | Cloudflare 线上项目及发布步骤 |
| `docs/provenance/` | 原型来源和历史说明，不是当前产品规格 |

GitHub Actions 自动测试和构建。开发分支和 PR 只检查；配置发布密钥并启用后，`main` 通过检查会自动更新 `cowcoming.world`。Actions 也支持在 main 手动重新发布。首次启用步骤和当前状态见 [部署说明](docs/deployment.md)。线上版本可通过 `/build-info.json` 与 GitHub 提交核对。

其他电脑上的 Agent 统一使用本仓库：先 pull，创建 `codex/` 分支开发、测试并提交，再通过 PR 合并 main。不要在旧的原型目录继续维护另一份源码。原型中仍有旧模板内容，不能当成正式产品要求。

## 实时设备与自动进化

WORK 必须先绑定有效的网页密钥，并等待同一房间的本地设备上线，才会开放进化和实时面板。未绑定、等待设备或断线时显示连接引导；断线暂停计轮和评估，切换房间重新开始培养。

WORK 支持密钥设备房间、分形态提示词、JEV 动作到网页动画映射、WebRTC 视频/CV 和本机 LLM 文本流。JEV 负责选择动作，角色 LLM 负责回复，独立评估 LLM 负责判断是否进化。

- [设备 API 指南](docs/live-device.md)：创建房间、运行模拟示例、替换适配器。Python 套件由 `npm run dev` / `npm run build` 生成至 `public/downloads`；`npm run test:relay` 运行隔离的 Worker 集成检查。
- [进化运行合同](docs/evolution-runtime.md)：完整对话计轮、评估网关请求与返回格式、手动切换和重置。评估 API 必须实现这个合同，不能直接填入任意厂商聊天 API。
- [最新动作交接](docs/hardware-handoff.md)：五种基础回应的目标定义与当前运行协议的差距；接入时按已实现协议联调。

网页使用 `browserKey`，设备程序使用 `deviceKey`；两者由房间管理员分别提供。公开源码不包含房间密钥、模型密钥或生产管理权限。

