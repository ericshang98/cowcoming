# 代码同步与网站发布

## 2026-09-24 发布核对与断线修复

本次实读生产状态：主域名发布提交为 `1a66bcce3d0e2c964310c669868367f8b4e5cb5c`，Worker 版本为 `dc4b0970-18ac-429e-958f-207d9e70adec`，已包含五动作协议、设备能力声明、六形态人格和 `interaction.start`。这些结果取代本文较早的待发布判断。GitHub `CLOUDFLARE_DEPLOY_ENABLED` 变量仍未配置，不能把合并等同于自动发布。

本次补修仅改变 Worker 异常关闭后的离线通知；网页保留当前主分支的动画完整播放规则，无需用旧联调构建覆盖生产页面。使用项目方提供的账户 API Token，经 `CLOUDFLARE_API_TOKEN` 和 `CLOUDFLARE_ACCOUNT_ID` 传给 Wrangler；这是 API 认证，不是网页登录。Token 不进入仓库、网页构建或 GitHub Secret，保留已有 `ADMIN_KEY` 和 Durable Object 房间。

发布前检查：Node 24 的 98 项测试、生产构建、独立 Worker 集成回归通过。发布后应核对 Cloudflare 当前版本、Worker 下载代码和健康接口，并确认主域名构建版本保持预期。原设备房间与真实硬件验收另行记录，不用临时房间或合成测试代替。

## 唯一入口

源码、产品快照、开发规则和发布工作流统一保存在公开仓库 `ericshang98/cowcoming`。换电脑通过 Git 同步；网站由 GitHub Actions 将同一提交的构建上传到现有 Cloudflare Pages 项目。

| 项目 | 值 |
| --- | --- |
| 源码仓库 | https://github.com/ericshang98/cowcoming |
| 主域名 | https://cowcoming.world/ |
| Cloudflare 账户 ID | `2dda3e857959219ddd0bd2bf990bd7a1` |
| Pages 项目 | `niulai-preview-20260922` |
| Pages 地址 | https://niulai-preview-20260922.pages.dev/ |
| 已停用旧域名 | `niulai.nexting.design`（Pages 绑定已移除） |
| 生产分支 | `main` |
| 工作流 | `.github/workflows/ci.yml` — Verify and publish Cowcoming |
| 构建 / 输出 | `npm run build` / `dist/` |
| 线上版本 | https://cowcoming.world/build-info.json |

当前 Cloudflare 项目是 Direct Upload，不能原地改为 Cloudflare 原生 Git integration。通过 GitHub Actions 直接上传即可连接 Git 与网站，不需要迁移项目或改 DNS。官方依据：[Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/)、[Direct Upload with CI](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/)。

## 旧域名下线（2026-09-23）

Eric 明确要求停用 `niulai.nexting.design`。已删除它在现有 Pages 项目中的自定义域名绑定；`cowcoming.world` 与 `www.cowcoming.world` 保持 active，生产部署 ID 未改变。以后使用主域名，不再恢复旧域名绑定，也不调用旧仓库中会重建此绑定的临时发布步骤。

当前 Wrangler OAuth 没有 DNS 读取/编辑权限，DNS 记录尚未核验或删除；这与已完成的 Pages 绑定移除分别记录。后续通过具有 DNS 权限的 Cloudflare 管理入口，仅清理 `niulai.nexting.design` 对应记录，不删除整个 `nexting.design` 区域或其他子域名。

## 当前发布状态（2026-09-23）

硬件接入 PR #2 已合并。经 Eric 授权，本机完成 Cloudflare OAuth，已把 `9a3e362` 发布到原 Pages 项目，并核对主域名提交 SHA 与入口 JS/CSS 哈希。实时 Worker 已单独发布到 https://cowcoming-live.shangyiyong98.workers.dev ，服务端 ADMIN_KEY 已配置；生产环境已通过鉴权、提示词确认、动作/文本同步、信令、重连、密钥撤销及浏览器直连合成视频/CV 验证。真实硬件接入仍见 [接口说明](live-device.md)。当前线上版本始终以 [build-info.json](https://cowcoming.world/build-info.json) 为准。

**这次是本机授权发布，GitHub 自动发布仍未启用。** 仓库已设置公开变量 `COWCOMING_RELAY_URL`，但没有 `CLOUDFLARE_API_TOKEN` Secret 或 `CLOUDFLARE_DEPLOY_ENABLED=true`。本机 OAuth 不会自动变成 GitHub Actions 凭据。不要把“合并 main”直接写成“网站已更新”。

下述 Actions 工作流只发布 Pages；修改实时服务时，还需按 [Worker 部署步骤](live-device.md#部署到现有网站) 单独部署 Worker。Pages/Edit Token 不具有 Workers 部署权限。生产连接密钥仅保存在私密交接文件中，不进入 Git、构建产物或文档。

## 进化控制发布（2026-09-23）

PR #3 已合并并发布提交 `55c2bcece553ae8d8c8ac3ba39fe61ad451b2b0e`。Pages 发布回执为 `https://6a6493da.niulai-preview-20260922.pages.dev`；主域名提交 SHA、干净构建状态与入口 JS/CSS 哈希匹配。生产浏览器验证默认 5 轮设置、手动切形态、重置回小牛，无运行异常。此前 `9a3e362` 是上一版发布。

实时 Worker 同步发布版本 `0d7264ea-92a6-4c43-8839-e4868ffd320f`，保留原房间、授权和 WebRTC 接口，新增语言 commandId 关联及形态变更来源。56 项 Node 测试、4 项 Python 测试、独立 Worker 集成和桌面／手机浏览器检查通过。真实评估 LLM 与网关仍待配置；页面未配置时不伪造自动进化，模拟数据不计轮。GitHub 自动发布仍未启用，本次使用已授权的本机 OAuth。

## GitHub 自动发布的首次配置

发布工作流已加入仓库；**在配置下面的 Secret 和启用变量之前，main 只完成检查和保存构建，deploy 作业跳过，不会声称网站已更新。** 旧 pinclaw-dev 仓库中的 Secret 不能从 GitHub 读取或自动迁移。

一次性配置：

1. 在 [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens) 创建专用 Token，权限仅需本账户的 `Account / Cloudflare Pages / Edit`。不要放进源码或聊天。
2. 在 [本仓库 Actions Secrets](https://github.com/ericshang98/cowcoming/settings/secrets/actions) 保存为 `CLOUDFLARE_API_TOKEN`。
3. 在 [本仓库 Actions Variables](https://github.com/ericshang98/cowcoming/settings/variables/actions) 设置 `CLOUDFLARE_DEPLOY_ENABLED` 为 `true`。账户 ID 已固定在工作流，不需要再传给其他电脑。
4. 在 Actions 的 Verify and publish Cowcoming 中选择 Run workflow → main，等待首次发布和线上校验成功。

配置好一次之后，其他 Agent 的电脑只需要此仓库的 GitHub 写入权限；正常发布无需各自安装 Skill、登录 Cloudflare 或复制 Token。

可用 GitHub CLI 查看是否完成设置（只显示名称，不显示密钥）：

```sh
gh secret list --repo ericshang98/cowcoming
gh variable get CLOUDFLARE_DEPLOY_ENABLED --repo ericshang98/cowcoming
```

## 其他电脑日常开发

```sh
git clone https://github.com/ericshang98/cowcoming.git
cd cowcoming
# 已克隆的仓库先提交/保存本机工作，再在干净的 main 上拉取：
git switch main
git pull --ff-only
# 先让 Agent 阅读 AGENTS.md 及其指定文档。
git switch -c codex/my-change
npm ci
npm run dev
```

改完执行 `npm test`、`npm run build`，并对改动做浏览器验证。提交并 push 当前分支，再创建 PR 合并到 main。开发分支和 PR 不会部署生产站点；启用后的 main 会自动发布，因此合并 main 就是发布动作。没有明确要求上线时，保留在开发分支/PR，不替 Eric 合并。

不要只修改构建目录、Cloudflare 上传包或旧电脑的原型副本；那样不会同步回仓库。Git 不同步未提交修改，也不会自动替另一台电脑 pull。

## 发布证据

工作流先 `npm ci`、测试、构建，再保存该提交的静态 artifact。deploy 作业仅下载这份已通过检查的产物，上传到既有 Pages 项目的 main 分支。分支发布串行执行，避免同一分支同时上传。

构建会生成 `build-info.json`，包含 Git 提交 SHA、构建时间和 dirty 标志。发布后脚本核对主域名的提交 SHA、干净状态及实际 JS/CSS 内容哈希；触发成功、构建成功或 Cloudflare 接收上传，都不能单独当作发布成功。

```sh
# 手动重发当前 main（仍会重新测试和构建）
gh workflow run ci.yml --repo ericshang98/cowcoming --ref main
gh run list --repo ericshang98/cowcoming --workflow ci.yml --limit 5
# 等待指定运行并检查结果
gh run watch <RUN_ID> --repo ericshang98/cowcoming --exit-status
```

部署失败时先看 Actions 中的失败步骤；不要修改 DNS 或换 Pages 项目。若只是域名校验延迟，先核对部署返回 URL 与主域名版本，再决定是否重发。

## 紧急手动发布与回退

仅在明确需要时，使用设备自己的 Cloudflare 授权发布已提交、无脏修改的版本：

```sh
npm ci
npm test
npm run build
npx wrangler@4.58.0 login
CLOUDFLARE_ACCOUNT_ID=2dda3e857959219ddd0bd2bf990bd7a1 \
  npx wrangler@4.58.0 pages deploy dist \
  --project-name niulai-preview-20260922 --branch main
npm run verify:deployment -- https://cowcoming.world "$(git rev-parse HEAD)"
```

需要停用自动发布时把 `CLOUDFLARE_DEPLOY_ENABLED` 设为 `false`。回退可在 Cloudflare 选择历史生产部署；之后将 Git 中的相应修改 revert 并正常提交，确保下一次 main 发布不会再次覆盖回错误版本。不 force-push main。

旧 `pinclaw-dev` 发布流程曾用于建站，其历史记录可供核对；后续优先用本仓库，不再从旧 Release 的固定 ZIP 部署。不要擅自修改其他仓库、联系或调度其他 Agent。


## 五动作集成发布待办（PR #14）

五形态 25 段回应动画、动作合同 2、显式旧房间升级及 Python 设备交付包在 PR #14。已通过本地构建、Node/Python、隔离 Worker 和浏览器联动测试；真实驱动由朋友提供。

本次本机 Wrangler 未认证，发起 OAuth 后等待授权超时，尚未部署 Worker 或 Pages。2026-09-23 核对主域名仍返回 `7f12f2e773dc2e02529d6f75dd5a2fe6932ed64b`；这个值仅记录核对时状态，后续以实时 build-info 为准。GitHub 自动部署未启用。恢复授权后先部署现有 cowcoming-live Worker，再从最新已合并干净提交构建、发布既有 Pages 项目，并核对主域名及五个模型哈希。不要仅凭 PR 合并判断线上升级完成。
