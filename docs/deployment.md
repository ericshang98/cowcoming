# Cloudflare Pages 部署

## 当前目标

| 项目 | 值 |
| --- | --- |
| 主域名 | `https://cowcoming.world/` |
| Cloudflare 账户 ID | `2dda3e857959219ddd0bd2bf990bd7a1` |
| Pages 项目 | `niulai-preview-20260922` |
| Pages 地址 | `https://niulai-preview-20260922.pages.dev/` |
| 旧临时域名 | `https://niulai.nexting.design/` |
| 生产分支 | `main` |
| 构建命令 / 输出 | `npm run build` / `dist/` |

这是已有的 Direct Upload 项目，尚未将此 GitHub 仓库接入自动生产部署。Git push 后只运行 CI，不会自动改变网站。

2026-09-23 已验证主域名 Active、SSL 启用且返回正常网页。`www.cowcoming.world` 已添加，但当时仍待验证，曾返回 522；使用前重新确认。域名注册商为 Namecheap，DNS 托管在 Cloudflare，权威 NS 为 `luciana.ns.cloudflare.com` / `newt.ns.cloudflare.com`。正常网站更新无需修改注册商、NS 或 DNS。

## 发布流程

在本仓库根目录操作。先确认当前提交是要上线的版本，工作区没有将被误带入的修改，并核对 Cloudflare 最新部署，避免覆盖其他人的更新。普通开发不自动执行发布。

```sh
npm ci
npm test
npm run build
```

使用该设备自己授权的 Cloudflare 登录。现有部署工具版本为 Wrangler 4.58.0：

```sh
npx wrangler@4.58.0 login
npx wrangler@4.58.0 whoami
```

确认账号有上述账户和 Pages 项目的权限，再在明确需要发布时执行：

```sh
CLOUDFLARE_ACCOUNT_ID=2dda3e857959219ddd0bd2bf990bd7a1 \
  npx wrangler@4.58.0 pages deploy dist \
  --project-name niulai-preview-20260922 --branch main
```

这会更新同一项目下的主域名和旧临时域名。保留返回的部署 ID / URL 和 Git 提交；访问主域名、加载静态资源并核对关键交互后才能宣告上线成功。需要回退时在 Cloudflare Pages 的部署列表选择已确认的历史生产部署。

如果未来配置 GitHub Actions 部署，将有该 Pages 项目编辑权限的 Token 存入仓库 Actions Secrets `CLOUDFLARE_API_TOKEN`；账户 ID 可存入变量 `CLOUDFLARE_ACCOUNT_ID`。旧仓库的 Secret 不会随代码迁移，也不能从 GitHub 读取出明文。本仓库目前没有配置自动部署凭据或部署工作流。

不要把 `.wrangler/`、Token、Cookie 或登录配置提交到 Git；它们不属于跨设备同步的项目知识。
