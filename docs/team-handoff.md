# 牛来动作与设备接入：团队交接

本次交付分支 `codex/motion-self-tuning`，关联 [PR #23](https://github.com/ericshang98/cowcoming/pull/23)。压缩包根目录 `VERSION.json` 记录固定提交；代码位于 `source/`。本次图鉴/调参属于本地候选版本，发布状态见项目现状。设备历史验收与本轮网页验证分别记录。产品依据是飞书修订 212 与 Eric 后续确认，见 [项目现状](project-context.md)。

## 先跑起来

已验证环境：macOS、Node 24、Python 3、Blender 5.2（仅编辑模型时需要）。Windows 原生启动器尚未验收。首次安装依赖需要网络。

只看模型和调动作：在交接包的 `source/` 目录执行 `npm ci`、`npm run dev`，进入 WORK 左下角“调试模式”。未绑定设备、未进化的形态均可预览。

需要包含模拟设备联调时，在 `source/` 目录运行：

```sh
npm ci
python3 -m venv .pwc/motion-python
.pwc/motion-python/bin/pip install -r examples/device/requirements.txt
npm run motion:lab
```

终端报告启动成功后打开 http://127.0.0.1:4337/__motion-lab/start 。这个地址由每位成员在自己的电脑启动；Eric 电脑的 localhost 不能作为团队共享网址。保持终端运行，Ctrl+C 结束本次模拟环境。端口占用时可用 `MOTION_LAB_PORT=4338 npm run motion:lab`，按终端地址打开。

开发者也可克隆公开仓库，然后执行 `git checkout <VERSION.json中的完整commit>`，进入相同版本。继续开发时新建自己的分支；正式发布从 Git 工作区构建并遵循 [部署说明](deployment.md)。压缩包源码可本地构建，但 `build-info.json` 会标明 archiveSource、dirty=null，不能作为“干净 Git 提交已上线”的证据。

## 已交付内容

- 小牛、普通牛来、骚牛、硬牛、仙牛、暗黑牛六个独立绑定模型，六套可编辑 Blender 工程。
- 每种五项语义，共 30 段动作：`NOD` 确认点头、`SHAKE` 摇头、`NOD_DOUBLE` 得意双点头、`TILT_LEFT` 左侧好奇歪头、`TILT_RIGHT` 右侧好奇歪头。左右以角色自身为准。`WAIT` 为待机控制；郑重批准、转头看向已移除。
- 网页逐形态、逐动作调速度与幅度，支持停止、恢复默认、自动保存及 JSON 导入导出。小牛 WORK 显示缩小 15%；骚牛保持侧躺托头的小幅动作。
- 网站、Worker 中继、Python 模拟设备和硬件适配器骨架，以及模型来源、制作脚本、GLB 校验和浏览器验证报告。

共享动作逻辑只用于牛来进化形态，其他 IP 的展示逻辑独立。当前每个语义只有一段已验证变体；合同支持今后加入同语义变体，不能将当前实现称为每项已有多个随机动作。

## 建议分工与交付物

| 工作 | 入口 | 本轮完成标准 |
| --- | --- | --- |
| Eric / 动作验收 | [自助调参](motion-self-tuning.md) | 六形态试播，导出最终 JSON 并注明日期 |
| 网站开发 | `src/live/`、`src/components/MotionPreview.jsx` | 使用同版本模型导入最终 JSON，验证设备事件与手动试播一致 |
| 模型动画 | 包内 `editable-models/`、`assets/evolution-source/` | 改 Blender / 制作脚本，重新验证模型并同步 SHA 与参数版本 |
| 硬件开发 | [硬件交接](hardware-handoff.md)、`examples/device/hardware_adapter.py`、[已有接线](benben-handoff.md) | 复用已接通范围，标定其余动作，补齐实际完成/失败/停止回执 |
| JEV / 对话 / 进化 | [设备 API](live-device.md)、[进化运行合同](evolution-runtime.md) | 实现真实推理与评估网关，以真实完整会话验证进化 |

## 参数与模型怎么交

包内 `configuration/motion-tuning-defaults.json` 是六形态默认值，**不是 Eric 的最终调参结果**。最终参数由 Eric 在网页点击“导出全部参数”获取；每人用相同模型版本导入。当前浏览器中的私有调参不会随源码自动同步。

调参 JSON 的 `scope: software-only` 表示仅影响网页动画。速度和幅度不能直接当作舵机角度、扭矩或硬件速度。设备开发者按五个动作 ID 做独立标定。动作合同版本为 2，中继协议版本为 1。

网页运行时 GLB 以 `source/public/models/evolution/manifest.json` 及对应 SHA 为准。可编辑 `.blend` 用当前制作脚本从保留的 source.glb 重新生成；再导出 GLB 时可能出现新的二进制 SHA，须按模型升级流程验证，不直接覆盖哈希命名的发布资源。

## 验收顺序

1. 启动模拟环境，确认网页已绑定、设备在线、配置已确认；逐形态试播五动作。
2. 调整参数，导出、刷新、重新导入，核对参数；检查停止与手机页面。
3. 运行 `npm test`、`npm run build`；验证记录见 `docs/verification/motion-tuning.json`、`playful-browser.json` 和各模型目录。
4. 朋友完成驱动后，以真实设备分别验证动作方向、完成、失败、断线、重复事件和停止；观察网页与设备各自回执。
5. 接入真实 JEV、角色 LLM 和评估网关后，再验收完整会话与分支进化。

此前验证包含 92 项 Node 测试、六形态 30 动作真实浏览器播放、桌面/手机画面及软件模拟同步；本次独立图鉴未驱动实机。主分支另有实际接线与点头 sent 回执记录，见 [统一联调交接](benben-handoff.md)；sent 不代表实物到位。当前交接新增的归档构建检查以交接包根目录验证记录为准。

## 权限与开源边界

包内不含房间密钥、API Token、登录态、node_modules 或个人浏览器存储。各成员自行创建测试房间；生产密钥通过团队私密渠道单独配置。运行本地示例不需要飞书或 Cloudflare 账号。

动作合同、调参逻辑和适配器可作为开源整理对象；当前公开仓库不等于授予所有资产统一许可。骚牛来源署名 model hunter、硬牛来源署名八云恋在找钓鱼竿，原始元数据含 BY-NC-SA；保留各资产 SOURCE 说明，商业使用及再分发按各自许可核对。此次未新增统一开源许可证。
