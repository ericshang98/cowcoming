import { Localized } from "../i18n/Language";
import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { useApp } from "../context";
import Character from "../scene/Character";
import { PageLead } from "./Portfolio";
import "./about.css";

export default function About() {
  const { navigate, controller, mobile, tracking, setTracking, paused, setPaused, worldBlocked } = useApp();
  const [status, setStatus] = useState("loading");
  const [greeted, setGreeted] = useState(false);
  useEffect(() => () => controller.queue.clear(), [controller]);
  const greet = () => {
    if (paused || worldBlocked || status !== "ready") return;
    controller.gesture("wave");
    setGreeted(true);
  };
  return (
    <Localized><section className="about-page page" data-pwc-critical="about">
      <PageLead number="03" title="ABOUT">
        Cowcoming：基于 JEV 决策模型的可进化 AI 宠物。
      </PageLead>
      <div className="cowcoming-about-layout">
        <div className="cowcoming-about-model">
          <div className="cowcoming-about-stage">
            <Character
              controller={controller}
              mode="about"
              mobile={mobile}
              ready={status !== "loading"}
              boot
              overlay={worldBlocked}
              onReady={() => setStatus("ready")}
              onError={() => setStatus("error")}
              onTap={greet}
            />
            {status === "loading" && <p className="cowcoming-model-loading" role="status">牛来正在准备…</p>}
          </div>
          <div className="cowcoming-model-controls" aria-label="牛来互动">
            <button onClick={greet} disabled={status !== "ready" || paused || worldBlocked}>挥挥手</button>
            {!mobile && <button aria-pressed={tracking} onClick={() => setTracking(!tracking)}>
              光标跟随 · {tracking ? "开" : "关"}
            </button>}
            <button aria-pressed={paused} onClick={() => setPaused(!paused)}>
              {paused ? "继续动画" : "暂停动画"}
            </button>
          </div>
          <p className="cowcoming-model-hint" aria-live="polite">
            {status === "error" ? "模型暂时未能加载，可重试或继续阅读项目介绍。"
              : paused ? "动画已暂停，继续后可以和牛来打招呼。"
              : greeted ? "牛来向你挥挥手。左右拖动，看看它的样子。"
              : "点击牛来打招呼 · 左右拖动转身"}
          </p>
        </div>
        <article className="cowcoming-about-copy">
          <h1>Cowcoming</h1>
          <span className="eyebrow">感知、决策，在互动中进化。</span>
          <p>一套连接感知、决策与行动的软硬件系统，让不同 IP 拥有自己的回应方式与成长路径。JEV 结合现场状态选择合适的预设行为，再通过角色与硬件呈现回应。</p>
          <div className="small-heading"><span>我们的核心</span><span>03</span></div>
          <div className="cowcoming-about-capabilities">
            <div className="glass"><h2>感知</h2><p>理解用户输入<br />与环境状态</p></div>
            <div className="glass"><h2>决策</h2><p>由 JEV 判断<br />合适的回应</p></div>
            <div className="glass"><h2>进化</h2><p>沿成长树探索<br />不同的形态</p></div>
          </div>
          <div className="cowcoming-about-manifesto glass">
            <span className="small-heading">让每次互动，成为成长的一部分。</span>
            <p>各 IP 定义自己的进化分支，每种形态关联对应的角色模型与互动内容。牛来是当前的展示 IP，我们正以桌面宠物原型验证这套体验。</p>
          </div>
          <button className="cowcoming-about-action" onClick={() => navigate("home")}>
            体验 Cowcoming <ArrowUpRight size={16} />
          </button>
          <p className="cowcoming-about-note">从屏幕中的牛来，认识 Cowcoming。</p>
        </article>
      </div>
    </section></Localized>
  );
}
