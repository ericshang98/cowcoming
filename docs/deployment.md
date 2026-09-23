# 代码同步与网站发布

## 唯一入口

源码、产品快照、开发规则和发布工作流统一保存在私有仓库 `ericshang98/cowcoming`。换电脑通过 Git 同步；网站由 GitHub Actions 将同一提交的构建上传到现有 Cloudflare Pages 项目。

| 项目 | 值 |
| --- | --- |
| 源码仓库 | https://github.com/ericshang98/cowcoming |
| 主域名 | https://cowcoming.world/ |
| Cloudflare 账户 ID | `2dda3e857959219ddd0bd2bf990bd7a1` |
| Pages 项目 | `niulai-preview-20260922` |
| Pages 地址 | https://niulai-preview-20260922.pages.dev/ |
| 旧域名 | https://niulai.nexting.design/ |
| 生产分支 | `main` |
| 工作流 | `.github/workflows/ci.yml` — Verify and publish Cowcoming |
| 构建 / 输出 | `npm run build` / `dist/` |
| 线上版本 | https://cowcoming.world/build-info.json |

当前 Cloudflare 项目是 Direct Upload，不能原地改为 Cloudflare 原生 Git integration。通过 GitHub Actions 直接上传即可连接 Git 与网站，不需要迁移项目或改 DNS。官方依据：[Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/)、[Direct Upload with CI](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/)。

## 首次启用状态（2026-09-23）

发布工作流已加入仓库；**在配置下面的 Secret 和启用变量之前，main 只完成检查和保存构建，deploy 作业跳过，不会声称网站已更新。** 本次检查时 cowcoming 仓库还没有 Cloudflare Secret，本机 Wrangler 也未登录。旧 pinclaw-dev 仓库中的 Secret 不能从 GitHub 读取或自动迁移。

一次性配置：

1. 在 [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens) 创建专用 Token，权限仅需本账户的 `Account / Cloudflare Pages / Edit`。不要放进源码或聊天。
2. 在 [本仓库 Actions Secrets](https://github.com/ericshang98/cowcoming/settings/secrets/actions) 保存为 `CLOUDFLARE_API_TOKEN`。
3. 在 [本仓库 Actions Variables](https://github.com/ericshang98/cowcoming/settings/variables/actions) 设置 `CLOUDFLARE_DEPLOY_ENABLED` 为 `true`。账户 ID 已固定在工作流，不需要再传给其他电脑。
4. 在 Actions 的 Verify and publish Cowcoming 中选择 Run workflow → main，等待首次发布和线上校验成功。

配置好一次之后，其他 Agent 的电脑只需要此私有仓库的 GitHub 权限；正常发布无需各自安装 Skill、登录 Cloudflare 或复制 Token。

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
