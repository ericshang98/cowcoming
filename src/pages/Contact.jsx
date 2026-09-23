import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  MessageSquare,
  Send,
  ChevronLeft,
  Check,
  CalendarClock,
  Mail,
  Linkedin,
  Dribbble,
} from "lucide-react";
import { useApp } from "../context";
import { PageLead, BrandFooter } from "./Portfolio";
import { topics, questions, validateAnswer } from "./contact-flow.mjs";
export default function Contact() {
  const { controller, portfolio } = useApp();
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
    <section className="contact-page page" data-pwc-critical="contact">
      <PageLead number="04" title="CONTACT">
        Open to freelance and contract work — tell me what you’re building, and
        you’ll hear back within ~6 hours.
      </PageLead>
      <div className="contact-layout">
        <div className="conversation glass">
          <header>
            <div className="conversation-mark">
              <MessageSquare size={20} />
            </div>
            <div>
              <h2>Message Fuch</h2>
              <p>Sayandeep’s assistant</p>
            </div>
            <div className="conversation-meta">
              <span>~6h reply</span>
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
                <div className="bubble">
                  <p>Hey, I’m Fuch.</p>
                  <h2>What brings you here?</h2>
                </div>
                <div className="intent-options">
                  {topics.map((t, i) => (
                    <button key={t.id} onClick={() => start(t.id)}>
                      <span>
                        <strong>{t.title}</strong>
                        <small>{t.hint}</small>
                      </span>
                      <ArrowRight size={18} />
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
        <aside className="contact-info">
          <div className="contact-find-card glass">
            <span className="small-heading">FIND ME</span>
            <div className="contact-links">
              {[
                [
                  "Book a call",
                  "cal.com/sayandeep-bose",
                  "https://cal.com/sayandeep-bose",
                ],
                ["Email", "hello@fuch.ai", "mailto:hello@fuch.ai"],
                [
                  "LinkedIn",
                  "linkedin.com/in/sayandeep-b",
                  "https://www.linkedin.com/in/sayandeep-b/",
                ],
                [
                  "Dribbble",
                  "dribbble.com/fuchai",
                  "https://dribbble.com/fuchai",
                ],
              ].map(([name, label, href], i) => {
                const Icon = [CalendarClock, Mail, Linkedin, Dribbble][i];
                return (
                  <a key={name} href={href} target="_blank" rel="noreferrer">
                    <i className="contact-link-icon">
                      <Icon size={15} />
                    </i>
                    <span>
                      <strong>{name}</strong>
                      <small>{label}</small>
                    </span>
                    <ArrowUpRight size={14} />
                  </a>
                );
              })}
            </div>
          </div>
          <div className="contact-bio-card glass">
            <div className="contact-person">
              <img src="/images/avatar.jpg" alt="Sayandeep Bose" />
              <div>
                <h3>Sayandeep Bose</h3>
                <span>SR. CX SPECIALIST · DUBAI</span>
                <p>
                  <i />
                  Open to freelance
                </p>
              </div>
            </div>
            <span className="small-heading">WHAT I BRING</span>
            <ol className="capability-list">
              <li>
                Product strategy & experience leadership at national scale
              </li>
              <li>Product design, brand identities & design systems</li>
              <li>AI products, designed and engineered end to end</li>
            </ol>
            <div className="contact-location">
              <div>
                <span className="small-heading">WHERE</span>
                <strong>Dubai, UAE</strong>
                <small>GULF STANDARD TIME · ASYNC OK</small>
              </div>
              <div>
                <strong>
                  {new Intl.DateTimeFormat("en", {
                    timeZone: "Asia/Dubai",
                    hour: "numeric",
                    minute: "2-digit",
                  }).format(new Date())}
                </strong>
                <small>HIS LOCAL TIME</small>
              </div>
            </div>
          </div>
        </aside>
      </div>
      <BrandFooter />
    </section>
  );
}
