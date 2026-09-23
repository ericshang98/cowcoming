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
import MouthPreview from "../components/MouthPreview";
export function PageLead({ number, title, children }) {
  return (
    <div className="page-lead">
      <span>
        {number} / {title}
      </span>
      <p>{children}</p>
    </div>
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
    <footer className="brand-footer">
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
    </footer>
  );
}
export function Awards({ single = false }) {
  const { setAwards } = useApp();
  const names = [
    "astonishing",
    "ui",
    "ux",
    "awwwards-honors",
    "innovation",
    "special-kudos",
    "awwwards-nominee",
    "mesh",
    "csswinner",
    "webguru",
    "wall-of-portfolios",
  ];
  return (
    <div className={`award-orbit ${single ? "single" : ""}`}>
      {(single ? ["special-kudos"] : names).map((a, i) => (
        <button
          className={`award award-${i}`}
          key={a}
          aria-label={`${a} — open Awards & Recognition`}
          onClick={() => setAwards(true)}
          onPointerMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            e.currentTarget.style.setProperty(
              "--rx",
              `${-(e.clientY - r.y - r.height / 2) / 7}deg`,
            );
            e.currentTarget.style.setProperty(
              "--ry",
              `${(e.clientX - r.x - r.width / 2) / 7}deg`,
            );
          }}
          onPointerLeave={(e) => {
            e.currentTarget.style.setProperty("--rx", "0deg");
            e.currentTarget.style.setProperty("--ry", "0deg");
          }}
        >
          <img src={`/awards/${a}.svg`} alt={a.replaceAll("-", " ")} />
        </button>
      ))}
    </div>
  );
}
export function Home() {
  const { mobile, navigate, bootDone, ideas, openIdea, snapshot, reaction, setReactionId } =
    useApp();
  const [text, setText] = useState("");
  useEffect(() => {
    if (!bootDone) return;
    let i = 0;
    setText("");
    const id = setInterval(() => {
      i += 1;
      setText(reaction.line.slice(0, i));
      if (i >= reaction.line.length) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [bootDone, reaction]);
  const latest = ideas.filter((x) => x.available).at(-1);
  return (
    <section className="home-page" data-pwc-critical="home">
      <h1 className="hero-wordmark">牛来</h1>
      <Awards single />
      <div className="home-tools">
        <Controls />
        <div className="idea-promotion">
          <button onClick={() => navigate("blog")}>IDEA52 ↗</button>
          <span>AN IDEA FOR EVERY WEEK IN 2026</span>
        </div>
        <button className="latest-drop" onClick={() => openIdea(latest.id)}>
          <span>LATEST</span> WK{latest.week} — {latest.title.toUpperCase()} →
        </button>
      </div>
      <div className="greeting">
        <span className="eyebrow">{snapshot.name}</span>
        <p aria-live="polite">
          {text || reaction.line}
          <i className="typing-caret" />
        </p>
        <div className="suggestions">
          {snapshot.reactions.map((item) => (
            <button
              key={item.id}
              aria-pressed={item.id === reaction.id}
              onClick={() => setReactionId(item.id)}
            >
              {item.chip}
            </button>
          ))}
        </div>
        <MouthPreview />
      </div>
      {mobile && <TiltPrompt />}
    </section>
  );
}
export function Work() {
  const { portfolio, openProject, setSearch } = useApp();
  const [active, setActive] = useState(null);
  const sectors = [
    "Product",
    "Government",
    "Government",
    "Government",
    "Health",
    "Health",
    "Media",
    "Marketplace",
  ];
  return (
    <section className="work-page page" data-pwc-critical="work">
      <PageLead number="02" title="WORK">
        A decade of national-scale work, serving over{" "}
        <strong>12 million people</strong> — where I’ve been, and what I built.
      </PageLead>
      <aside className="career">
        <div className="small-heading">
          <span>CAREER</span>
          <span>06</span>
        </div>
        <ol>
          {portfolio.experiences.map((exp, i) => (
            <li
              key={exp.id}
              className={
                active === i || (active === null && i === 0) ? "current" : ""
              }
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
            >
              <span>{exp.date.replace("Present", "NOW")}</span>
              <strong>
                {
                  [
                    "Digital Dubai",
                    "MFine",
                    "Prime Focus",
                    "Let’s Service",
                    "Pixelmattic",
                    "eInfo Solutions",
                  ][i]
                }
              </strong>
              <small>{exp.role}</small>
            </li>
          ))}
        </ol>
      </aside>
      <div className="work-list">
        <div className="small-heading">
          <span>SELECTED WORK</span>
          <span>08</span>
        </div>
        <div className="work-scroll">
          {portfolio.projects.map((p, i) => (
            <button
              className="project-card glass"
              key={p.id}
              onClick={() => openProject(p.id)}
              onPointerMove={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                e.currentTarget.style.transform = `perspective(700px) rotateX(${(-(e.clientY - r.y - r.height / 2) / r.height) * 2.2}deg) rotateY(${((e.clientX - r.x - r.width / 2) / r.width) * 2.2}deg)`;
              }}
              onPointerLeave={(e) => (e.currentTarget.style.transform = "")}
            >
              <div className="project-art">
                <img src={p.img} alt={p.name} />
              </div>
              <div className="project-copy">
                <div className="project-meta">
                  <span>
                    {String(i + 1).padStart(2, "0")} · {sectors[i]}
                  </span>
                  <b>{p.impact?.value}</b>
                </div>
                <h2>{p.name}</h2>
                <p>{p.decision}</p>
                <div className="tags">
                  {p.techStack.slice(0, 2).map((t) => (
                    <span key={t}>{t.replaceAll("_", " ")}</span>
                  ))}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
      <BrandFooter />
      <button className="search-launch" onClick={() => setSearch(true)}>
        Search <kbd>⌘K</kbd>
      </button>
    </section>
  );
}
export function About() {
  const { portfolio } = useApp();
  return (
    <section className="about-page page" data-pwc-critical="about">
      <PageLead number="03" title="ABOUT">
        The human behind the systems — a decade turning national-scale
        complexity into products people actually <strong>trust.</strong>
      </PageLead>
      <Awards />
      <article className="about-copy">
        <h1>Sayandeep Bose.</h1>
        <span className="eyebrow">
          BUILDER · SR. CX SPECIALIST · DIGITAL DUBAI AUTHORITY
        </span>
        <p>{portfolio.portfolioData.about.introduction}</p>
        <div className="small-heading">
          <span>BY THE NUMBERS</span>
          <span>03</span>
        </div>
        <div className="stats">
          {[
            ["10+", "YEARS IN CX"],
            ["20M+", "ACTIVE USERS"],
            ["13+", "DESIGN AWARDS"],
          ].map(([n, t]) => (
            <div className="glass" key={n}>
              <strong>{n}</strong>
              <span>{t}</span>
            </div>
          ))}
        </div>
        <div className="manifesto glass">
          <span className="small-heading">MANIFESTO</span>
          <p>{portfolio.portfolioData.about.manifesto}</p>
        </div>
        <div className="about-caption">
          CUSTOMER EXPERIENCE · NATIONAL SCALE
          <br />© 2026 SAYANDEEP BOSE · DUBAI
        </div>
      </article>
      <BrandFooter trajectory />
    </section>
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
    <section className="detail-layer" data-pwc-critical="project-detail">
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
    </section>
  );
}
export function AwardsDialog() {
  const { setAwards } = useApp();
  const names = [
    "Special Design Kudos",
    "Best UI Design",
    "Best UX Design",
    "Awwwards Honors",
    "Best Innovation",
    "Site of the Day",
    "Featured on Mesh",
    "CSS Winner",
    "Web Guru Award",
    "Wall of Portfolios",
  ];
  const assets = [
    "special-kudos",
    "ui",
    "ux",
    "awwwards-honors",
    "innovation",
    "astonishing",
    "mesh",
    "csswinner",
    "webguru",
    "wall-of-portfolios",
  ];
  return (
    <div className="window-backdrop" onClick={() => setAwards(false)}>
      <section
        className="awards-dialog glass"
        role="dialog"
        aria-modal="true"
        aria-label="Awards & Recognition"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="close-corner"
          onClick={() => setAwards(false)}
          aria-label="Close awards"
        >
          <X />
        </button>
        <span className="eyebrow">
          BUILT WITH CURIOSITY. NOTICED BY THE WORLD.
        </span>
        <h1>Awards & Recognition</h1>
        <div>
          {names.map((name, i) => (
            <figure key={name}>
              <img src={`/awards/${assets[i]}.svg`} alt="" />
              <figcaption>{name}</figcaption>
            </figure>
          ))}
        </div>
      </section>
    </div>
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
    <div className="window-backdrop" onClick={() => setSearch(false)}>
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
    </div>
  );
}
