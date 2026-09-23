# 2026-09-24 统一联调交接

当前入口是本地 Qwen `qwen2.5:7b` → Fish 流式语音，同时由 JEV 选择动作；五舵机执行器负责下发角度。六人格使用 `niulai-six-v1-6194348364b6`，网页与本机必须确认同一形态、人格版本和 revision。

## 代码与上线状态

- 网页和 Worker：[ericshang98/cowcoming](https://github.com/ericshang98/cowcoming)。
- 本机控制器、相机、模型与桥接：[Mark10667/benben](https://github.com/Mark10667/benben)（私有，需要队友权限）。`web/` 是带提交版本的网页源码镜像，生产发布仍从 cowcoming 进行。
- Worker 六人格版已发布，源码 `8f27c51`，版本 `97165e27-4c59-4047-970f-66b55727adc1`。主站 Pages 上次核验仍为 `1a66bcc`，等待 Pages/Edit 凭据；本次 Git 同步不代表网页已经更新。
- 本机可独立试玩，也可运行最新网页的本地开发版；无需等待 Pages Token。生产页面与新桥接已做兼容检查，但新网页功能须使用本地新版或等待 Pages 发布。

## 队友启动方式

下列本机路径均相对 benben 根目录；使用 Python 3.12。已有环境先保留本机配置；新的电脑按 `docs/speech.md`、`docs/free-reply.md`、`docs/five-servo-motions.md` 安装各自需要的依赖与模型。模型、录音、虚拟环境和 API Key 不在仓库中。

先在另一个终端准备项目 Ollama（Apple silicon 使用原生 arm64；Intel Mac 去掉 `arch -arm64`）：

```sh
mkdir -p .cache/ollama
OLLAMA_HOST=127.0.0.1:11435 OLLAMA_MODELS="$PWD/.cache/ollama" \
  OLLAMA_NUM_PARALLEL=1 OLLAMA_MAX_LOADED_MODELS=1 OLLAMA_NO_CLOUD=true \
  arch -arm64 ollama serve
```

首次下载模型：`OLLAMA_HOST=127.0.0.1:11435 ollama pull qwen2.5:7b`。JEV 使用 `.env.local` 的 `OPENROUTER_API_KEY`；Fish 在本地调试台配置。豆包 ASR 为可选，见 `docs/doubao-asr.md`。不要同时启动第二个占用 11435 或 8766 的服务。

先启动五舵机**软件预演**控制器（不打开串口）：

```sh
.venv/bin/python -m niu_reactions.server --motion-profile five_servo --cowcoming
```

另开桥接进程，Device Key 文件只包含密钥，权限设为 600：

```sh
.venv/bin/python -m venv .venv-bridge
.venv-bridge/bin/python -m pip install -r requirements-cowcoming.txt
.venv-bridge/bin/python -m niu_reactions.cowcoming_bridge \
  --relay https://cowcoming-live.shangyiyong98.workers.dev \
  --local http://127.0.0.1:8766 --device-key-file .env.cowcoming-device-key
```

打开本机 http://127.0.0.1:8766/ 或 `/live`；网页用同一房间的 Browser Key。结束收音后切换网页形态，等待设备配置确认，再从本机输入文字或语音。未使用网页时可省略 `--cowcoming` 和桥接进程。Device Key、Browser Key、相机预览 Key 分别用于不同入口。

现场确认串口和机械支撑后，使用以下参数替代软件预演控制器；启动本身不移动：

```sh
.venv/bin/python -m niu_reactions.server --motion-profile five_servo --cowcoming \
  --enable-hardware --arm-port "$BENBEN_ARM_PORT"
```

`BENBEN_ARM_PORT` 必须是当前设备的实际端口。不要给新版增加旧的 `--cowcoming-mode` 参数。点击实机“开始互动”才下发默认姿态并开启会话。正常结束用页面“结束收音并持位”（`/live/finish`）；停止并卸力是另一个操作。退出或重启服务会卸力，承重期间必须先支撑好。

## 摄像头和网页开发

沿用现有 `niu_vision` 的 8765 服务。只读预览桥在 benben 根目录运行 `python3 web/examples/device/local_preview.py`；网页 Camera → 本地视觉程序 → `http://127.0.0.1:8767/snapshot`，填写 `.pwc/local-preview.key`。它复用原摄像头，不另开采集、不把图像送进 Worker。浏览器需允许本地网络访问；远程手机不能用电脑的 localhost。

需要最新网页时，在 cowcoming 仓库（或 benben 的 `web/`）用 Node 24 执行 `npm ci`、`npm run dev`。按网页连接面板绑定同一生产房间，避免启动第二个设备桥。Pages Token 只影响云端网页发布，不影响本机测试。

## 动作与延迟修复

- 本机保留已授权的 11 个五舵机动作，加独立 `restore_pose` 共 12 个候选。网页 NOD 动画映射不再过滤本机转头、转身、站坐等动作。网页目前只投影本机单点头为 NOD，其余本机动作记录实际执行日志，不伪造其他动画。
- “呃／嗯／那个／OK”开头的明确动作请求进入 12 秒 JEV 等待窗口，普通聊天仍为 3 秒；超时不补做旧动作。
- Apple silicon 的 Ollama 修复为原生 arm64。现场同类输入 Qwen 热启动为 1.146／1.507 秒，冷启动含加载为 5.324 秒；不是每轮总延迟保证。识别、JEV、网络和播音仍会影响体验。
- `reaction_turn` 输出每轮请求 ID、候选、拒绝原因和分段耗时；不记录用户台词、录音或密钥。日志位置取决于启动重定向；`scripts/start_chat.py` 使用 `outputs/reaction-service.log`。
- 五舵机按固定时间下发角度，结束只表示指令播放完，`position_verified=false`；桥接发送 `action.sent`，不冒充传感器确认的物理完成。

## 保留的上游功能与当前限制

队友新增的视觉属性、五轴跟随工具、网页镜像和 `evolution_gateway` 保留。早期内嵌桥接／网页输入／回合证据控制器保存在 `server_legacy.py`、`cowcoming_legacy.py`、`decision_legacy.py` 与对应测试中，仅用于旧协议软件预览，不能替代当前五舵机入口；也不能确认新版六人格回执。早期 OpenRouter 语言＋macOS say 配置只适用于这一参考实现。

当前生产桥的输入来自本机，网页 `interact/action` 明确拒绝；网页停止仍走同一个本机停止接口。本地自主回合与网页自动进化计数尚未统一，不能宣称完整自动进化已完成。进化网关独立保留并有测试，但不会凭空补出缺失的有效回合。

人格仍可继续调校；完整麦克风到全部真实动作的修复后重测尚未完成。软件回归和合成执行器测试不能代替全套实机验收。上传源码不自动重启任何现场服务。
