import { Localized, useLanguage } from "../i18n/Language";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Download,
  Share2,
} from "lucide-react";
import { useApp } from "../context";
import { Controls, TiltPrompt } from "../components/Chrome";
import NiulaiVoice from "../components/NiulaiVoice";
import "./home-product.css";
export function PageLead({ number, title, children }) {
  return (
    <Localized><div className="page-lead">
      <span>
        {number} / {title}
      </span>
      <p>{children}</p>
    </div></Localized>
  );
}
export function BrandFooter({ trajectory = false }) {
  const { portfolio, mobile } = useApp();
  const brands = trajectory
    ? [
        "2022 DIGITAL DUBAI",
        "2020 MFINE HEALTHCARE",
        "2019 PRIME FOCUS",
        "2018 LET’S SERVICE",
        "2017 PIXELMATTIC",
        "2016 EINFO SOLUTIONS",
      ]
    : portfolio.portfolioData.brands;
  return (
    <Localized><footer className="brand-footer">
      <Controls music={false} />
      <span className="brand-label">
        {trajectory ? (
          "TRAJECTORY"
        ) : (
          <>
            TRUSTED BY <b>90+</b> BRANDS
          </>
        )}
      </span>
      <div className="ticker">
        <div>
          {[...brands, ...brands].map((b, i) => (
            <span key={i}>
              {b} <i>•</i>
            </span>
          ))}
        </div>
      </div>
    </footer></Localized>
  );
}
export function Home() {
  const { mobile, navigate, muted, setMuted, paused, setPaused,
    voiceState, interactionNotice, collection, activeIp, wave } = useApp();
  const { language } = useLanguage();
  const isNiulai = activeIp.id === 'niulai';
  const feedback = voiceState.error || interactionNotice ||
    (voiceState.status === "loading" ? "One moment—getting ready to speak…"
      : voiceState.status === "playing" ? (language === 'zh' ? voiceState.track?.text || voiceState.track?.textEn : voiceState.track?.textEn) : "Press L to interact.");
  return (
    <Localized><section className="home-page" data-pwc-critical="home">
      <h1 className="hero-wordmark">COW COMING</h1>
      <div className="home-tools">
        <Controls />
        {isNiulai ? <><div className="idea-promotion">
          <button onClick={() => navigate("blog")}>WORLD ↗</button>
          <span>收集星光 · 解锁第一声妈妈</span>
        </div>
        <button className="latest-drop" onClick={() => navigate("blog")}>
          <span>星光</span> {collection.collected.length}/27 · {collection.unlocked ? "已学会叫妈妈" : "继续收集"} →
        </button>
        </> : <div className="idea-promotion"><button onClick={wave}>{activeIp.actionLabel[language === 'en' ? 1 : 0]}</button><span>{language === 'en' ? 'Click the character for a short reply' : '左键点人物，听一句短回应'}</span></div>}
      </div>
      <div className="greeting home-product">
        <span className="eyebrow">POWERED BY JEV</span>
        <h2>基于 JEV 决策模型的<br />可进化 AI 宠物。</h2>
        <p className="home-product-description">
          An evolving AI pet built on the JEV decision model, connecting perception, decisions and actions
          to bring companionship into everyday life.
        </p>
        <button className="home-product-link" onClick={() => navigate("about")}>
          Explore JEV <ArrowUpRight size={16} aria-hidden="true" />
        </button>
        {feedback && <div className="home-product-feedback" role="status">{feedback}</div>}
        {muted && feedback && <button className="interaction-resume" onClick={() => setMuted(false)}>Sound off · Unmute</button>}
        {paused && feedback && <button className="interaction-resume" onClick={() => setPaused(false)}>Animation paused · Resume</button>}
      </div>
      {isNiulai && <NiulaiVoice />}
      {mobile && isNiulai && <TiltPrompt />}
    </section></Localized>
  );
}
export function ProjectDetail({ id }) {
  const { portfolio, closeDetail, openProject, openChat } = useApp(),
    p = portfolio.projects.find((x) => x.id === id),
    [slide, setSlide] = useState(0),
    [zoom, setZoom] = useState(false),
    [copied, setCopied] = useState(false),
    [question, setQuestion] = useState("");
  const scroller = useRef();
  useEffect(() => {
    setSlide(0);
    setZoom(false);
    scroller.current?.scrollTo(0, 0);
  }, [id]);
  useEffect(() => {
    if (!zoom) return;
    const closeZoom = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopImmediatePropagation();
        setZoom(false);
      }
    };
    addEventListener("keydown", closeZoom, true);
    return () => removeEventListener("keydown", closeZoom, true);
  }, [zoom]);
  if (!p) return null;
  const images = p.images?.length ? p.images : [p.img],
    idx = portfolio.projects.indexOf(p),
    next = portfolio.projects[(idx + 1) % portfolio.projects.length];
  return (
    <Localized><section className="detail-layer" data-pwc-critical="project-detail">
      <div className="detail-toolbar">
        <button onClick={closeDetail} aria-label="Close project">
          <ChevronLeft size={15} />
          back
        </button>
        <div className="detail-travel">
          <button
            aria-label="Share project"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(location.href);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              } catch {
                setCopied(false);
              }
            }}
          >
            <Share2 size={14} />
            {copied ? "Copied" : "Share"}
          </button>
          <button
            aria-label="Previous project"
            onClick={() =>
              openProject(
                portfolio.projects[
                  (idx + portfolio.projects.length - 1) %
                    portfolio.projects.length
                ].id,
              )
            }
          >
            <ChevronLeft size={16} />
          </button>
          <span>{String(idx + 1).padStart(2, "0")} / 08</span>
          <button
            aria-label="Next project"
            onClick={() => openProject(next.id)}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <article ref={scroller} className="project-detail-scroll">
        <div className="project-detail-header">
          <span className="project-id">● {p.id}</span>
          <h1>{p.name}</h1>
          <p>
            {p.role} <i>·</i> {p.date.replaceAll("_", " ")}
          </p>
        </div>
        <div className="project-detail-grid">
          <div className="project-main-column">
            <div className="detail-media">
              <button
                className="large-image"
                onClick={() => setZoom(true)}
                aria-label="Enlarge project image"
              >
                <img src={images[slide]} alt={`${p.name} image ${slide + 1}`} />
                <span>CLICK TO EXPAND</span>
              </button>
              {images.length > 1 && (
                <div className="carousel-controls">
                  <button
                    aria-label="Previous image"
                    onClick={() =>
                      setSlide((slide + images.length - 1) % images.length)
                    }
                  >
                    <ChevronLeft />
                  </button>
                  <span>
                    {slide + 1} / {images.length}
                  </span>
                  <button
                    aria-label="Next image"
                    onClick={() => setSlide((slide + 1) % images.length)}
                  >
                    <ChevronRight />
                  </button>
                </div>
              )}
            </div>
            <p className="confidential-note">
              ♧ Live, confidential work (much of it sensitive government) — the
              real screens can’t be public yet.
              <br />
              Written approval to share some is in progress; until then,{" "}
              <a
                href="https://cal.com/sayandeep-bose"
                target="_blank"
                rel="noreferrer"
              >
                book a private walkthrough →
              </a>
            </p>
            <p className="project-decision">{p.decision}</p>
            <div className="project-story">
              {p.deepContent.map((b, i) => (
                <section key={i}>
                  <span className="eyebrow">
                    • {String(i + 1).padStart(2, "0")} ·{" "}
                    {b.title.replaceAll("_", " ")}
                  </span>
                  <p>{b.content}</p>
                </section>
              ))}
            </div>
          </div>
          <aside className="project-sidebar">
            <section className="glass glance-card">
              <span className="eyebrow">AT A GLANCE</span>
              <dl className="project-facts">
                <div>
                  <dt>ROLE</dt>
                  <dd>{p.role}</dd>
                </div>
                <div>
                  <dt>TIMELINE</dt>
                  <dd>{p.date.replaceAll("_", " ")}</dd>
                </div>
                <div>
                  <dt>{p.impact?.label}</dt>
                  <dd>{p.impact?.value}</dd>
                </div>
              </dl>
            </section>
            <section className="glass stack-card">
              <span className="eyebrow">STACK</span>
              <div className="tags">
                {p.techStack.map((t) => (
                  <span key={t}>{t.replaceAll("_", " ")}</span>
                ))}
              </div>
            </section>
            <section className="glass project-ask">
              <span className="eyebrow">● ASK FUCH</span>
              <p>
                Curious about this project or Sayandeep’s role
                <br />
                on it? Ask away.
              </p>
              <div className="project-questions">
                {[
                  "What did he actually do here?",
                  "What was the impact?",
                  "What was the hardest part?",
                ].map((q) => (
                  <button key={q} onClick={() => openChat(`${q} (${p.name})`)}>
                    {q}
                  </button>
                ))}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (question.trim()) openChat(`${question} (${p.name})`);
                }}
              >
                <span>$</span>
                <input
                  aria-label="Ask about this project"
                  placeholder="ask anything…"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                />
                <button aria-label="Send project question">
                  <ArrowUpRight size={16} />
                </button>
              </form>
            </section>
            <div className="next-project">
              <button onClick={() => openProject(next.id)}>
                <span className="eyebrow">NEXT ARTIFACT</span>
                <strong>{next.name}</strong>
                <ArrowUpRight size={18} />
              </button>
            </div>
          </aside>
        </div>
      </article>
      {zoom && (
        <div className="lightbox" onClick={() => setZoom(false)}>
          <button aria-label="Close enlarged image">
            <X />
          </button>
          <img src={images[slide]} alt={p.name} />
        </div>
      )}
    </section></Localized>
  );
}
export function SearchDialog() {
  const { portfolio, ideas, openProject, openIdea, setSearch } = useApp();
  const [q, setQ] = useState("");
  const ps = portfolio.projects.filter((p) =>
      (p.name + " " + p.decision).toLowerCase().includes(q.toLowerCase()),
    ),
    is = ideas.filter(
      (p) =>
        p.available &&
        (p.title + " " + p.tagline).toLowerCase().includes(q.toLowerCase()),
    );
  return (
    <Localized><div className="window-backdrop" onClick={() => setSearch(false)}>
      <section
        className="search-dialog glass"
        role="dialog"
        aria-modal="true"
        aria-label="Search portfolio"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <Search size={20} />
          <input
            autoFocus
            placeholder="Search projects, ideas, experiences…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button onClick={() => setSearch(false)} aria-label="Close search">
            <X />
          </button>
        </div>
        <div className="search-results">
          {ps.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setSearch(false);
                openProject(p.id);
              }}
            >
              <span>PROJECT</span>
              <strong>{p.name}</strong>
              <ArrowUpRight size={17} />
            </button>
          ))}
          {is.slice(0, 12).map((i) => (
            <button
              key={i.id}
              onClick={() => {
                setSearch(false);
                openIdea(i.id);
              }}
            >
              <span>WEEK {i.week}</span>
              <strong>{i.title}</strong>
              <ArrowUpRight size={17} />
            </button>
          ))}
          {!ps.length && !is.length && (
            <p>No results for “{q}”. Try a project name or topic.</p>
          )}
        </div>
      </section>
    </div></Localized>
  );
}
