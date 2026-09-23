# FUCH 复刻交付记录

> 历史记录：文中 `niulai.nexting.design` 已于 2026-09-23 移除 Pages 绑定，当前网站为 https://cowcoming.world/ 。请勿据旧验收记录恢复旧域名。

参考：[fuch.ai](https://www.fuch.ai/)；采集日期：2026-09-22。

预览：http://127.0.0.1:4178/

公网临时预览（2026-09-22）：https://niulai.nexting.design/
备用地址：https://niulai-preview-20260922.pages.dev/

部署到 Eric 的 Cloudflare Pages 独立项目 `niulai-preview-20260922`，通过
PinClaw 私有仓库现有 GitHub Actions 凭据发布。发布流程 PR #2354、#2355，最新运行
35814558878（IDEA52 牛来角色补齐）。Actions 凭据不具备 DNS zone 读取权限；使用 Eric 已登录的 Cloudflare
控制台完成 `niulai.nexting.design` 自定义域名绑定及 CNAME 创建。HTTPS 返回 200，
公网模型/四段动画/左右跟随/窄屏检查全部通过，见
`.pwc/niulai-domain-verification.json`，部署回执见 `.pwc/deployment.json`。
站点设置 noindex，但链接公开可访问；当前没有自动到期时间。

源项目：`/Users/eric/AI_development/perfect-web-clone-v4/showcase/products/fuch`

构建产物：同目录 `dist/`，已发布到上述 Cloudflare Pages 预览站。

## 首屏走近动画修复

复现：人为延迟牛来 GLB 6 秒后，原版本在模型刚出现时便结束加载；正常加载时
1.5 秒 walking clip 播完即站住；About 模型请求失败也会阻止首页人物出现。
窄窗口首页的渐隐 mask 还会遮掉入场人物的腿部。

修复：加载完成由实际渲染的入场进度驱动，下载耗时不占用走近时间；walking 循环覆盖
3.6 秒入场。About 人形按需加载并单独隔离 Suspense。窄窗口的加载阶段采用完整身体构图，
完成后恢复首页布局；主动跳过入口保留。

验证：`npm run qa:boot` 的慢模型、About 模型不可用、正常加载、主动跳过 4 个场景通过；
`npm run qa:pointer`、`npm run qa:niulai` 和 5 项单元测试通过。慢模型与裁切问题均先由
新增回归检查复现失败，再验证修复。证据：`.pwc/boot-verification.json`、
`.pwc/evidence/boot-slow-model-start.png`、`.pwc/evidence/boot-slow-model-middle.png`。
线上 `niulai.nexting.design` 的 4 个入场场景同样通过，见 `.pwc/boot-public-verification.json`；
自动浏览器最初出现连接中断，经本机现有浏览器代理复测通过，全局网络配置未改。

## 牛来模型试用（2026-09-22）

当前首页及作品/联系页的吉祥物改用 Eric 提供的 `niulai.glb`（约 1.3 MB，21 个骨骼，13 个网格，内嵌 1024px 配色贴图）。原始 Downloads 文件与 `.blend` 工程保持不变；IDEA52 的探险角色也已改用同一牛来模型；About 保留人形角色。原机器人资源文件保留但不再用于探索场景。

保留牛来的 PBR 材质，降低场景 HDR 环境光强度；按模型静止姿态的脚底位置落地，不再依赖旧机器人的 ToeBase 骨骼。使用模型自带的 `idle`、`walking`、`wave`、`bow`，点赞映射到挥手，点击映射到鞠躬；不宣称模型拥有跳舞或后空翻动作。

`npm run qa:niulai` 检查实际资源、四段动画、动作结束回到待机、双向跟随、窄屏布局和浏览器错误。`npm run qa:pointer` 验证 390/667/1440px 跟随、上下凝视、拖拽恢复、触控隔离、失焦复位和开关。截图位于 `.pwc/evidence/niulai-*.png`。

视觉观察：模型可用于网页试用，但挥手时腋下有明显拉伸，需要在建模工程中继续细修网格/蒙皮权重。来源元数据保留在 GLB 内，用于此次预览。

## IDEA52 牛来角色补齐

探索场景原来独立加载 `mascot-anim.glb`，现统一使用 Eric 提供的 `niulai.glb`，
保留骨骼、贴图和以模型高度归一化的地面定位。牛来没有独立 running clip，
Shift 加速使用 walking 循环并随移动速度提高步频。

`npm run qa:world-niulai` 先在旧版复现仍请求机器人资源的失败，修复后通过
牛来资源、行走、转向加速、地图传送/详情、窄屏方向按钮和无运行错误检查；
构建及 5 项单元测试通过。公网同样通过上述检查，见 `.pwc/world-niulai-public-verification.json`。
截图：`.pwc/evidence/world-niulai-running.png`。

## 新版嘴部模型接入

首页与 IDEA52 共用新资源 `public/models/niulai-mouth.glb`（约 2.1 MB），来源是 Eric
提供的 `niulai_mouth.glb`；Downloads 原始 GLB、Blender 文件及旧版资源均保留。
新版仍有 21 根骨骼和 bow/idle/walking/wave 四段身体动画，Mouth 网格新增
MouthOpen、MouthWide、MouthRound 三个 morph target。原始默认权重全部为 1，
网页只在各自克隆的实例上初始化为 0，避免加载时同时叠加三种形变。

首页“试口型”入口提供闭嘴、张嘴、咧嘴、圆嘴；宽/圆轮廓结合适度张合，平滑切换。
预览时人物面向前方，关闭或离开首页恢复闭嘴。当前是无声口型预览，未连接 TTS 或音素同步。

验证：8 项单元测试；qa:mouth 的默认闭嘴、四种嘴形、与挥手并行、关闭/离开复位、
窄屏控件边界通过；qa:boot、qa:niulai、qa:world-niulai 通过。
已发布到 https://niulai.nexting.design/，公网 9 项口型检查通过，见
`.pwc/mouth-public-verification.json`。发布工作流：
https://github.com/ericshang98/pinclaw-dev/actions/runs/35814558878 。

口型截图在 `.pwc/evidence/mouth-0.png`、`mouth-1.png`、`mouth-2.png`、`mouth--1.png`。

## 已落实的关键实现

首页角色加载 Eric 提供的新版 `niulai_mouth.glb`（站点文件名 `niulai-mouth.glb`）；About 人形仍使用 `fuch-human-spin.glb`。牛来保留 4 段骨骼动画，人形保留 3 段，使用独立动画控制器。

头像追踪先把 Head 骨骼的世界坐标投影到屏幕，计算鼠标与头部的相对偏移。水平方向使用 `1.45 × tanh(dx × 2.6)`；头部转角限于 ±0.62 rad，机器人身体限于 ±1.05 rad。头颈以 0.6／0.4 分摊增量旋转，阻尼速度 9；身体阻尼 2.2，产生先看过去、再转身的滞后。增量叠加在当前动画姿态上，每帧先撤销上一帧增量，防止骨骼旋转累积漂移。拖拽按每像素 0.009 rad 更新，释放、取消和窗口失焦均复位拖拽状态。

加载屏等待模型可用，并与字体、时间进度共同推进。完整加载后进入短暂就绪与淡出阶段；页面切换、人形切换、窗口和反应动画互相协调。主要模型、贴图、环境图、插图和 PDF 都在本地，不依赖原站持续在线。

## 验证证据

### 鼠标跟随修复（2026-09-22）

修复窄桌面窗口（包括 Codex 内置预览）被 `mobile` 布局条件禁用追踪的问题。布局断点现在只决定角色排版，鼠标和笔输入在任何宽度下均能驱动头部与身体；触摸输入不激活鼠标凝视。窗口失焦、指针离开或取消时清除凝视，避免停留在旧位置。

`npm run qa:pointer` 先在旧版本 667px 窗口复现失败，修复后通过 390/667/1440px 双向跟随、上下凝视、拖拽结束恢复、触控输入隔离、失焦复位、追踪开关及窄窗口人形跟随验证。修复已重新构建到当前 4178 预览。

- `npm run build`：生产构建通过。
- `npm test`：5 项行为测试，覆盖追踪边界、帧率无关阻尼、反应优先级与阻塞、冷却、联系分支校验。
- `npm run qa`：真实 Chrome / Playwright，结果见 [browser-verification.json](.pwc/browser-verification.json)。包含加载、双向鼠标追踪、拖拽、开关、点赞、作品详情与放大图、模型切换、简历窗口、终端、联系表单、世界漫游/地图/详情、深链接、移动端和错误检查。
- 补充验收：[auxiliary-verification.json](.pwc/auxiliary-verification.json)，覆盖奖项、搜索、历史返回、弹层 Escape、小游戏、PDF、远处地图跳转、模型加载失败与帧时间采样。
- [桌面首页](.pwc/evidence/home.png)、[作品详情](.pwc/evidence/project-detail.png)、[关于页](.pwc/evidence/about.png)、[联系页](.pwc/evidence/contact.png)、[终端](.pwc/evidence/terminal.png)、[简历](.pwc/evidence/resume.png)、[IDEA52](.pwc/evidence/world.png)、[手机首页](.pwc/evidence/mobile-home.png)。
- 原站采集证据：`/Users/eric/AI_development/perfect-web-clone-v4/docs/research/fuch-2026-09-22/`。

## 尚未达到完全一致的部分

| 范围 | 当前实现与差异 | 验收边界 |
|---|---|---|
| IDEA52 渲染 | WebGL 实例化草叶、风场、人物推开草地、地形、星空、光柱；原站使用 WebGPU 草地计算与额外景深/发光，地形与光照分布也不同 | 可交互，不能判为逐像素一致 |
| AI 对话 | 本地档案回答、提问入口与命令导航；可配置自己的服务接口 | 没有原站私有推理服务与上下文状态，不宣称接通原站 AI |
| 联系消息 | 分支、校验、编辑、复核可用；未配置接口时明确显示未发送，可复制草稿或打开邮件 | 未连接消息投递服务，未对原站发送测试消息 |
| 计数/音乐/小游戏 | 点赞与探索记录为本地数据，音乐为采集时的曲目；Wordle 为本地每日词表 | 不是实时共享后端或原站每日答案 |
| 动作与细节 | 主要动画、鼠标参数、切换和移动端裁切已对照校正；随机待机混合、眨眼、声音、全部微动和简历次级排版仍有差异 | 不宣称每个时间点与输入序列完全相同 |
| 移动端与异常设备 | 390px Chrome 模拟视口已验证；倾斜/摇动有权限与无传感器分支 | 未在真实 iPhone/Android 传感器或 Safari WebGL 上验收 |
| 视觉量化门禁 | 保存了原站和本地多状态截图并人工对照；未运行 PWC MCP 专用 capture/fingerprint/visual-budget 门禁（当前会话不可用） | 不用人工检查冒充专用门禁通过，不报伪造相似度 |

按仓库 Skill 的严格完成状态，本次记录为 `failed_with_residuals`：可运行的复刻交付已形成，但“全部交互和视觉完全一致”的验收条件尚未全部满足。最终以用户实际浏览与对照为准。
