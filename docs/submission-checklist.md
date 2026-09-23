# 提交前整体验收（2026-09-24）

本版范围：豆包台词、JEV 动作、Fish 声音；手动六形态；五种网页回应动画；本机摄像头预览。最终现场测试后再提交作品。自动进化、自然插话和五轴持续追人不属于本版已验收能力。

## 版本和当前状态

| 部分 | 本次核验 |
| --- | --- |
| 本机控制器 | 已整合 JEV 并行与五回应映射；06:32 切换为 `--jev-schedule parallel`，原文件已本地备份；启动时没有开启收音或动作 |
| 生产桥接 | 在线；六形态人格版本 `niulai-six-v1-6194348364b6`，contract 2；声明 NOD / SHAKE / NOD_DOUBLE / TILT_LEFT / TILT_RIGHT / WAIT，当前 profile 已获应用回执 |
| Worker | 已发布源码 `c9aff9426ede4daa013c6232755797d4b3fe6c66`，版本 `245ef800-59e3-4de3-8d6c-46b1af71e7ca`；健康检查 200；本次调度无需更改 Worker |
| 公网网页 | 本次只读核验仍为旧 `1a66bcce3d0e2c964310c669868367f8b4e5cb5c`；所有者需发布最新 main，见 [发布交接](pages-owner-release.md) |
| 实物 | 本次未动作、未出声；不能把模拟执行和软件时间写成实机验收 |

服务刚启动、尚未观察到新一轮实际结果时，hardware / JEV / language 的 unknown 不表示故障，也不能当成已验证正常。Bridge 的 camera 状态不代表独立只读预览是否可用，需在实际网页看画面。

## 已验证

- 355 项 Python 回归（两种调度、迟到隔离、取消、语言/TTS 失败、持位、五动作意图与映射），28 项本机页面 JS 测试、14 项设备 SDK 测试通过。
- 网页 113 项测试、生产构建、真实本地 Worker 的鉴权/来源隔离/版本回执/重连测试通过。
- 六套实际 GLB 均可加载，骚牛手机布局无横向溢出；[模型记录](verification/final-model-loading.json)。
- 并行和回滚模式各跑六形态 × 五回应矩阵：独立 Worker + 真实 Controller/Bridge + Chrome/GLB，模拟模型、音频及执行器；检查无重复、断线重连、停止回执、同一人格版本、单/双点头与左右不混淆。结果见 `verification/final-bridge-parallel.json`、`verification/final-bridge-after_reply.json`。
- 本次真实云端六形态点头、摇头、否定及普通牛五动作共 13 轮全部符合预期；豆包回复就绪 556–1094 ms，首 PCM 到模拟动作调度间隔 0–0.6 ms。声音静音、动作只记录，不含 ASR、断句或真实扬声器/电机时间。[云端记录](verification/final-cloud-sync.json)

另补测同一明确指令和普通聊天的真实云端 A/B，共 4 轮通过；普通聊天并行选择 idle 属正常结果，不将其计作动作同步成功。[A/B 记录](verification/final-cloud-ab.json)

并行模式将 JEV 推断提前到台词生成期间；普通聊天只用关注动作，不提前点头/摇头表达尚未生成的立场。显式指令仍受方向、否定、可用性和期限约束。两模型语义一致性依赖提示和候选约束，不能保证任意措辞；本次人格台词仍有夸张口吻，现场应听感验收。

## 可复现软件检查

在 cowcoming 根目录，Node 24，已安装网页依赖和对应本机 Python 依赖后：

```sh
BENBEN_PATH=/absolute/path/to/benben \
BENBEN_PYTHON=/absolute/path/to/bridge-python \
BENBEN_TEST_PYTHON=/absolute/path/to/full-test-python \
npm run qa:release
```

全量 Python 回归需要项目已有 LeRobot 环境；`BENBEN_TEST_PYTHON` 可与桥接 Python 相同。缺依赖应修正测试环境，不在现场随意升级包。脚本仅用独立端口、模拟设备和测试密钥，依次执行本机/网页/SDK/Worker/六模型/两种调度矩阵；输出 `output/final-release/`，不发布、不重启现场服务。

真实云端检查需使用已授权的项目凭证与人格数据范围，在 benben 根目录执行：

```sh
python -m scripts.compare_jev_schedule --credentials-from /absolute/path/to/benben --alignment
python -m scripts.compare_jev_schedule --credentials-from /absolute/path/to/benben --five-motions
python -m scripts.compare_jev_schedule --credentials-from /absolute/path/to/benben --quick
```

这些脚本静音消耗 PCM、记录模拟动作，不能调用机械臂。输出保存本机，不能上传密钥、真实对话或录音。历史实验的 26 轮与本次验证分开记录，不合并冒充同一版本样本。

## 提交前现场测试：待你们执行并填回执

1. 确认网页 `build-info.json` 等于所有者本次发布提交，dirty=false；手机/电脑刷新后骚牛为正式模型。需要立刻测试时可用最新版本地网页，不必等待 Pages 权限。
2. 打开本机 `/live`，确认 `/state` 的 `jev_schedule=parallel`。网页绑定原房间，设备在线、profile revision=appliedRevision；先从普通牛测试。
3. 确认实物摆放、串口和活动空间，点击实机“开始互动”。初始化指令完成后，依次说“点一下头、摇摇头、点两次头、向左歪头、向右歪头”；确认声音、实际运动和网页对应动画。左右以牛自身为准，双点头确实两次。
4. 测“不要点头”：本轮不动作；普通聊天允许 idle，不因不动判成失败。每轮记录 request_id、动作选择、跳过原因和同步时间，并人工看真实首声与起动是否协调。
5. 结束收音并持位，切下一个形态，等应用回执后再开始；六形态各测点头与一句普通聊天，小牛允许短音或静默。不要在收音中直接换人格。
6. 开网页相机预览，确认画面随人移动、无重复占用摄像头；这不等于躯干追人。当前五轴语音 owner 未与持续跟随联调，不要同时启动旧跟随进程。
7. 正常收尾点击“结束收音并持位”，当前轮结束后应不掉头。显式停止并卸力另行在有支撑时测试，不用它当普通收尾；不要为了清日志停止或重启承重服务。

回执填写：网页提交 / 本机提交或运行文件校验 / Worker 版本 / 日期 / 测试人 / 六形态结果 / 五动作结果 / 首声与动作感受 / 否定 / 相机 / 结束持位 / 失败 request_id。没有实际做的项填“未测”。

## 仍需处理

- 所有者发布 Pages，并核验正式域名版本与资源哈希；Worker token 权限无需扩大。
- 完成上面的真实扬声器、舵机、麦克风与相机现场验收。动作结果仍只代表 timed 指令播放，`position_verified=false`。
- 作品说明限定为手动六形态与五回应同步；自动进化、自然插话、躯干追人留作后续，不写成已交付。

若新调度现场表现不满意，结束收音并确认有支撑/不承重后，以 `--jev-schedule after_reply` 重启回滚；不要运行两个串口控制器。回滚保留五动画映射。
