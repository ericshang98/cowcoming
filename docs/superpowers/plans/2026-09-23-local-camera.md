# 本地可编辑视觉窗口实施计划

Goal: 同机采集与展示优先，支持现有视觉程序和浏览器摄像头；独立的可保存窗口设置，保持绑定门禁。
Architecture: 统一 camera hook 输出 stream/image/detections/actual/status，来源为 local snapshot、browser capture、可选 legacy peer。纯配置/协议模块负责白名单、期望约束、图像/CV解析与几何变换。既有本地视觉服务通过零第三方依赖的只读桥提供明确 Origin + 本地 token 的 JSON 快照；无摄像头二次占用，无云端帧传输。
Tech: React, MediaDevices, loopback HTTP JSON, Python stdlib, Playwright synthetic devices.

按 Eric 已批准的本地展示方向直接实施；本任务独立执行，不联系其他会话，不运行真实摄像头/机械臂或替换设备运行版本。

- [x] `camera-config.mjs` + tests：规格 ideal约束/实际settings、严格loopback URL、配置白名单不存token、benben与通用快照字段、帧龄与重复帧、变换后标注一致。`node --test tests/local-camera.test.mjs`。
- [x] `useLocalCamera.js`：主动开启；pending permission超时/取消后stop tracks；断线/切房间/unmount清理；串行有界snapshot读取、decode、迟到隔离；保留peer可选。
- [x] `CameraSettings.jsx`, `CameraView.jsx`, `camera.css`：来源/设备/期望尺寸帧率/刷新率、实际规格、标题/比例/fit/镜像/旋转/缩放/亮度/对比度/框点网格；按房间存本地偏好，secret只内存；响应式原生dialog。
- [x] `local_preview.py` + stdlib tests：固定上游loopback只读快照，Host与Origin校验、Bearer、本地token文件、超时/大小/重定向限制；公开可扩展callback协议。设备kit包含该程序及接口指南。`python3 -m unittest discover -s examples/device -p test_local_preview.py`。
- [x] 合成浏览器QA：内置/USB枚举替身、实际规格、设置保存/取消、比例旋转框、权限拒绝/超时迟到释放、local有效/401/停帧/畸形、关窗与解绑清理；桌面/手机/中英。保留peer旧脚本可选择可选来源。
- [x] 文档明确本地密钥与云房间密钥不同、浏览器LNA/CORS、RTSP需本地解码器、规格不能凭空增加能力。`npm test`, `npm run test:relay`, `npm run build`。
- [ ] 先原网站仓库PR合并/既有Pages发布验证；仅本次文件迁入benben/web并PR，不把私有硬件源码反向发布；新增IP改动不被覆盖。

验收不包含用户真实摄像头或机械臂，测试只使用合成输入。相关浏览器依据：MDN getUserMedia/Constraints；Chrome Local Network Access 文档。
