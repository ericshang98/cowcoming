import { Localized } from "../i18n/Language";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  MessageSquare,
  Send,
  ChevronLeft,
  Check,
  CalendarDays,
  MapPin,
  Mail,
  Linkedin,
  Dribbble,
} from "lucide-react";
import { useApp } from "../context";
import Character from "../scene/Character";
import { PageLead } from "./Portfolio";
import { Controls } from "../components/Chrome";
import "./contact-left.css";
import { topics, questions, validateAnswer } from "./contact-flow.mjs";
export default function Contact() {
  const { controller, portfolio, navigate, mobile, activeIp, tap, worldBlocked } = useApp();
  const [modelReady, setModelReady] = useState(false);
  useEffect(() => setModelReady(false), [activeIp.id]);
  const [topic, setTopic] = useState(null),
    [step, setStep] = useState(0),
    [answers, setAnswers] = useState({}),
    [value, setValue] = useState(""),
    [phase, setPhase] = useState("questions"),
    [error, setError] = useState("");
  const input = useRef(),
    scroll = useRef();
  const qs = questions[topic] || [],
    q = qs[step];
  useEffect(() => {
    setValue(answers[q?.key] || "");
    setError("");
    requestAnimationFrame(() => {
      input.current?.focus({ preventScroll: true });
      scroll.current?.scrollTo({ top: 1e6, behavior: "smooth" });
    });
  }, [topic, step, phase]);
  function start(id) {
    setTopic(id);
    setStep(0);
    setAnswers({});
    setPhase("questions");
    setError("");
  }
  function next(v = value) {
    const err = validateAnswer(q, v);
    if (err) {
      setError(err);
      return;
    }
    setAnswers({ ...answers, [q.key]: v.trim() });
    controller.gesture("nod", "conversation");
    if (step === qs.length - 1) setPhase("review");
    else setStep(step + 1);
  }
  async function send() {
    setPhase("sending");
    setError("");
    const endpoint = import.meta.env.VITE_CONTACT_ENDPOINT;
    if (!endpoint) {
      setPhase("error");
      setError(
        "Message not sent. Delivery is not connected in this local preview. You can copy your message or open your email app.",
      );
      return;
    }
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: topic, ...answers }),
        signal: AbortSignal.timeout(15000),
      });
      const result = await response.json();
      if (!response.ok || result.delivered !== true)
        throw Error("Delivery was not confirmed.");
      setPhase("success");
      controller.gesture("cheer", "conversation");
    } catch (e) {
      setPhase("unknown");
      setError(
        "Delivery could not be confirmed. Please check before retrying to avoid sending twice.",
      );
    }
  }
  const summary = qs
    .map((x) => `${x.label}: ${answers[x.key] || "—"}`)
    .join("\n");
  return (
    <Localized><section className="contact-page page" data-pwc-critical="contact">
      <PageLead number="03" title="VOTE US">
        牛来参加 EvoTavern 进化酒馆，期待你的一票。
      </PageLead>
      {mobile && <div className="contact-character">
        <Character controller={controller} mode="contained" mobile boot
          ready={modelReady} overlay={worldBlocked}
          modelAsset={activeIp.model} characterId={activeIp.id}
          onReady={() => setModelReady(true)}
          onTap={activeIp.id !== 'niulai' ? tap : undefined} />
      </div>}
      <div className="contact-layout">
        <div className="conversation glass">
          <header>
            <div className="conversation-mark">
              <MessageSquare size={20} />
            </div>
            <div>
              <h2>Vote for 牛来</h2>
              <p>EvoTavern 进化酒馆 · 参赛项目</p>
            </div>
            <div className="conversation-meta">
              <span>深圳场</span>
              {topic && phase === "questions" && (
                <span>
                  {step + 1} / {qs.length}
                </span>
              )}
            </div>
          </header>
          <div className="conversation-scroll" ref={scroll}>
            {!topic ? (
              <>
                <div className="bubble vote-team-bubble">
                  <p>嗨，我是牛来。</p>
                  <h2>喜欢我，就给我投一票。</h2>
                  <h3 className="vote-team-name"><span>23号</span><span>犇犇队</span></h3>
                  <span className="vote-team-pronunciation">bēn bēn</span>
                </div>
                <div className="intent-options">
                  {[
                    { id: "vote", title: "", hint: "", disabled: true },
                    { id: "event", title: "看看这场黑客松", hint: "EvoTavern · 深圳场", action: () => window.open("https://hackathon.evomap.ai/shenzhen", "_blank", "noopener,noreferrer") },
                    { id: "hello", title: "先和牛来打个招呼", hint: "体验牛来的回应", action: () => navigate("home") },
                  ].map((t) => (
                    <button
                      key={t.id}
                      disabled={t.disabled}
                      onClick={t.action}
                      className={t.disabled ? "vote-blank" : undefined}
                      aria-label={t.disabled ? "投票（暂不可用）" : undefined}
                    >
                      {!t.disabled && <>
                        <span>
                          <strong>{t.title}{t.id === "event" && <span className="event-link-label">hackathon.evomap.ai</span>}</strong>
                          <small>{t.hint}</small>
                        </span>
                        <ArrowRight size={18} />
                      </>}
                    </button>
                  ))}
                </div>
              </>
            ) : phase === "questions" ? (
              <>
                <div className="bubble">
                  Hey — I’m Fuch. What brings you here?
                </div>
                <div className="bubble visitor">
                  {topics.find((t) => t.id === topic)?.title}
                </div>
                {qs.slice(0, step).map((item, i) => (
                  <div key={item.key}>
                    <div className="bubble">{item.prompt}</div>
                    <button
                      className="bubble visitor answer-edit"
                      onClick={() => setStep(i)}
                      title="Edit reply"
                    >
                      {answers[item.key] || "Skipped"} <small>Edit</small>
                    </button>
                  </div>
                ))}
                <div className="bubble current-question">{q.prompt}</div>
                {q.choices ? (
                  <div className="choice-options">
                    {q.choices.map((choice, i) => (
                      <button key={choice} onClick={() => next(choice)}>
                        <kbd>{i + 1}</kbd>
                        {choice}
                        <ArrowRight size={16} />
                      </button>
                    ))}
                  </div>
                ) : (
                  <form
                    className="contact-composer"
                    onSubmit={(e) => {
                      e.preventDefault();
                      next();
                    }}
                  >
                    {q.multiline ? (
                      <textarea
                        ref={input}
                        aria-label={q.label}
                        placeholder={q.placeholder}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                            e.preventDefault();
                            next();
                          }
                        }}
                      />
                    ) : (
                      <input
                        ref={input}
                        type="text"
                        inputMode={q.type === "email" ? "email" : "text"}
                        autoComplete={
                          q.key === "email"
                            ? "email"
                            : q.key === "name"
                              ? "name"
                              : "off"
                        }
                        aria-label={q.label}
                        placeholder={q.placeholder}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                      />
                    )}
                    <button type="submit" aria-label="Continue conversation">
                      <ArrowRight size={19} />
                    </button>
                  </form>
                )}
                {q.optional && (
                  <button className="text-button" onClick={() => next("")}>
                    Skip this question
                  </button>
                )}
                <small className="contact-hint">
                  You can edit your replies as we go.
                </small>
              </>
            ) : (
              <>
                <h2>
                  {phase === "success"
                    ? "Message delivered."
                    : phase === "sending"
                      ? "Sending your message…"
                      : phase === "review"
                        ? "Everything look right?"
                        : "Your message is saved here."}
                </h2>
                {phase === "success" ? (
                  <p>Thanks for reaching out. Sayandeep will be in touch.</p>
                ) : (
                  <dl className="review-answers">
                    {qs.map((item, i) => (
                      <div key={item.key}>
                        <dt>{item.label}</dt>
                        <dd>{answers[item.key] || "—"}</dd>
                        <button
                          onClick={() => {
                            setStep(i);
                            setPhase("questions");
                          }}
                        >
                          Edit
                        </button>
                      </div>
                    ))}
                  </dl>
                )}
                {phase === "review" && (
                  <button className="primary-button" onClick={send}>
                    Send message <Send size={16} />
                  </button>
                )}
                {["error", "unknown"].includes(phase) && (
                  <>
                    <p className="form-error" role="alert">
                      {error}
                    </p>
                    <div className="delivery-actions">
                      <a
                        className="outline-button"
                        href={`mailto:${portfolio.portfolioData.contact.email}?subject=${encodeURIComponent(topics.find((t) => t.id === topic).title)}&body=${encodeURIComponent(summary)}`}
                      >
                        Open email app <ArrowUpRight size={15} />
                      </a>
                      <button
                        className="outline-button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(summary);
                            setError("Message copied. It has not been sent.");
                          } catch {
                            setError(
                              "Copy unavailable. Select and copy the replies above.",
                            );
                          }
                        }}
                      >
                        Copy message
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
            {error && phase === "questions" && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
          </div>
          {topic && (
            <footer>
              <button
                onClick={() => {
                  setTopic(null);
                  setError("");
                }}
              >
                Change topic
              </button>
              {step > 0 && phase === "questions" && (
                <button onClick={() => setStep(step - 1)}>
                  <ChevronLeft size={13} />
                  Back
                </button>
              )}
            </footer>
          )}
        </div>
        <aside className="contact-info vote-story">
          <div className="vote-event glass">
            <span className="vote-label">WE ARE BUILDING AT</span>
            <h2 className="vote-event-title"><img src="/images/evotavern/shenzhen-lockup.png" alt="第 4 届 EvoTavern 进化酒馆 Agent 黑客松" width="1129" height="512" /></h2>
            <p className="vote-edition">第 4 届 Agent 黑客松 · 深圳场</p>
            <div className="vote-event-meta">
              <span><CalendarDays size={14} />2026.09.21 — 09.24</span>
              <span><MapPin size={14} />深圳 · The Final Round</span>
            </div>
            <a href="https://hackathon.evomap.ai/shenzhen" target="_blank" rel="noopener noreferrer">了解这场黑客松 <ArrowUpRight size={16} /></a>
          </div>
          <div className="vote-idea glass">
            <span className="vote-label">MEET NIULAI</span>
            <h2>让一次回应，<br />成为一次相遇。</h2>
            <p>从转头看向你，到用动作和声音回应你。我们想让牛来从屏幕走进现实，成为一个有性格、能互动的小家伙。</p>
            <button onClick={() => navigate("home")}>先和牛来打个招呼 <ArrowRight size={16} /></button>
          </div>
        </aside>
      </div>
      <footer className="brand-footer">
        <Controls music={false} />
        <span className="brand-label">EVOTAVERN · 深圳场</span>
        <div className="ticker">
          <div>
            {[...Array(2)].flatMap((_, repeat) => [
              "EvoTavern 进化酒馆", "2026.09.21 — 09.24", "深圳 · The Final Round",
              "CYBERBODY", "NEW LIFE", "GHOST NETWORK", "SECTION 9", "为牛来加油",
            ].map((text, i) => <span key={`${repeat}-${i}`}>{text} <i>•</i></span>))}
          </div>
        </div>
      </footer>
    </section></Localized>
  );
}
