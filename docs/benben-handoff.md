# benben × Cowcoming：直接运行的交接

网页与 Worker 在 `ericshang98/cowcoming` 维护；本机机械臂、摄像头、JEV 与同步桥在 `Mark10667/benben` 维护。朋友不需要重新实现硬件适配器，也不需要重新提供已接入模型。benben 的 `web/` 是版本标记明确的网页源码副本，线上发布仍从 cowcoming 仓库进行。

## 两个人怎样一起调

1. 网站负责人创建一个房间，分别私下交付 Browser Key 和 Device Key。已有配对继续使用原房间，不在群聊、Git 或截图中公开密钥。网站负责人可按 `scripts/create-device.mjs` 创建房间。
2. 朋友在自己的电脑更新 benben，保留已有的串口、摄像头与已验证轨迹；启动下面的程序。
3. **朋友在同一台电脑**打开 https://cowcoming.world/?section=work ，填该房间 Browser Key。你也可以在自己的电脑用同一 Browser Key 观察动作和文本；本地相机画面只在拥有该摄像头服务的电脑显示。
4. 他继续在本机调试台输入文字／点选动作。已启动的基础动作自动传到网页当前形态。你从网页切换形态时，当前本地一套表演先结束，再应用新提示词并回报版本。

## 朋友运行的命令

在 benben 根目录、他自己的现有 Python 环境中安装新增的网络依赖：

```sh
.venv/bin/python -m pip install -r requirements-cowcoming.txt
```

在已有 `.env.local` 中补充（不要覆盖已有 API Key）：

```dotenv
COWCOMING_RELAY_URL=https://cowcoming-live.shangyiyong98.workers.dev
COWCOMING_DEVICE_KEY=填同一房间的DeviceKey
OPENROUTER_API_KEY=自己的模型Key
COWCOMING_LANGUAGE_MODEL=openai/gpt-4.1-mini
```

本机 JEV 沿用已有 `typesafe/jev-1.13`；独立语言模型默认使用上面的 OpenRouter 模型。也支持 `COWCOMING_LANGUAGE_URL` 与 `COWCOMING_LANGUAGE_API_KEY` 指向兼容的 chat/completions 服务。变量只在本机读取，不发送到网页或写入 Git。

先只联调软件：

```sh
.venv/bin/python -m niu_reactions.server --cowcoming
```

打开 http://127.0.0.1:8766/ 。预演会播放语音和软件动画，不打开串口；网页明确标为模拟，不计进化轮数。小牛默认无声；其他形态的文字由独立 LLM 流式生成，macOS `say` 播放同一段文字，并与机械动作并行。未联网的旧素材试听仍保留原录音播放器。

他准备好实际机械臂后，才自行使用已有串口参数启动：

```sh
.venv/bin/python -m niu_reactions.server --cowcoming \
  --enable-hardware --arm-port "$BENBEN_ARM_PORT" --cowcoming-mode hardware
```

`--cowcoming-mode hardware` 控制网页命令的执行模式；本地调试台仍要明确选择“实机播放”。启动本身不动作。不另起第二份程序占用同一机械臂，不需要我们远程重启他的服务。

摄像头沿用他已有的 8765 服务，另开只读预览桥：

```sh
.venv/bin/python web/examples/device/local_preview.py
```

网页 Camera → 编辑 → 本地视觉程序，地址 `http://127.0.0.1:8767/snapshot`，填 `.pwc/local-preview.key` 中的本地访问密钥，允许浏览器访问本地网络后开启。复用同帧图像、人体框、人脸框、跟踪 ID；不重复打开相机、不经云端上传帧。

## 自动进化：也提供了可运行网关

在朋友的 `.env.local` 再填 `COWCOMING_BROWSER_KEY=与网页相同的BrowserKey`。运行：

```sh
.venv/bin/python -m niu_reactions.evolution_gateway
```

网页左下角进化设置选自动，周期填 5（可改 10），评估模型填可用的 OpenRouter 模型 ID，例如 `openai/gpt-4.1-mini`，API 地址填 `http://127.0.0.1:8768/evaluate`。网关只监听本机、校验网页 Origin 和 Browser Key；模型 Key 留在本地。浏览器仅对这个固定本机网关地址附加房间鉴权，不会把 Browser Key 发给自定义远程网关。

每次按完整历史请求独立 LLM，代码校验只保持或前进一个合法节点；同一请求 ID 去重，不截断历史，不因满 5 轮就强制升级。可以通过 `COWCOMING_EVOLUTION_URL` / `COWCOMING_EVOLUTION_API_KEY` 接其他兼容提供商。跨电脑观察网页不调用朋友的 localhost；自动进化在运行网关的那台电脑配置即可。

## 数据与行为约定

- 设备先声明 `actionContractVersion=2` 与真实 `supportedActions`，应用网页 profile 后确认 revision。
- 本地输入先发 `interaction.start`，用同一 commandId 关联用户文本、LLM 分片、JEV 决策与结果；网页输入沿用已有 commandId，不重复注册。
- `decision.actionId` 决定当前形态的已编排骨骼动画。网页依次完整播放；队列最多 32 项。硬件后续失败/停止不会追着中断网页动作，断线也不重播历史。显式重置、换形态或离开 WORK 会清除旧动画。
- 完成回执用于记录事实与进化计数，不是播放下一帧的控制命令。实机、同形态、完整输入与回复（含小牛明确无声）及两边动作完成才计轮。演示、纯点选、重复与中断均不计。
- 共享六形态提示词来自产品快照修订 212；新指令以当前交接为准。旧房间通用人格自动补齐，用户自己写的 JEV 提示词保留；独立语言提示词可在 Device lab 修改。

## 已有素材与实机能力

不用再索取或制作已有模型。网页现有小牛、普通牛来、硬牛、仙牛、暗黑牛的绑定模型和五类动画继续复用；仓库中的骚牛仍是明确标示的参考模型，未把参考模型冒充独立验收资产。该阶段支持独立语言回复和 WAIT；WAIT 无需等待不存在的动画资产，实机模式下的完整文字互动可正常计轮、评估下一步进化。

本次核对到 benben 已标记 verified 的是 `nod` 与 `shake_head`。`nod` 轨迹含两次点头，映射 `NOD_DOUBLE`；`shake_head` 映射 `SHAKE`；`WAIT` 不运动。不把尚未实机验证的单点头和左右歪头自动开放。以后验证了新的现有轨迹，只需在对应 reaction JSON 中填写正式 `action_id` 并保持原硬件验证流程，网页已有对应动画，无需改云端协议。

## 验收与边界

- 自动化已覆盖真实 Worker / WebSocket / benben Controller / 网页 Three.js 动画的完整链路；测试用假的动作执行器、语言提供商和画面，不打开真实机械臂或摄像头。
- 模型 Key、串口和相机服务由朋友本机配置。真实 JEV/LLM 调用、语音设备与物理动作需要他现场跑一轮；软件测试不能冒充实机验收。
- 自动进化的周期、合法路径、完整历史、重置、本地输入计数及本机评估网关均已提供。真实评估模型需使用朋友自己的有效 API Key；未配置或模型报错时保留当前形态，不伪造升级。
- 五动作协议和新本地事件需要网站与 Worker 同版发布。仅复制 web 文件夹或仅更新 Python 不等于线上网站已更新。
