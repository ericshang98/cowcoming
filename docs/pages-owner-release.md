# 转给网页所有者的 Agent

请从 `ericshang98/cowcoming` 的最新已合并 `main` 发布网页（应包含六形态整合 PR #33 与发布记录 PR #34）。先读 `AGENTS.md`、`docs/deployment.md`、`docs/release-check-2026-09-24.md` 和 `docs/five-motion-sync.md`，使用 Node 24 执行 `npm ci`、`npm test`、`npm run build`，用你本机已有的 Cloudflare 权限部署原 Pages 项目 `niulai-preview-20260922`，主域名保持 `cowcoming.world`。发布后核对 `build-info.json` 的完整提交号、`dirty=false` 及 JS/CSS 哈希，并检查六形态切换、骚牛模型、设备连接、五回应动画与相机入口。不要创建新站点或修改 DNS；Worker 已发布为 `245ef800-59e3-4de3-8d6c-46b1af71e7ca`，无需重发。发布使用所有者本机权限，不需要向我们提供 Pages Token，也不要索取本机模型或设备密钥。完成后给出 Pages 部署回执、线上提交号和检查结果。

本机五回应映射代码在 `Mark10667/benben` 独立交付，网页发布不会重启或升级现场控制器。页面没有绑定原房间或电脑桥接未在线时，应标为尚待现场连接，不能用模拟设备替代实机验收。
