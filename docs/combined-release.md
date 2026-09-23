# 六人格、持位和 Worker 统一发布

2026-09-24。基于 Cowcoming main `1481c60`，增量整合六形态人格补丁；已有 Worker 异常关闭修复保持。对应本地控制器基线已包含 JEV 明确动作 12 秒等待和正常结束持位修复。没有用旧网页副本覆盖后续动画排队、完整播放和交互来源规则。

## 版本与行为

人格版本 `niulai-six-v1-6194348364b6`；网页 `shared/niulai-personas.json` 与本地 `config/characters/niulai.json` 的 SHA-256 均为 `00c7aa9917403e44ebc793c4f1312c1fb08a67a18aef198b9772f1d477ccc692`。

- 六形态分别给 Qwen 语言人格和 JEV 动作偏好。小牛允许短音／静默，其他形态保留多句回复。
- 配置确认同时检查 revision、formId、personaVersion；旧设备不能假确认新人格。旧房间自动补齐版本，保留自定义 JEV 偏好与动作能力，再等待本地确认。
- 调试台的版本化语言人格只读预览；JEV 偏好仍可编辑。旧形态流在切换时结束，迟到且带旧 revision 的文本不进入新形态。
- 本地仍保留 NOD / WAIT 的已接通范围、按时间播放的诚实 sent 回执。其他实机动作映射、完整自动进化计数不因本次合并被标为完成。
- 正常结束必须使用“结束收音并持位”／`/live/finish`；不以 `/stop` 或退出服务代替测试收尾。正在收音或忙碌时，新形态先排队，结束互动后才确认应用。

## 已验证

303 项本地 Python、28 项本地 JavaScript、102 项网页 Node 24 测试、14 项设备套件测试；生产构建及隔离 Worker 鉴权、版本回执、动作／文本、重连回归通过。网页与本地人格文件逐字节一致。持位 owner、运动执行器、正常 finish 测试与现场基线逐字节相同。

真实本机 Qwen 六形态 12 轮试聊由人格任务完成；该记录保留，但不把结构校验等同于风格完全合格。当前部分认真倾诉回复仍偏说教，需要现场调校。

8 项跨仓库联调通过，包含六种网页形态到本地控制器的实际人格版本确认。报告见 [合成联调结果](verification/combined-bridge-2026-09-24.json)。

跨仓库验证可运行：

```sh
BENBEN_PATH=/path/to/combined/benben \
BENBEN_PYTHON=/path/to/python-with-aiohttp \
node scripts/combined-bridge-qa.mjs
```

只启动随机端口上的临时 Worker、模拟控制器、桥接和 Chrome，加载真实 GLB；不使用真实机械臂、麦克风或模型 API。设备套件另用 `python -m unittest discover -s examples/device -p 'test_*.py'` 检查。

## 发布／现场切换门槛

当前 Cloudflare Token 可发布既有 Worker，但访问 Pages 项目返回 403 / 10000；本机 Wrangler 无 OAuth 登录。需要既有账户的 Pages/Edit 凭证或完成本机授权，才能统一发布 Pages，不能只发 Worker 宣称整体上线。原 Worker 上一版本仍见部署说明。

现场 8766 控制器五轴正持位、无活动语音会话；重启会卸力。先完成软件准备，现场确认牛头已可靠支撑后才结束原控制器、增量应用本机补丁并重启同一服务；不并开串口控制器。生产连接仍使用用户原房间文件，不更换密钥。启动服务、接通桥接与应用配置均不自动触发机械臂动作。

最终实机检查使用同一生产房间：网页切换六形态→确认匹配人格版本；本地文字／语音→同轮语言和点头动画；已有本机相机桥→图像与人物框；正常结束→持续持位。需要现场参与的收音和真实动作尚未计作本次通过。
