import { useRef, useState } from "react";
import { Download, Moon, Sun } from "lucide-react";
import { useApp } from "../context";
import Window from "./Window";
export default function Resume() {
  const { setCv, portfolio } = useApp(),
    ref = useRef(),
    [dark, setDark] = useState(false);
  const move = (id) =>
    ref.current
      .querySelector("#cv-" + id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  return (
    <Window
      title="LIVE_RESUME_NODE"
      kind="resume"
      onClose={() => setCv("closed")}
      onMinimize={() => setCv("minimized")}
    >
      <div className={`resume-document ${dark ? "dark" : ""}`} ref={ref}>
        <nav className="resume-nav">
          {["About", "Experience", "Capabilities", "Impact"].map((t) => (
            <button key={t} onClick={() => move(t.toLowerCase())}>
              {t}
            </button>
          ))}
          <button aria-label="Toggle CV theme" onClick={() => setDark(!dark)}>
            {dark ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <a href="/resume.pdf" download>
            Download CV <Download size={14} />
          </a>
        </nav>
        <section className="resume-cover">
          <h1>
            Sayandeep
            <br />
            Bose<span>.</span>
          </h1>
          <p>
            PRODUCT DESIGNER <i /> CX SPECIALIST <i /> 10 YEARS
          </p>
          <button onClick={() => move("about")}>
            SCROLL
            <br />↓
          </button>
        </section>
        <section id="cv-about">
          <span className="eyebrow">01 / ABOUT</span>
          <h2>Making complexity feel simple.</h2>
          <p>{portfolio.portfolioData.about.experience_summary}</p>
        </section>
        <section id="cv-experience">
          <span className="eyebrow">02 / EXPERIENCE</span>
          <h2>A decade of building.</h2>
          {portfolio.experiences.map((x) => (
            <article className="resume-experience" key={x.id}>
              <time>{x.date}</time>
              <div>
                <h3>{x.company}</h3>
                <strong>{x.role}</strong>
                <p>{x.description}</p>
              </div>
            </article>
          ))}
        </section>
        <section id="cv-capabilities">
          <span className="eyebrow">03 / CAPABILITIES</span>
          <h2>
            From the first question
            <br />
            to the final detail.
          </h2>
          <div className="resume-capabilities">
            {[
              "Product strategy",
              "UX research",
              "Service design",
              "Design systems",
              "Interaction design",
              "AI products",
              "Prototyping",
              "Creative engineering",
            ].map((x) => (
              <span key={x}>{x}</span>
            ))}
          </div>
        </section>
        <section id="cv-impact">
          <span className="eyebrow">04 / IMPACT</span>
          <h2>Design at national scale.</h2>
          <div className="stats">
            <div>
              <strong>20M+</strong>
              <span>ACTIVE USERS</span>
            </div>
            <div>
              <strong>13+</strong>
              <span>DESIGN AWARDS</span>
            </div>
            <div>
              <strong>90+</strong>
              <span>BRANDS</span>
            </div>
          </div>
          <p>Based in Dubai. Open to meaningful problems.</p>
          <a href="mailto:hello@fuch.ai">hello@fuch.ai ↗</a>
        </section>
      </div>
    </Window>
  );
}
