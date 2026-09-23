# 本地视觉窗口接入

WORK 仍必须绑定同一房间且设备进程在线；绑定不会自动打开摄像头。窗口右上“编辑”可选择来源、设备及显示效果。修改显示设置即时保留当前采集；换来源、采集规格或本地密钥会先关闭画面，需明确重新开启。断线、换房间、离开 WORK 会释放采集并清除画面。本地密钥只在当前页面内存，不进 localStorage、URL 或云端。

## 三种来源

- **本地视觉程序（默认）**：读取本机 JSON 图像与 CV 快照，复用朋友的采集与识别。刷新上限是网页预览频率，不会改变摄像头真实采集帧率。实际尺寸来自解码后的图像。
- **电脑 / USB 摄像头**：通过浏览器 MediaDevices 使用内置、USB 或系统可枚举的虚拟摄像头。支持自动、480p、720p、1080p、4K 及自定义期望尺寸，15–60 fps；使用 ideal 约束，由设备协商实际值并显示。未获权限、已被占用、拔除、超时均有可重试提示。该来源仅预览，不自带人物检测，也不会把帧送进机械臂或 JEV。
- **WebRTC 直连（兼容）**：保留旧设备套件接口，需主动选择，不是同机默认路径。

网络相机/RTSP、工业相机私有 SDK 不一定被浏览器枚举。由朋友的本地程序解码或采集后，按下述快照合同输出；不承诺任意品牌或规格无需驱动即可使用。

标题、比例（自动/16:9/4:3/1:1/9:16）、完整/裁切、旋转、镜像、缩放、亮度、对比度、人物框、姿态点及构图线均可编辑，按设备房间保存在本浏览器。画面与标注共用几何变换；这些操作不改变检测原始坐标或机械臂方向。无检测数据时明确显示未接入/等待，不画虚构人物框。

## 复用 benben 的现有画面

benben 的视觉服务已在本机提供 `http://127.0.0.1:8765/snapshot`。保持原有采集程序，另在网站目录运行只读预览桥（Python 标准库，无需相机依赖）：

```sh
python3 examples/device/local_preview.py
```

在 benben 仓库根目录运行时，路径为 `web/examples/device/local_preview.py`。此程序不会启动摄像头、机械臂或重启已有服务；只读取已有 JSON 快照。默认对浏览器开放 `http://127.0.0.1:8767/snapshot`，首次创建权限为 0600 的 `.pwc/local-preview.key`。把文件内容填入窗口的“本地画面访问密钥”。此密钥不同于云端 Browser Key / Device Key，不能放进 Git。

默认允许的网页来源是 `https://cowcoming.world`、`https://www.cowcoming.world` 和 `http://127.0.0.1:4178`。其他开发端口显式指定：

```sh
python3 examples/device/local_preview.py --origin http://127.0.0.1:4351 --origin https://cowcoming.world
```

只读桥限定 Host、精确 Origin、Bearer、本机上游、JSON 大小和超时；不开放机械臂 POST，不跟随重定向，不把上游数据通过云端转发。网页读取跨来源本机接口仍受浏览器 CORS 和本地网络权限控制；拒绝时在站点设置恢复权限，不能通过关闭浏览器安全机制解决。无法访问时显示明确错误，不回退上传视频。

## 自己写适配器

可以直接实现支持 CORS 的 loopback `/snapshot` GET；也可以在 Python 中导入 `local_preview.create_server(provider, token=..., origins=[...])`。`provider()` 返回如下对象；server 仅绑定 127.0.0.1，调用者负责后台线程和关闭。

```json
{
  "version": 1,
  "sessionId": "camera-process-start-id",
  "frameId": 184,
  "ageMs": 20,
  "image": {"mime": "image/jpeg", "base64": "<真实 JPEG 的 base64>"},
  "width": 1280,
  "height": 720,
  "fps": 30,
  "boxes": [{"id": "person-1", "label": "person", "bbox": [0.2, 0.1, 0.3, 0.7]}]
}
```

`sessionId` 在采集进程重启时改变，`frameId` 每张新图像递增；`ageMs` 是服务端根据采集时间计算的当前帧龄，不能每次响应时重置为零。`bbox` 是图像左上为原点的归一化 `[x,y,width,height]`。只接收 JPEG/PNG/WebP 内联图像，不接收任意远程图片 URL 或 SVG；base64 上限 8 MB。图像与标注应出自同帧。

也兼容 benben 的 `jpeg / processed_frames / service_started_at / age_ms / tracks` 快照，转换可见人体框、人脸框和姿态关键点。网页不使用身份/外观分类标签，不把轨迹 ID 当真实身份。帧龄超过 1.5 秒、相同帧超过 2 秒、解码错误、鉴权失败或请求超时会停止旧帧展示并给出重试提示。

## 浏览器依据与验证范围

- [MDN 摄像头约束与实际设置](https://developer.mozilla.org/en-US/docs/Web/API/Media_Capture_and_Streams_API/Constraints)：期望规格与设备实际输出分别记录。
- [Chrome 本地网络访问权限](https://developer.chrome.com/blog/local-network-access)：HTTPS 页面读取 loopback 可能需要用户授予本地网络访问权限；CORS 仍须正确配置。

自动化验收使用合成摄像头与快照，不打开用户真实摄像头或机械臂。具体设备支持的规格与真实识别精度由接入者在现场验证。
