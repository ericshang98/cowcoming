import { useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { useLanguage } from "../i18n/Language";
export default function CameraView({ camera, online }) {
  const { language } = useLanguage(),
    t = (zh, en) => (language === "zh" ? zh : en);
  const video = useRef(null),
    lastFrame = useRef(0);
  const [ratio, setRatio] = useState(16 / 9),
    [now, setNow] = useState(Date.now());
  useEffect(() => {
    const el = video.current;
    if (!el) return;
    el.srcObject = camera.stream;
    lastFrame.current = 0;
    let callback;
    function frame() {
      lastFrame.current = Date.now();
      callback = el.requestVideoFrameCallback?.(frame);
    }
    if (camera.stream) {
      el.play().catch(() => {});
      callback = el.requestVideoFrameCallback?.(frame);
    }
    return () => {
      if (callback) el.cancelVideoFrameCallback?.(callback);
      el.srcObject = null;
    };
  }, [camera.stream]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, []);
  const fresh = camera.status === "live" && now - lastFrame.current < 2500;
  const cvFresh =
    fresh && camera.detections && now - camera.detections.receivedAt < 1000;
  return (
    <>
      <div
        className={`live-camera ${fresh ? "is-live" : ""}`}
        style={{ aspectRatio: ratio }}
      >
        <video
          ref={video}
          autoPlay
          playsInline
          muted
          onTimeUpdate={() => {
            if (!video.current?.requestVideoFrameCallback)
              lastFrame.current = Date.now();
          }}
          onLoadedMetadata={() => {
            const el = video.current;
            if (el.videoWidth && el.videoHeight)
              setRatio(el.videoWidth / el.videoHeight);
          }}
        />
        {!fresh && (
          <div className="live-camera-empty">
            <Camera size={27} strokeWidth={1.2} />
            <strong>
              {camera.status === "connecting"
                ? t("正在建立直连", "Connecting directly…")
                : camera.status === "live"
                  ? t("等待新画面", "Waiting for fresh frames")
                  : t("牛来的视角", "Through its eyes")}
            </strong>
            <span>
              {t(
                "图像与人物检测在电脑端处理",
                "Camera and person detection run locally",
              )}
            </span>
          </div>
        )}
        {cvFresh && (
          <div className="live-cv-layer" aria-label="Local person detections">
            {camera.detections.boxes.map((box, i) => (
              <div
                className="live-cv-box"
                key={box.id ?? i}
                style={{
                  left: `${box.bbox[0] * 100}%`,
                  top: `${box.bbox[1] * 100}%`,
                  width: `${Math.min(box.bbox[2], 1 - box.bbox[0]) * 100}%`,
                  height: `${Math.min(box.bbox[3], 1 - box.bbox[1]) * 100}%`,
                }}
              >
                <span>
                  {String(box.label || "person").slice(0, 30)}
                  {Number.isFinite(box.confidence)
                    ? ` ${Math.round(Math.max(0, Math.min(1, box.confidence)) * 100)}%`
                    : ""}
                </span>
              </div>
            ))}
          </div>
        )}
        {fresh && (
          <span className="live-video-badge">
            ● DIRECT ·{" "}
            {cvFresh
              ? `${camera.detections.boxes.length} DETECTED`
              : "CV WAITING"}
          </span>
        )}
      </div>
      <div className="live-camera-controls">
        <span>
          {t(
            "视频不经云端转发或存储",
            "Video is not relayed or stored in the cloud",
          )}
        </span>
        <button
          disabled={!online}
          onClick={() =>
            ["live", "connecting"].includes(camera.status)
              ? camera.stop()
              : camera.start()
          }
        >
          {["live", "connecting"].includes(camera.status)
            ? t("关闭画面", "Stop video")
            : t("开启实时画面", "Start video")}
        </button>
      </div>
      {camera.error && (
        <p className="live-error" role="alert">
          {camera.error}
        </p>
      )}
    </>
  );
}
