import { useEffect, useRef, useState } from "react";
import { Camera, MessageSquare, Cpu, SlidersHorizontal } from "lucide-react";
import { useLanguage } from "../i18n/Language";
import ConnectionBar from "./ConnectionBar";
import DeviceDebug from "./DeviceDebug";
import CameraView from "./CameraView";
import usePeerCamera from "./usePeerCamera";
export default function LiveObservationPanel({ live }) {
  const { language } = useLanguage(),
    t = (zh, en) => (language === "zh" ? zh : en);
  const [tab, setTab] = useState("vision"),
    [debug, setDebug] = useState(false),
    [input, setInput] = useState("");
  const messages = useRef(null),
    follow = useRef(true),
    tabRefs = useRef([]);
  const camera = usePeerCamera(live),
    s = live.snapshot;
  const decision = s.events.findLast((e) => e.type === "decision");
  const action = s.events.findLast(
    (e) => e.type === "action" && e.decisionId === decision?.decisionId,
  );
  const observation = s.events.findLast((e) => e.type === "observation");
  const result = s.events.findLast(
    (e) =>
      e.type === "command.result" && e.commandId === live.receipt?.commandId,
  );
  const applied = live.online && s.appliedRevision === s.profile.revision;
  useEffect(() => {
    if (messages.current && follow.current)
      messages.current.scrollTop = messages.current.scrollHeight;
  }, [s.messages, tab]);
  const states = {
    ready: t("就绪", "READY"),
    offline: t("离线", "OFFLINE"),
    error: t("异常", "ERROR"),
    unknown: t("未知", "UNKNOWN"),
  };
  return (
    <aside
      className="work-list evolution-technology observation-panel live-observation"
      aria-label={t("实时硬件观察", "Live hardware observation")}
    >
      <div className="observer-heading">
        <span>
          {s.device.simulation
            ? t("脚本模拟 · 无真实动作", "SIMULATION · NO PHYSICAL ACTION")
            : "LIVE DEVICE"}
        </span>
        <button className="live-lab-button" onClick={() => setDebug(true)}>
          <SlidersHorizontal size={12} />
          {t("调试", "DEVICE LAB")}
        </button>
      </div>
      <ConnectionBar live={live} />
      <div
        className="observer-tabs"
        role="tablist"
        aria-label="Observation view"
      >
        {[
          ["vision", "Vision / Action", Camera],
          ["language", "Large Language Model", MessageSquare],
        ].map(([id, label, Icon], i) => (
          <button
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            key={id}
            id={`live-tab-${id}`}
            role="tab"
            aria-selected={tab === id}
            aria-controls={`live-panel-${id}`}
            tabIndex={tab === id ? 0 : -1}
            onClick={() => setTab(id)}
            onKeyDown={(e) => {
              if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
                e.preventDefault();
                const next = e.key === "Home" ? 0 : e.key === "End" ? 1 : 1 - i;
                setTab(next ? "language" : "vision");
                tabRefs.current[next]?.focus();
              }
            }}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>
      <div className="live-component-status">
        <span>
          ARM {live.online ? states[s.device.hardware] : states.offline}
        </span>
        <span>JEV {live.online ? states[s.device.jev] : states.offline}</span>
        <span>
          LLM {live.online ? states[s.device.language] : states.offline}
        </span>
      </div>
      <div className="work-scroll observer-scroll">
        <section
          id="live-panel-vision"
          role="tabpanel"
          aria-labelledby="live-tab-vision"
          hidden={tab !== "vision"}
          className="glass observer-view live-vision"
        >
          <div className="observer-card-heading">
            <span>01 / VISION</span>
            <span>{t("电脑端相机", "LOCAL CAMERA")}</span>
          </div>
          <CameraView camera={camera} online={live.online} />
          <div className="observer-action">
            <span>ACTION</span>
            <p>
              {action
                ? `${action.status} · ${action.detail}`
                : t("暂无动作回执", "No action feedback yet")}
            </p>
          </div>
        </section>
        <section
          id="live-panel-language"
          role="tabpanel"
          aria-labelledby="live-tab-language"
          hidden={tab !== "language"}
          className="glass observer-view"
        >
          <div className="observer-card-heading">
            <span>01 / LANGUAGE</span>
            <span>{t("来自电脑端进程", "FROM LOCAL PROCESS")}</span>
          </div>
          <div
            className="observer-messages live-messages"
            ref={messages}
            onScroll={(e) => {
              const el = e.currentTarget;
              follow.current =
                el.scrollHeight - el.scrollTop - el.clientHeight < 30;
            }}
          >
            {s.messages.length ? (
              s.messages.map((m) => (
                <div className="observer-message" key={m.id}>
                  <span className="observer-avatar">
                    {m.role === "assistant"
                      ? "LLM"
                      : m.role === "user"
                        ? "YOU"
                        : "SYS"}
                  </span>
                  <div>
                    <span className="observer-message-label">
                      {m.role}
                      <small>{m.status}</small>
                    </span>
                    <p>
                      {m.text}
                      {m.status === "streaming" && (
                        <span className="observer-caret" />
                      )}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="live-empty">
                {t(
                  "等待本机程序发送输入与回复。",
                  "Waiting for input and replies from the local process.",
                )}
              </p>
            )}
          </div>
        </section>
        <section className="glass observer-jev">
          <div className="observer-jev-heading">
            <div className="observer-jev-icon">
              <Cpu size={18} />
            </div>
            <div>
              <h2>
                JEV <span>DECISION</span>
              </h2>
            </div>
            <span className="observer-status">
              {applied
                ? `PROMPT v${s.appliedRevision}`
                : t("等待提示词应用", "PROMPT PENDING")}
            </span>
          </div>
          <div className="observer-perception">
            <span>OBSERVATION</span>
            <p>
              {observation?.text ||
                t("等待感知摘要", "Waiting for observations")}
            </p>
          </div>
          <div className="observer-choice">
            <div>
              <span>{t("选择的动作", "SELECTED ACTION")}</span>
              <strong>{decision?.actionId || "—"}</strong>
            </div>
            <code>{live.lastAnimation?.clip || "—"}</code>
          </div>
          <p className="observer-reason">
            {decision?.summary ||
              t(
                "本机 JEV 将在允许动作中选择。",
                "Local JEV chooses from the allowed actions.",
              )}
          </p>
          <div className="observer-jev-foot">
            <span>
              {t("动画是动作的视觉表达", "ANIMATION VISUALIZES THE DECISION")} · {live.lastAnimation?.status || "—"}
            </span>
            <span>{t("实际执行看回执", "HARDWARE REPORTS EXECUTION")}</span>
          </div>
        </section>
        <form
          className="live-input"
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim()) {
              live.command({ command: "interact", input: input.trim() });
              setInput("");
            }
          }}
        >
          <input
            aria-label={t("发送给本机程序的消息", "Message to local process")}
            placeholder={t("和牛来说点什么…", "Say something to 牛来…")}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={2000}
          />
          <button disabled={!applied || !input.trim()}>
            {t("发送", "Send")}
          </button>
        </form>
        <div className="live-command-status">
          <span role="status">
            {result
              ? `${result.status} · ${result.detail}`
              : live.receipt
                ? t("已发送，等待电脑回执", "Sent; waiting for local feedback")
                : t("输入交给本机 JEV / LLM", "Input goes to local JEV / LLM")}
          </span>
          <button
            className="live-stop"
            disabled={!live.online}
            onClick={() => live.command({ command: "stop" })}
          >
            {t("停止", "Stop")}
          </button>
        </div>
        <p className="observer-note">
          {!live.online
            ? t(
                "设备离线，以上为最后已知状态。",
                "Device offline. Showing the last known state.",
              )
            : t(
                "形态与文本经云端同步；画面与检测框通过直连传输。",
                "Forms and text sync through the cloud; video and detections travel directly.",
              )}
        </p>
      </div>
      {debug && <DeviceDebug live={live} onClose={() => setDebug(false)} />}
    </aside>
  );
}
