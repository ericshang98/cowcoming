import { useEffect, useRef, useState } from "react";
import { Camera, SlidersHorizontal, Maximize2, Minimize2 } from "lucide-react";
import { useLanguage } from "../i18n/Language";
import CameraSettings from "./CameraSettings";
import { mediaLayout } from "./camera-config.mjs";
import "./camera.css";
const errors = {
  local_url: ["请输入本机画面接口地址。", "Enter a loopback snapshot URL."],
  local_auth_missing: [
    "尚未填写本地画面密钥。请在编辑中填写，并可勾选在当前标签页记住。",
    "Local preview key is missing. Enter it in settings; optionally remember it in this tab.",
  ],
  local_auth: [
    "本地画面密钥不正确，请在窗口设置中更新。",
    "The local preview key is incorrect. Update it in settings.",
  ],
  local_network: [
    "无法访问本地画面。请启动本地程序，检查端口、允许的网页来源和浏览器本地网络权限。",
    "Cannot reach local video. Check the program, port, allowed origin and browser local network permission.",
  ],
  local_timeout: [
    "本地画面响应超时，请检查程序后重新开启。",
    "Local video timed out. Check the program and start again.",
  ],
  snapshot_stale: [
    "本地程序没有新画面，已停止显示旧帧。检查采集后重新开启。",
    "No fresh frames. The old image has been cleared. Check capture and start again.",
  ],
  snapshot_format: [
    "本地接口返回的画面格式不符合接入约定。",
    "The local endpoint returned an unsupported snapshot format.",
  ],
  snapshot_decode: [
    "画面无法解码，请检查本地程序的图像输出。",
    "Could not decode the image. Check the local program.",
  ],
  snapshot_size: [
    "单帧过大，请在本地程序降低分辨率或压缩质量。",
    "The frame is too large. Reduce capture size or JPEG quality.",
  ],
  NotAllowedError: [
    "相机权限未允许，请在浏览器与系统设置中允许后重试。",
    "Camera permission denied. Allow it in browser and system settings, then retry.",
  ],
  NotFoundError: [
    "找不到所选摄像头，请连接设备或重新选择。",
    "Camera not found. Reconnect or choose another device.",
  ],
  NotReadableError: [
    "相机可能被其他程序占用。如果本地程序已采集，请切换到本地视觉程序来源。",
    "Camera may be busy. If a local program owns it, select the local vision source.",
  ],
  OverconstrainedError: [
    "设备无法满足所选配置，请选择自动规格或其他设备。",
    "This camera cannot use the requested configuration. Try automatic format or another device.",
  ],
  camera_timeout: [
    "等待相机授权超时。允许权限后请重新开启。",
    "Camera permission timed out. Grant permission and start again.",
  ],
  camera_ended: [
    "摄像头已断开或权限已撤销。",
    "Camera disconnected or permission revoked.",
  ],
  camera_unavailable: [
    "当前浏览器无法采集相机。请使用 HTTPS 或 localhost，并检查相机支持。",
    "Camera capture is unavailable. Use HTTPS or localhost and a supported browser.",
  ],
  device_offline: ["请先连接设备。", "Connect the device first."],
};
export default function CameraView({ camera, online }) {
  const { language } = useLanguage(),
    t = (zh, en) => (language === "zh" ? zh : en),
    c = camera.config;
  const video = useRef(null),
    stage = useRef(null),
    lastFrame = useRef(0);
  const [now, setNow] = useState(Date.now()),
    [size, setSize] = useState({ width: 400, height: 225 }),
    [natural, setNatural] = useState([16, 9]),
    [editing, setEditing] = useState(false),
    [expanded, setExpanded] = useState(false);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const ob = new ResizeObserver(([e]) =>
      setSize({ width: e.contentRect.width, height: e.contentRect.height }),
    );
    if (stage.current) ob.observe(stage.current);
    return () => ob.disconnect();
  }, []);
  useEffect(() => {
    const el = video.current;
    if (!el) return;
    lastFrame.current = 0;
    el.srcObject = camera.stream;
    let callback,
      active = true;
    function frame() {
      if (!active) return;
      lastFrame.current = Date.now();
      callback = el.requestVideoFrameCallback?.(frame);
    }
    if (camera.stream) {
      el.play().catch(() => {});
      callback = el.requestVideoFrameCallback?.(frame);
    }
    return () => {
      active = false;
      if (callback !== undefined) el.cancelVideoFrameCallback?.(callback);
      el.srcObject = null;
    };
  }, [camera.stream]);
  const fresh =
    camera.status === "live" &&
    now - (camera.image ? camera.frameAt : lastFrame.current) < 2500;
  const cvFresh =
    fresh && camera.detections && now - camera.detections.receivedAt < 1500;
  const [iw, ih] =
    camera.image && camera.actual
      ? [camera.actual.width, camera.actual.height]
      : natural;
  const rotated = c.rotation % 180 !== 0;
  const ratio =
    c.ratio === "auto"
      ? rotated
        ? ih / iw
        : iw / ih
      : c.ratio
          .split(":")
          .map(Number)
          .reduce((a, b) => a / b);
  const layout = mediaLayout(
    size.width,
    size.height,
    iw || 16,
    ih || 9,
    c.fit,
    c.rotation,
  );
  const busy = ["live", "connecting"].includes(camera.status),
    err = errors[camera.error];
  return (
    <div className={`camera-window ${expanded ? "camera-expanded" : ""}`}>
      <div className="camera-toolbar">
        <strong>{c.title || t("牛来的视角", "Through its eyes")}</strong>
        <button
          aria-label={t("编辑视觉窗口", "Edit camera window")}
          onClick={() => setEditing(true)}
        >
          <SlidersHorizontal size={14} />
          {t("编辑", "Edit")}
        </button>
        <button
          aria-label={
            expanded
              ? t("收起画面", "Collapse video")
              : t("放大画面", "Expand video")
          }
          onClick={() => setExpanded((x) => !x)}
        >
          {expanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        </button>
      </div>
      <div
        ref={stage}
        className={`live-camera camera-stage ${fresh ? "is-live" : ""}`}
        style={{ aspectRatio: ratio }}
      >
        <div
          className="camera-content"
          style={{
            width: layout.width,
            height: layout.height,
            visibility: fresh ? "visible" : "hidden",
            transform: `translate(-50%, -50%) scale(${c.zoom}) rotate(${c.rotation}deg) scaleX(${c.mirror ? -1 : 1})`,
          }}
        >
          <video
            ref={video}
            autoPlay
            muted
            playsInline
            style={{
              display: camera.stream ? "block" : "none",
              filter: `brightness(${c.brightness}%) contrast(${c.contrast}%)`,
            }}
            onTimeUpdate={() => {
              if (!video.current?.requestVideoFrameCallback)
                lastFrame.current = Date.now();
            }}
            onLoadedMetadata={() => {
              const el = video.current;
              if (el.videoWidth && el.videoHeight)
                setNatural([el.videoWidth, el.videoHeight]);
            }}
          />
          {camera.image && (
            <img
              src={camera.image}
              alt={t("本机摄像头实时画面", "Live local camera image")}
              style={{
                filter: `brightness(${c.brightness}%) contrast(${c.contrast}%)`,
              }}
            />
          )}
          {cvFresh && (
            <div className="live-cv-layer" aria-label="Local person detections">
              {c.boxes &&
                camera.detections.boxes.map((b, i) => (
                  <div
                    className="live-cv-box"
                    key={`${b.id}-${i}`}
                    style={{
                      left: `${b.bbox[0] * 100}%`,
                      top: `${b.bbox[1] * 100}%`,
                      width: `${b.bbox[2] * 100}%`,
                      height: `${b.bbox[3] * 100}%`,
                    }}
                  >
                    <span
                      style={{ transform: c.mirror ? "scaleX(-1)" : undefined }}
                    >
                      {String(b.label || "person").slice(0, 40)} {b.id}
                    </span>
                  </div>
                ))}
              {c.points &&
                camera.detections.points?.map((p, i) => (
                  <i
                    className="camera-keypoint"
                    key={i}
                    style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
                  />
                ))}
            </div>
          )}
        </div>
        {!fresh && (
          <div className="live-camera-empty">
            <Camera size={27} strokeWidth={1.2} />
            <strong>
              {camera.status === "connecting"
                ? t("等待本机画面", "Waiting for local video")
                : camera.status === "live"
                  ? t("等待新画面", "Waiting for fresh frames")
                  : t("开启你的本机视角", "Start your local view")}
            </strong>
            <span>
              {c.source === "local"
                ? t(
                    "复用本地程序的画面与识别结果",
                    "Reuse your local program’s video and detections",
                  )
                : c.source === "browser"
                  ? t(
                      "使用这台电脑的内置或 USB 摄像头",
                      "Use this computer’s built-in or USB camera",
                    )
                  : t(
                      "使用兼容的直连设备程序",
                      "Use a compatible direct video program",
                    )}
            </span>
          </div>
        )}
        {c.grid && fresh && <div className="camera-grid" aria-hidden="true" />}
        {fresh && (
          <span className="live-video-badge">
            ● {c.source === "peer" ? "DIRECT" : "LOCAL"} ·{" "}
            {cvFresh
              ? `${camera.detections.boxes.length} BOXES`
              : c.source === "browser"
                ? t("未接入识别", "NO DETECTOR")
                : t("等待识别", "CV WAITING")}
          </span>
        )}
      </div>
      <div className="camera-specs" aria-live="polite">
        <span>
          {c.source === "browser"
            ? t("电脑摄像头", "Computer camera")
            : c.source === "local"
              ? t("本地视觉程序", "Local vision program")
              : "WebRTC"}
        </span>
        <span>
          {camera.actual?.width
            ? `${camera.actual.width} × ${camera.actual.height}${camera.actual.frameRate ? ` · ${Math.round(camera.actual.frameRate)} fps` : ""}`
            : t("实际规格待采集", "Actual format after capture")}
        </span>
      </div>
      <div className="live-camera-controls">
        <span>{t("画面不上传云端", "Video stays off the cloud")}</span>
        <button
          disabled={!online}
          onClick={() => (busy ? camera.stop() : camera.start())}
        >
          {busy
            ? t("关闭画面", "Stop video")
            : t("开启实时画面", "Start video")}
        </button>
      </div>
      {camera.error && (
        <p className="live-error" role="alert">
          {err
            ? t(...err)
            : c.source === "peer"
              ? camera.error
              : t(
                  "本地画面暂不可用，请检查程序与接口后重试。",
                  "Local video is unavailable. Check the program and endpoint, then retry.",
                )}
        </p>
      )}
      {editing && (
        <CameraSettings camera={camera} onClose={() => setEditing(false)} />
      )}
    </div>
  );
}
