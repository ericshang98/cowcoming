# JEV Pet Playground Implementation Plan

> Inline execution under the user's standing instruction to complete the work without further design questions; no cross-agent coordination.

**Goal:** localhost 上直接体验六形态软件宠物，接入 JEV 决策，复用标准动作适配其他机器人。

**Architecture:** 可配置内容包、纯动作采样/硬件编译、服务端短期凭据、软件交互与培养状态、Three.js 牛舞台。旧实验室保留 `?view=lab`。

**Tech Stack:** 现有 Node 24、React、Three.js、Node test、Playwright，不增加生产依赖。

- [x] 内容与动作：`harness/src/pet-content.mjs`、`motion-score.mjs`；复用人格数据，16+ 动作与两变体；先测试关键帧、次数/方向与校验。
- [x] 硬件：`harness/src/robot-motion.mjs`、示例配置和假驱动；测试缺轴、限位、超速、读回与停止，所有真实执行须明确已标定。
- [x] JEV 与本地设置：`harness/server/pet-api.mjs`、`src/pet-decision.mjs`；接入现有 Host/Origin/CSRF；测试鉴权、选择范围、取消、凭据不泄漏，验证官方 typed questions 合同。
- [x] 培养：`harness/src/pet-session.mjs`；独立软件培养，不把预览计轮；测试完整历史、去重、合法后继、手动切换与重置失效。
- [x] 页面：`harness/web/PetPlayground.jsx`、`PetStage.jsx`、`pet.css`；初玩、模型设置、动作包/硬件映射、导出、进化和状态反馈；原 `main.jsx` 按入口选视图。
- [x] 验证与交付：修正旧 Mock 明确动作替换，回归旧实验室；新浏览器验收含 JEV 测试替身、手机和静态；更新 README/协议/需求覆盖，同步独立仓库并提交公开开发分支。

执行命令：`npm run test:harness`、`npm run test:harness:bridge`、`npm test`、`npm run build`，新旧浏览器验收。每个相关测试先观察失败再实现，完成后记录实际结果与未验证边界。

当前验证：主站 116、Harness 39、Python 4+9 通过；Worker 隔离通信回归通过；新宠物本地 13/静态 8，旧实验室本地 12/静态 11 浏览器检查通过。真实 JEV、实机与生产部署未验证/未执行。

发行：主仓库 `d57430d:harness` → 独立 `8620ae7`，同树 `46ca7dd9b1edce5037aa6eba36a6d94d66094a31`。独立 PR #1 经 CI 通过后合并，v0.2.0 Release 已公开，含 264,975 字节浏览器演示包与校验文件。主站 PR #40 已更新且代码 CI 通过，未合并或上线。
