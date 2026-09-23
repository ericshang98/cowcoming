# Cowcoming / 牛来

牛来黑客松项目，当前网站为 React + Three.js 交互原型。

- 线上网站：https://cowcoming.world/
- 产品真源：[飞书产品文档](https://uxl9fceo481.feishu.cn/wiki/Ehc9w5bs1ic2gEkwZjCc8Eo1nmb)
- **给 AI / 新会话：先读 [AGENTS.md](AGENTS.md)。** Claude 的入口为 [CLAUDE.md](CLAUDE.md)。其他工具也请明确让它先读 AGENTS.md。
- [产品快照与更新](docs/product/README.md) · [项目现状](docs/project-context.md) · [部署说明](docs/deployment.md)

## 在另一台 Mac 开发

使用有此私有仓库权限的 GitHub 账号登录，准备 Node 24 和 Git：

```sh
git clone https://github.com/ericshang98/cowcoming.git
cd cowcoming
npm ci
npm run dev
```

打开终端输出的本地地址（默认 http://127.0.0.1:4178）。如已使用 nvm，可以先 `nvm install && nvm use`。端口被占用时用 `npm run dev -- --port 4189`，不要停止别人的进程。

在 Codex / Claude 中打开这个仓库目录作为项目；第一次可以直接说：**“先读 AGENTS.md 和产品文档，再开始本次任务。”** 文档、规则和源代码都在仓库中，不依赖这次聊天或本机 Skill。

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
| `docs/product/` | 飞书产品文档快照、来源与修订信息 |
| `docs/project-context.md` | 产品决策、实现边界、交接信息 |
| `docs/deployment.md` | Cloudflare 线上项目及发布步骤 |
| `docs/provenance/` | 原型来源和历史说明，不是当前产品规格 |

GitHub Actions 自动测试和构建。开发分支和 PR 只检查；配置发布密钥并启用后，`main` 通过检查会自动更新 `cowcoming.world`。Actions 也支持在 main 手动重新发布。首次启用步骤和当前状态见 [部署说明](docs/deployment.md)。线上版本可通过 `/build-info.json` 与 GitHub 提交核对。

其他电脑上的 Agent 统一使用本仓库：先 pull，创建 `codex/` 分支开发、测试并提交，再通过 PR 合并 main。不要在旧的原型目录继续维护另一份源码。原型中仍有旧模板内容，不能当成正式产品要求。
