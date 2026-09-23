# 四角色交互声音小样

2026-09-23。每个角色有左键短回应和 L 表演声，共八段。这是本地可试听的制作草稿，不是已完成的角色骨骼交互，也没有完成原作音色相似度听审。文件放在 `tools/`，不会随网站生产构建发布。

## 试听

在仓库根目录启动：

```sh
python3 -m http.server 42849 --bind 127.0.0.1 --directory tools/ip-audio-preview
```

打开 `http://127.0.0.1:42849/`。选择角色后，点击短回应或按 L；Esc 停止。声音载入失败会显示可重试状态。连续触发替换上一段，静音、切角色、离开页面会停止声音。音频默认音量 65%。

## 本版内容

| 角色 | 左键 | L | 来源与限制 |
|---|---|---|---|
| 蜘蛛侠 | 射丝、黏附、收手，1.32 秒 | 射丝、拉起、倒挂轻摆、落地，3.82 秒 | 原创程序拟音，无电影采样或演员语音。 |
| 奶龙 | 录音疑惑短句，1.90 秒 | 原速笑声与收势，3.25 秒 | 第三方公开角色人声资料；仍需人工确认音色、台词和外放程度。 |
| 峰哥 | “毫无疑问”短回应，1.25 秒 | 原录音中的提问和回答，3.38 秒 | 第三方峰哥模型仓库中的参考 WAV 剪辑，不是使用模型生成新台词；目标“这是好事啊”尚未取得合适原声。 |
| 无牙仔（角色待模型确认） | 鼻息、好奇短鸣、呼噜，2.08 秒 | 蓄力、两次扑翼、落地、短鸣，3.85 秒 | 原创小龙拟声结合 CC0 猫呼噜和扑翼采样，不是电影原声。 |

`manifest.json` 提供每段声音的时长、动作时间点、来源说明与试听状态。`validation.json` 是解码后峰值、RMS、文件哈希；`browser-validation.json` 是浏览器行为验证。`humanListeningVerified` 与 `modelSyncVerified` 均为 false：机器检查不能证明音色相似或骨骼同步。

## 素材来源

- 奶龙短句：[pengyichen2026/NaiLong-Voice-Clone](https://github.com/pengyichen2026/NaiLong-Voice-Clone)，`Datasets/nailong_selected/44.1kHz, 16-bit, Stereo (2-channel)/record6.wav`。项目称其为人声分离后的精选原片采样。本任务未训练或调用克隆模型。
- 奶龙笑声：[Tomorins/nailong-codex-pet](https://github.com/Tomorins/nailong-codex-pet)，`output/nailong/sound/laugh.wav`。[素材说明](https://github.com/Tomorins/nailong-codex-pet/blob/main/ASSET-USAGE.md) 未授予第三方角色素材的通用公开分发许可。
- 峰哥短句：[lllllzh123/feng_voice](https://huggingface.co/lllllzh123/feng_voice)，`merged_000008.wav`。机器转写核对为“你觉得他算是个成功的网红吗”及“毫无疑问”；仅取原有片段，不拼接新观点。没有独立鉴定说话人身份。
- [Cat Purring.wav / esperri](https://freesound.org/people/esperri/sounds/118959/)，CC0；裁切、滤波、包络处理。
- [Light Wing Flap / TurboFool](https://freesound.org/people/TurboFool/sounds/561009/)，CC0；裁切、放慢、混音。
- 蜘蛛侠的发射、衣料、气流、落地以及小龙短鸣由 `build_audio.py` 确定性合成。

原始角色采样和成品只留本地试听，不将第三方仓库的代码许可证当成角色录音的发行授权。后续若要公开发布这些采样，需要确定素材可用范围，或用已获准的素材替换。

## 重建

普通开发环境可用独立 Python 3.11 环境：

```sh
python3.11 -m venv .venv-audio
.venv-audio/bin/pip install numpy==2.4.6 scipy==1.17.1 imageio-ffmpeg==0.6.0
.venv-audio/bin/python tools/ip-audio-preview/fetch_sources.py
.venv-audio/bin/python tools/ip-audio-preview/build_audio.py
```

五个源文件均验证 SHA256。生成过程保留人声原速原调，做短淡入淡出、声部混合和两遍 loudnorm（目标 -19 LUFS，true-peak 上限 -2 dBTP；以文件实测值为准）。MP3 输出 48kHz / 192kbps / 双声道。下载、生成音频与 manifest 按目录 `.gitignore` 留在本地；脚本、页面和验证记录进入 Git。

## 验证

本地服务器运行后执行：

```sh
node tools/ip-audio-preview/verify.cjs
```

使用已安装的 Chrome，无需改用户浏览器会话。15 项检查覆盖八段真实 MP3 播放、停止、L/Esc、快速切换、角色切换、静音、pagehide、结束状态、错误重试和桌面/手机布局。此检查不评判音色好坏。

## 剩余工作

1. 取得蜘蛛侠、奶龙、峰哥和黑色小龙模型，核对骨骼、嘴型与动作。
2. 人工试听这版，按角色气质修改声音；无牙仔的拟声尤其不能视为原作音色已经验收。
3. 获取合适的峰哥“这是好事啊”原声，或明确保留当前肯定回应。
4. 将动作事件对齐 manifest 的 cue，并在真实模型上验收。优先按声音自然节奏调动作，不强行拉伸人声。
