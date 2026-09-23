# WORK 路线模型：仙牛 / 暗黑牛

2026-09-23，按 Eric 当次要求，将其提供的 `仙牛.glb`、`暗黑牛.glb` 从静态模型制作为带骨骼和动作的网页模型。原文件没有修改。

## 归属与接入状态

| 形态   | 对应路线与节点             | 网页文件                           | 骨骼 | 三角面 | 文件大小       |
| ------ | -------------------------- | ---------------------------------- | ---- | ------ | -------------- |
| 仙牛   | WORK → 仙牛路线 → 仙牛     | `/models/work/xianniu-web.glb`     | 20   | 80,000 | 3,815,024 字节 |
| 暗黑牛 | WORK → 暗黑牛路线 → 暗黑牛 | `/models/work/dark-niulai-web.glb` | 27   | 80,000 | 3,959,492 字节 |

**这两个是 WORK 的进化形态，不加入 HOME 模型菜单。** `public/models/work/route-models.json` 记录已确认的路线 / 节点名称与资源映射，不编造父子关系、解锁条件或整个进化树。

**资产制作、验证和新版 WORK 源码接入已完成。** `src/evolution.mjs` 将 celestial / dark 映射到上表资源；资源清单记录对应 formId，由测试核对两者一致。保留最新六节点关系、手动/自动设置、重置与实时设备同步。模型切换不代表硬件动作完成。发布状态以 `docs/deployment.md` 和线上版本为准。

## 实际能力

- glTF 2.0 GLB，包含材质、原始 2048×2048 贴图、蒙皮和七段独立动画；没有外部纹理或解码依赖。
- glTF 为 Y 向上、正面朝 +Z；身体居中、脚底归零。原输入朝向已校正，约 148 万三角面减至 8 万，保留衣饰、护甲、角与翅膀轮廓。
- `Root → Hips → Spine → Chest → Neck → Head` 主链，左右肩 / 上臂 / 前臂 / 手、大腿 / 小腿 / 脚。暗黑牛另有双翼、翼端和三段尾骨。
- `idle` 4 秒；`look` 2 秒；`bow` 2.2 秒；`nod` 2.2 秒；`tilt` 2.5 秒；`reflect` 3.6 秒；`wave` 2.4 秒。动作幅度克制、无累计根位移，招呼为小幅抬臂。
- `Head` / `Neck` 兼容现有跟随接口。角、眼睛、耳朵随头移动；暗黑牛按颈部平面以上的网格连通区域区分头和双翼，避免相近高度导致权重串动。长袍下摆跟随骨盆，腰带不随抬臂拉伸。
- 每顶点最多四个骨骼影响，权重归一化，没有未绑定顶点。
- **没有口型 morph、手指动画或 walking**。它们是 WORK 的站立形态预览，不把闭合嘴部拉伸伪装成真实口型，也不用于 WORLD 行走角色。不是通用大幅舞蹈 / 战斗绑定，没有布料物理或硬件能力。

## 文件

- `public/models/work/*.glb`：网站运行资源。
- 各形态目录的 `*-rigged.blend`：可编辑工程，打开为正面材质预览、Pose Mode，选中 Head；通过 Action Editor 切换七段动作。
- `*.actions.json` / `*.evolution.json`：原控制台 v1 本地能力包；每个形态只有自身节点，`edges` 为空。这不是网站完整进化树，不能覆盖已有路线。
- `asset-info.json`：源文件 / GLB SHA-256、实际规格与能力声明。
- `gltf-validation.json` / `roundtrip-verification.json` / `browser-verification.json` / `work-renderer-verification.json`：验证证据。
- `source/`：导入、优化、绑定、导出、重新导入、离线预览与验收脚本。

用户下载目录中的完整 ZIP 另含离线 `preview.html` 和更多动作 / 网页截图，双击即可查看和播放动作，无需联网。输入模型由 Eric 提供，保留其造型与贴图；不另行声明其为本项目原创。

## 验证结果

- 两个最终 GLB 均通过 Khronos Validator：0 错误、0 警告、0 提示。
- 在全新 Blender 场景重新导入，七段动画各采样七个姿态，确认顶点实际移动、数值有限、无飞散；左右约 35°、上下约 23° 的头部测试中脚底保持不动。已检查转头、低头、招呼外观。
- 独立离线浏览器：六个单次动作逐一播放并返回待机；桌面和 390px 窄屏无运行错误，每款 7 项检查通过。
- 当前线上 WORK 渲染器 `index-CaL9QDsu.js`：仅在隔离测试浏览器中替换 `/models/niulai-mouth.glb` 响应，确认两个模型正常渲染、`bow` / `wave` 播放后返回 `idle`，桌面和手机无运行错误。**这是渲染兼容性测试，未上传资源、未改节点、未发布。截图中的当前节点文字仍来自线上原配置，不能当成形态映射证据。**
- 仓库 `npm test` 16 项通过，`npm run build` 通过。未测手机硬件帧率、相机、机械臂或真实进化解锁。

## 复现

制作环境为 Blender 5.2.2 LTS。设置 `COW_RIG_SOURCE` 为包含两个原始中文文件名 GLB 的目录，`COW_RIG_OUTPUT` 为隔离输出目录。依次用 Blender 后台运行 `inspect_models.py`、`rig_models.py`、`verify_and_render.py`、`prepare_blender_view.py`。

离线预览使用 Three.js 0.183.0 和 esbuild：将 `source/preview.js` 打包到输出目录的 `preview.bundle.js`，再运行 `build_previews.py`。`validate.cjs` 需要 `gltf-validator`，可通过 `GLTF_VALIDATOR_PATH` 指定包目录；两个浏览器检查脚本需要 Playwright 和 Chrome。用于生成网页的 `preview-template.html` 已随源码保存。
