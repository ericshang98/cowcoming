import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { CAMERA_DEFAULTS, localCameraUrl } from "./camera-config.mjs";
import { useLanguage } from "../i18n/Language";
export default function CameraSettings({ camera, onClose }) {
  const { language } = useLanguage(),
    t = (zh, en) => (language === "zh" ? zh : en);
  const [draft, setDraft] = useState({ ...camera.config }),
    [token, setToken] = useState(camera.token),
    [error, setError] = useState("");
  const dialog = useRef(null),
    patch = (key, value) => setDraft((d) => ({ ...d, [key]: value }));
  useEffect(() => {
    const before = document.activeElement;
    dialog.current.showModal();
    camera.enumerate();
    return () => before?.focus();
  }, []);
  const select = (key, label, options) => (
    <label>
      {label}
      <select
        aria-label={label}
        value={draft[key]}
        onChange={(e) =>
          patch(
            key,
            ["rotation", "fps", "refresh"].includes(key)
              ? Number(e.target.value)
              : e.target.value,
          )
        }
      >
        {options.map(([value, name]) => (
          <option key={value} value={value}>
            {name}
          </option>
        ))}
      </select>
    </label>
  );
  const range = (key, label, min, max, step = 1) => (
    <label>
      {label} · {draft[key]}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={draft[key]}
        onChange={(e) => patch(key, Number(e.target.value))}
      />
    </label>
  );
  const toggle = (key, label) => (
    <label className="live-checkbox">
      <input
        type="checkbox"
        checked={draft[key]}
        onChange={(e) => patch(key, e.target.checked)}
      />
      {label}
    </label>
  );
  return (
    <dialog
      ref={dialog}
      className="live-dialog camera-settings"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === dialog.current) {
          const r = dialog.current.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
      aria-labelledby="camera-settings-title"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (draft.source === "local") {
            try {
              localCameraUrl(draft.url);
            } catch {
              setError(
                t(
                  "请输入本机 localhost 或 127.0.0.1 的画面接口，不带密钥或查询参数。",
                  "Use a localhost or 127.0.0.1 endpoint without URL credentials or query parameters.",
                ),
              );
              return;
            }
          }
          camera.apply(draft, token);
          onClose();
        }}
      >
        <header>
          <h2 id="camera-settings-title">
            {t("编辑视觉窗口", "Edit camera window")}
          </h2>
          <button
            type="button"
            aria-label={t("关闭窗口设置", "Close camera settings")}
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </header>
        <p>
          {t(
            "设置只保存在这台电脑的当前浏览器。更换来源或采集规格后，请重新开启画面。",
            "Preferences stay in this browser. Start video again after changing the source or capture format.",
          )}
        </p>
        <fieldset>
          <legend>{t("画面来源", "Video source")}</legend>
          {select("source", t("来源类型", "Source type"), [
            [
              "local",
              t(
                "本地视觉程序（已有采集）",
                "Local vision program (existing capture)",
              ),
            ],
            ["browser", t("电脑 / USB 摄像头", "Computer / USB camera")],
            [
              "peer",
              t("WebRTC 直连（兼容模式）", "WebRTC direct (legacy mode)"),
            ],
          ])}
          {draft.source === "local" && (
            <>
              <label>
                {t("本地画面接口", "Local snapshot URL")}
                <input
                  type="url"
                  required
                  value={draft.url}
                  onChange={(e) => patch("url", e.target.value)}
                />
              </label>
              <label>
                {t("本地画面访问密钥", "Local preview access key")}
                <input
                  type="password"
                  autoComplete="off"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                />
              </label>
              <p>
                {t(
                  "由本地程序提供，留在本次页面内存中。它与绑定房间的 Browser Key 不同。电脑需允许浏览器访问本地网络。",
                  "Provided by the local program; kept only in page memory. This is separate from the room Browser Key. Allow local network access when prompted.",
                )}
              </p>
              {select("refresh", t("画面刷新上限", "Preview refresh limit"), [
                [5, "5 fps"],
                [10, "10 fps"],
                [15, "15 fps"],
                [30, "30 fps"],
              ])}
              <p>
                {t(
                  "采集设备、分辨率和识别模型由本地程序控制。这里调整预览，不修改机械臂或相机驱动。",
                  "The local program controls capture format and detection. These settings change the preview, not the arm or camera driver.",
                )}
              </p>
            </>
          )}
          {draft.source === "browser" && (
            <>
              {select("deviceId", t("摄像头", "Camera device"), [
                ["", t("系统默认摄像头", "System default camera")],
                ...camera.devices
                  .filter((d) => d.deviceId)
                  .map((d, i) => [
                    d.deviceId,
                    d.label || `${t("摄像头", "Camera")} ${i + 1}`,
                  ]),
              ])}
              {draft.deviceId &&
                !camera.devices.some((d) => d.deviceId === draft.deviceId) && (
                  <p>
                    {t(
                      "所选设备当前不可用，请重新选择。",
                      "The selected camera is unavailable. Choose another device.",
                    )}
                  </p>
                )}
              <button
                className="camera-small-button"
                type="button"
                onClick={camera.enumerate}
              >
                {t("刷新设备列表", "Refresh cameras")}
              </button>
              <label>
                {t("期望分辨率", "Requested resolution")}
                <select
                  value={
                    [
                      [0, 0],
                      [640, 480],
                      [1280, 720],
                      [1920, 1080],
                      [3840, 2160],
                    ].some(([w, h]) => draft.width === w && draft.height === h)
                      ? `${draft.width}x${draft.height}`
                      : "custom"
                  }
                  onChange={(e) => {
                    if (e.target.value === "custom") {
                      setDraft((d) => ({ ...d, width: 1280, height: 800 }));
                    } else {
                      const [width, height] = e.target.value
                        .split("x")
                        .map(Number);
                      setDraft((d) => ({ ...d, width, height }));
                    }
                  }}
                >
                  <option value="0x0">
                    {t("设备自动选择", "Device automatic")}
                  </option>
                  <option value="640x480">640 × 480</option>
                  <option value="1280x720">1280 × 720 · HD</option>
                  <option value="1920x1080">1920 × 1080 · Full HD</option>
                  <option value="3840x2160">3840 × 2160 · 4K</option>
                  <option value="custom">{t("自定义", "Custom")}</option>
                </select>
              </label>
              {!!draft.width && (
                <div className="camera-fields">
                  <label>
                    {t("宽度", "Capture width")}
                    <input
                      type="number"
                      min="160"
                      max="7680"
                      required
                      value={draft.width}
                      onChange={(e) => patch("width", Number(e.target.value))}
                    />
                  </label>
                  <label>
                    {t("高度", "Capture height")}
                    <input
                      type="number"
                      min="120"
                      max="4320"
                      required
                      value={draft.height}
                      onChange={(e) => patch("height", Number(e.target.value))}
                    />
                  </label>
                </div>
              )}
              {select("fps", t("期望帧率", "Requested frame rate"), [
                [15, "15 fps"],
                [24, "24 fps"],
                [30, "30 fps"],
                [60, "60 fps"],
              ])}
              <p>
                {t(
                  "开启后才会请求相机权限并显示设备名称。规格以设备实际输出为准；浏览器采集不会自动执行人物识别。",
                  "Starting requests camera permission and reveals device names. Actual output depends on hardware. Browser capture does not automatically run person detection.",
                )}
              </p>
            </>
          )}
          {draft.source === "peer" && (
            <p>
              {t(
                "保留原有设备套件的直连接口，需要对端支持。日常同机使用请选择前两种。",
                "For the existing WebRTC device kit. Use one of the local sources for same-computer display.",
              )}
            </p>
          )}
        </fieldset>
        <fieldset>
          <legend>{t("窗口呈现", "Window appearance")}</legend>
          <label>
            {t("窗口标题", "Window title")}
            <input
              maxLength={40}
              placeholder={t("牛来的视角", "Through its eyes")}
              value={draft.title}
              onChange={(e) => patch("title", e.target.value)}
            />
          </label>
          <div className="camera-fields">
            {select("ratio", t("窗口比例", "Window ratio"), [
              ["auto", t("跟随画面", "Match source")],
              ["16:9", "16:9"],
              ["4:3", "4:3"],
              ["1:1", "1:1"],
              ["9:16", "9:16"],
            ])}
            {select("fit", t("画面填充", "Image fit"), [
              ["contain", t("完整显示", "Show whole image")],
              ["cover", t("填满裁切", "Fill and crop")],
            ])}
          </div>
          {select("rotation", t("旋转", "Rotation"), [
            [0, "0°"],
            [90, "90°"],
            [180, "180°"],
            [270, "270°"],
          ])}
          {range("zoom", t("缩放", "Zoom"), 1, 3, 0.1)}
          {range("brightness", t("亮度", "Brightness"), 50, 150)}
          {range("contrast", t("对比度", "Contrast"), 50, 150)}
          <div className="camera-toggles">
            {toggle(
              "mirror",
              t("镜像画面与标注", "Mirror image and annotations"),
            )}
            {toggle("boxes", t("人物 / 人脸框", "Person / face boxes"))}
            {toggle("points", t("姿态关键点", "Pose keypoints"))}
            {toggle("grid", t("构图辅助线", "Composition grid"))}
          </div>
          <p>
            {t(
              "这些变化只影响显示。镜像、旋转不会改变机械臂的方向或动作含义。",
              "Display adjustments do not change the arm’s directions or action meanings.",
            )}
          </p>
        </fieldset>
        {error && (
          <p className="live-error" role="alert">
            {error}
          </p>
        )}
        <footer>
          <button
            type="button"
            onClick={() => {
              setDraft({ ...CAMERA_DEFAULTS });
              setToken("");
              setError("");
            }}
          >
            {t("恢复默认", "Reset defaults")}
          </button>
          <button type="button" onClick={onClose}>
            {t("取消", "Cancel")}
          </button>
          <button type="submit">{t("保存设置", "Save settings")}</button>
        </footer>
      </form>
    </dialog>
  );
}
