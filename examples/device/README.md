# 本机画面优先

**使用 benben 的队友：**直接按仓库 `docs/cowcoming-handoff.md` 运行 `python -m niu_reactions.server --cowcoming`。下面的通用 ExampleAdapter 仍是模拟示例，不是 benben 的实机入口。

已有视觉程序时，使用 `python3 local_preview.py` 读取它的 `/snapshot`，在网页“编辑视觉窗口”填本地接口和生成的本地访问密钥。只读桥不会打开相机或驱动机械臂，无需 aiortc/OpenCV 依赖。电脑摄像头也可以直接由浏览器采集；设置界面能编辑设备规格与呈现。详见 [本地窗口说明](../../docs/local-camera.md)（下载包内为 `local-camera.md`）。

原 `--camera` / WebRTC 示例仍可在网页明确选择兼容模式后使用。

# Cowcoming device kit

Run your own hardware/JEV/LLM code on your computer and connect it to the Cowcoming WORK page. No desktop app packaging is required.

1. Use Python 3.11+ and a virtual environment.
2. Install `requirements.txt` for state/text only, or `requirements-camera.txt` for direct camera/CV.
3. Set `COWCOMING_RELAY_URL` and `COWCOMING_DEVICE_KEY` in your environment. Use the device key issued by the server owner, never the browser/admin key.
4. Run `python run.py`. This is clearly labelled simulation, with no real hardware commands.
5. On the website, enter the relay URL and the separate browser key. Edit the form/prompt in Device lab, then send a message or test an action.
6. Run `python run.py --camera 0` for a real local camera, or `--test-video` for synthetic video with no camera access. Click Start video on the website.

Default WebRTC is direct only: use the same computer or local network. There is no TURN/video upload fallback. Camera frames and detection boxes never use the cloud message relay. Text and state do use the cloud.

## Your adapter

Start from the non-executing `hardware_adapter.py` skeleton and implement its async methods in your own `my_adapter.py`, then:

```sh
python run.py --adapter my_adapter:Adapter --camera 0
```

- `simulation = False` for a real adapter.
- `status()` → `{name, hardware, jev, language, actionContractVersion: 2, supportedActions}`. Status values: ready/offline/error/unknown. `supportedActions` is a verified subset of the public desktop-pet behavior catalog; it is not required to contain every catalog action.
- `apply_profile(profile)` receives `revision`, `actionContractVersion`, `formId`, `prompt`, `allowedActions`, `animationMap`. Return only after the JEV prompt/configuration is applied.
- `decide(user_input, requested_action=None, *, allowed_actions=None)` → `{actionId, summary}`. Call your JEV with the profile prompt and the provided allowed_actions capability intersection. Never return arbitrary motor instructions.
- `execute(action_id)` → `{status, detail}`. Report completed only with actual completion evidence; use sent for a write without completion evidence, unknown for uncertain results.
- `stop()` → `{confirmed: bool, detail: str}`. Stop the physical controller, not just this Python task.
- `reply(user_input)` is an async generator yielding text from your local LLM process.

Action contract **2** exposes a broad desktop-pet behavior catalog: head, torso, foreleg, belly, tail/posture and composed behaviors. `WAIT` means no movement. The five IDs NOD / SHAKE / NOD_DOUBLE / TILT_LEFT / TILT_RIGHT remain the legacy BenBen profile, not the catalog limit. Left/right are device-own directions. Advertise only verified `supportedActions` and set `hardware=ready` only after actual readiness checks. Old rooms require explicit migration in Device lab. See `hardware-handoff.md` and `action-catalog.md`. HTTP/WebSocket transport remains v1. Never turn a simulation into a real adapter just by changing its flag.

Manual form selection, reset and configurable conversation-based evolution evaluation are implemented. Automatic evolution requires a configured evaluation model and gateway; see `evolution-runtime.md` in the kit or [the repository contract](https://github.com/ericshang98/cowcoming/blob/main/docs/evolution-runtime.md). Profiles remain editable per form. An update stops the current interaction, applies the new prompt, and acknowledges its revision. Reconnection receives a fresh profile and does not replay old commands.

OpenCV HOG is a basic local person detector, not identification or a guaranteed production tracker. Replace it with your own model in `camera.py` if desired. Its normalized boxes are sent on the WebRTC `perception` data channel; the website draws the CV overlay.

The full HTTP/WebSocket/WebRTC contract is included as `device-protocol.md`. `requirements-lock.txt` records the versions verified in the development environment; use it for a reproducible environment if the ranges resolve differently.

Run unit checks: `python -m unittest discover -p 'test_*.py'`.
