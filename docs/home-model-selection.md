# HOME 模型选择

依据：Eric 在 2026-09-23 明确要求将导航第二个纸张图标替换为模型选择入口；选择奶龙后替换首页角色，只有 HOME 可以切换，WORK 不可以。该决定独立于飞书修订 106 的产品快照。

## 实现行为

- 顶部立方体图标打开模型列表：牛来、奶龙、蜘蛛侠、小黑龙。移动端使用同一入口。
- 选择只作用于 HOME。在 WORK、ABOUT、VOTE US、WORLD 入口禁用，各页面仍使用原角色；ABOUT 保留新版独立牛来舞台。
- 离开 HOME 后再返回，会恢复本次页面会话中选中的模型。刷新后恢复默认牛来，不写入本地存储。
- 资源首次按需加载，加载期间保留当前角色，可取消；失败或超过 20 秒显示错误并保留原角色，可重新选择重试。离开 HOME 或选择新模型后，旧请求不能覆盖当前选择。
- 奶龙、蜘蛛侠和小黑龙没有口型 morph，声音面板明确提示暂不支持口型。牛来保留原有口型和互动能力。
- 原第二个图标的简历入口被替换；本次未删除旧简历组件。

## 模型与维护

目录由 `src/scene/home-models.mjs` 管理，加载逻辑在 `useHomeModel.js`。自定义 GLB 使用场景现有的骨骼跟随与动作控制，沿用角色放置和镜头规则。

| 文件                              | 来源及处理                                                                       | 文件大小       | 骨骼 / 面数         |
| --------------------------------- | -------------------------------------------------------------------------------- | -------------- | ------------------- |
| `public/models/nailong-web.glb`   | Eric 提供的 `奶龙.3mf`，Blender 绑定；原文件未着色，按其缩略图制作颜色与内嵌贴图 | 1,822,964 字节 | 21 / 49,726 三角面  |
| `public/models/spiderman-web.glb` | Eric 提供的 `spiderman.3mf`，Blender 绑定，保留原 Bambu 涂色                     | 5,466,788 字节 | 22 / 149,370 三角面 |

| `public/models/black-dragon-web.glb` | Eric 提供的 `小黑龙-Blender-GLB.zip`，保留坐姿和黑白涂色 | 4,033,240 字节 | 25 / 107,023 三角面 |

三个 GLB 都内嵌资源，包含 `Head`、`Neck`、`Hips`，以及 `idle`、`look`、`bow`、`nod`、`tilt`、`reflect`、`wave` 动作。它们没有行走动画或口型形变。原始 Blender 工程与交付包保存在用户下载目录，本仓库提交网页运行所需 GLB；不将文件路径当成跨设备可用的资源地址。

小黑龙额外包含 `wing_flap` 动作；本次菜单不新增扇翼按钮。来源包记录 Designer 为 suare、ProfileUserName 为 GEM、License 为 Standard Digital File License；原模型页面为 https://makerworld.com/en/models/1526948-little-black-dragon 。保留这些来源信息，不声明模型为本项目原创。

## 验证与发布

- `npm test`：页面角色隔离、GLB 骨架与动画、内嵌资源、口型能力声明，以及已有行为与口型逻辑。
- `npm run qa:models`：桌面 / 390px 手机、四角色切换、失败重试、离页取消、竞态、键盘和原角色隔离。通过 `QA_BASE_URL` 指定待测站点，默认端口 4186。
- `npm run qa:work-models`：WORK 双模型、动作、分支浏览、HOME 隔离、重置、双语和手机布局。
- `npm run qa:about` / `npm run qa:world-niulai`：保留当前 About 和 World 回归。
- `npm run build`：生产构建。

本次实现尚未部署至线上；生产发布遵循 `docs/deployment.md`，不能将本地验证当成已上线。

2026-09-23 最新源码已合入：以 main `a1895f3` 为集成基线，保留六形态手动控制、设备接口、双语和新版 About。仙牛与暗黑牛分别绑定 WORK 的 celestial / dark 节点；其余四形态继续如实显示参考模型。HOME 选择与 WORK 形态独立。

64 项 Node 测试与生产构建通过。最终浏览器和 PR 验证以项目现状中的交付记录为准。Cloudflare Secret 尚未配置，自动发布仍关闭；发布必须核对域名版本，不将合并视为上线。
