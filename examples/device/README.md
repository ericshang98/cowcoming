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

Implement `adapter.py`'s async methods in your own `my_adapter.py`, then:

```sh
python run.py --adapter my_adapter:Adapter --camera 0
```

- `simulation = False` for a real adapter.
- `status()` → `{name, hardware, jev, language}`. Status values: ready/offline/error/unknown.
- `apply_profile(profile)` receives `revision`, `formId`, `prompt`, `allowedActions`, `animationMap`. Return only after the JEV prompt/configuration is applied.
- `decide(user_input, requested_action=None)` → `{actionId, summary}`. Call your JEV with the profile prompt and allowed action IDs. Never return arbitrary motor instructions.
- `execute(action_id)` → `{status, detail}`. Report completed only with actual completion evidence; use sent for a write without completion evidence, unknown for uncertain results.
- `stop()` → `{confirmed: bool, detail: str}`. Stop the physical controller, not just this Python task.
- `reply(user_input)` is an async generator yielding text from your local LLM process.

Default actions: NOD / LOOK / TILT / WAVE / WAIT. Automatic evolution is intentionally off; manual profiles are editable per form. An update stops the current interaction, applies the new prompt, and acknowledges its revision. Reconnection receives a fresh profile and does not replay old commands.

OpenCV HOG is a basic local person detector, not identification or a guaranteed production tracker. Replace it with your own model in `camera.py` if desired. Its normalized boxes are sent on the WebRTC `perception` data channel; the website draws the CV overlay.

The full HTTP/WebSocket/WebRTC contract is included as `device-protocol.md`. `requirements-lock.txt` records the versions verified in the development environment; use it for a reproducible environment if the ranges resolve differently.

Run unit checks: `python -m unittest discover -p 'test_*.py'`.
