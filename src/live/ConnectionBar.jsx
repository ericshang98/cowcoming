import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link2, X, Unplug } from "lucide-react";
import { useLanguage } from "../i18n/Language";
import "./live.css";

export function LiveDialog({ title, children, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    ref.current.showModal();
    return () => {
      ref.current?.close();
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return createPortal(
    <dialog
      ref={ref}
      className="live-dialog"
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <header>
        <h2>{title}</h2>
        <button aria-label="Close" onClick={onClose}>
          <X size={19} />
        </button>
      </header>
      {children}
    </dialog>,
    document.body,
  );
}
export default function ConnectionBar({ live }) {
  const { language } = useLanguage(),
    t = (zh, en) => (language === "zh" ? zh : en);
  const [open, setOpen] = useState(false),
    [key, setKey] = useState("");
  const [relay, setRelay] = useState(
    live.relay || import.meta.env.VITE_COWCOMING_RELAY_URL || "",
  );
  const [remember, setRemember] = useState(true);
  useEffect(() => {
    if (live.status === "connected" && live.snapshot) setOpen(false);
  }, [live.status, live.snapshot?.roomId]);
  const label =
    live.status === "connected"
      ? live.online
        ? t("电脑已连接", "DEVICE ONLINE")
        : t("等待电脑接入", "WAITING FOR DEVICE")
      : live.status === "connecting"
        ? t("正在连接", "CONNECTING")
        : live.status === "reconnecting"
          ? t("正在重连", "RECONNECTING")
          : t("连接我的牛来", "CONNECT MY 牛来");
  return (
    <>
      <div className="live-connection">
        <button onClick={() => setOpen(true)}>
          <Link2 size={14} />
          <span>{label}</span>
        </button>
        {live.snapshot && (
          <span className="live-room-name">{live.snapshot.label}</span>
        )}
        {live.status === "connected" && (
          <button
            aria-label={t("断开连接", "Disconnect")}
            onClick={live.disconnect}
          >
            <Unplug size={14} />
          </button>
        )}
      </div>
      {live.error && (
        <div className="live-error" role="alert">
          {live.error}
          <button aria-label="Dismiss error" onClick={live.clearError}>
            ×
          </button>
        </div>
      )}
      {open && (
        <LiveDialog
          title={t("连接你的牛来", "Connect your 牛来")}
          onClose={() => setOpen(false)}
        >
          <p>
            {t(
              "输入服务器为这个设备生成的网页密钥。朋友的本地程序使用独立的设备密钥。",
              "Enter the browser key issued for this device. Your local script uses a separate device key.",
            )}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              live.connect(relay.trim(), key.trim(), remember);
            }}
          >
            <label>
              {t("实时服务地址", "Relay URL")}
              <input
                type="url"
                value={relay}
                onChange={(e) => setRelay(e.target.value)}
                placeholder="https://your-relay.workers.dev"
                required
                autoFocus
              />
            </label>
            <label>
              {t("网页连接密钥", "Browser connection key")}
              <input
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="cw1.browser.…"
                required
                autoComplete="off"
                spellCheck="false"
              />
            </label>
            <label className="live-checkbox">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              {t(
                "本标签页记住连接，刷新后恢复",
                "Remember in this tab and reconnect after refresh",
              )}
            </label>
            {live.error && (
              <p className="live-error" role="alert">
                {live.error}
              </p>
            )}
            <p role="status">{label}</p>
            <footer>
              <button type="button" onClick={() => setOpen(false)}>
                {t("关闭", "Close")}
              </button>
              <button
                className="live-primary"
                type="submit"
                disabled={live.status === "connecting"}
              >
                {t("连接", "Connect")}
              </button>
            </footer>
          </form>
          <div className="live-kit-links">
            <a href="/downloads/cowcoming-device.tar.gz" download>
              {t("下载 Python 接入示例", "Download Python device kit")}
            </a>
            <a
              href="/downloads/device-protocol.md"
              target="_blank"
              rel="noreferrer"
            >
              {t("查看接口文档", "Read the API guide")}
            </a>
          </div>
          <small>
            {t(
              "连接后可以同步状态；摄像头需要另外点击开启。密钥不会放进页面链接。",
              "State sync starts after connection. Start the camera separately. Keys are never placed in page links.",
            )}
          </small>
        </LiveDialog>
      )}
    </>
  );
}
