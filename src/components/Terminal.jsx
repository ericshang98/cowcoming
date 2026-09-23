import { useEffect, useRef, useState } from "react";
import { useApp } from "../context";
import Window from "./Window";
const prompts = [
  "Show me his best work",
  "What’s he shipping right now?",
  "Did this win any awards?",
  "How do I hire him?",
  "What does he believe about design?",
  "Play today’s wordle",
];
function archiveAnswer(query, portfolio, ideas) {
  const q = query.toLowerCase();
  const p = portfolio.projects.find((p) =>
    [p.name, p.title]
      .filter(Boolean)
      .some((label) => q.includes(label.toLowerCase())),
  );
  if (p)
    return {
      text: `${p.name} — ${p.decision}\n\n${p.deepContent[0].content}`,
      route: { project: p.id },
    };
  if (/work|built|impact|best/.test(q))
    return {
      text: "he builds products people actually depend on. UAE PASS serves 12 million+ people; DubaiNow brings over 300 services together. there’s also MFine, broadcast tools, and ZeroEk — his AI co-founder for solo founders. take a look.",
      route: { mode: "work" },
    };
  if (/hire|contact|available|open to/.test(q))
    return {
      text: "he’s open to freelance and contract work. tell him what you’re building through the contact page, or book a call. i’ll take you there.",
      route: { mode: "contact" },
    };
  if (/idea|shipping|latest/.test(q)) {
    const latest = ideas.filter((x) => x.available).at(-1);
    return {
      text: `one idea every week of 2026. the latest is ${latest.title}: ${latest.tagline}`,
      route: { idea: latest.id },
    };
  }
  if (/award|win/.test(q))
    return {
      text: "13+ design awards and recognition, including Awwwards Honors, CSS Design Awards for UI, UX and innovation, and Special Design Kudos.",
      route: { mode: "about" },
    };
  if (/believe|design|manifesto/.test(q))
    return {
      text: portfolio.portfolioData.about.manifesto,
      route: { mode: "about" },
    };
  if (/who|sayandeep|about|experience/.test(q))
    return {
      text: portfolio.portfolioData.about.introduction,
      route: { mode: "about" },
    };
  return {
    text: "this preview answers from the local portfolio archive. ask about Sayandeep, his work, ZeroEk, awards, or IDEA52. open-ended AI is not connected here.",
  };
}
export default function Terminal() {
  const {
    setChat,
    query,
    setQuery,
    navigate,
    openProject,
    openIdea,
    setCv,
    controller,
    portfolio,
    ideas,
    setWordle,
  } = useApp();
  const [input, setInput] = useState(""),
    [messages, setMessages] = useState([]),
    [busy, setBusy] = useState(false);
  const field = useRef(),
    scroll = useRef(),
    timer = useRef(),
    abort = useRef();
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      abort.current?.abort();
      controller.mood = "idle";
    },
    [],
  );
  async function submit(raw = input) {
    const text = raw.trim();
    if (!text || busy) return;
    setInput("");
    if (text.startsWith("/")) {
      const command = text.slice(1).toLowerCase();
      if (command === "clear") {
        setMessages([]);
        return;
      }
      if (command === "cv") {
        setChat("closed");
        setCv("open");
        return;
      }
      const mode = command === "idea52" ? "blog" : command;
      if (["home", "work", "about", "contact", "blog"].includes(mode)) {
        setChat("closed");
        navigate(mode);
        return;
      }
    }
    if (/wordle/i.test(text)) {
      setWordle(true);
      return;
    }
    setMessages((prev) => [...prev, { q: text, a: null }]);
    setBusy(true);
    controller.mood = "thinking";
    let answer;
    const endpoint = import.meta.env.VITE_CHAT_ENDPOINT;
    if (endpoint) {
      abort.current = new AbortController();
      try {
        const r = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, history: messages }),
          signal: abort.current.signal,
        });
        const d = await r.json();
        if (!r.ok || !d.text) throw Error();
        answer = { text: d.text };
      } catch (e) {
        if (e.name === "AbortError") return;
        answer = {
          text: "Connection lost. No answer came back — please try again.",
        };
      }
    } else answer = archiveAnswer(text, portfolio, ideas);
    timer.current = setTimeout(
      () => {
        setMessages((prev) =>
          prev.map((m, i) => (i === prev.length - 1 ? { ...m, a: answer } : m)),
        );
        setBusy(false);
        controller.mood = "speaking";
        controller.gesture("nod", "conversation");
        field.current?.focus();
      },
      endpoint ? 0 : 420,
    );
  }
  useEffect(() => {
    if (query) {
      const q = query;
      setQuery(null);
      submit(q);
    }
  }, [query]);
  useEffect(() => {
    scroll.current?.scrollTo({ top: 1e6, behavior: "smooth" });
  }, [messages, busy]);
  function follow(route) {
    setChat("closed");
    if (route.project) openProject(route.project);
    else if (route.idea) openIdea(route.idea);
    else navigate(route.mode);
  }
  return (
    <Window
      title="FUCH_AI · TERMINAL"
      kind="terminal"
      onClose={() => setChat("closed")}
      onMinimize={() => setChat("minimized")}
    >
      <div className="terminal-scroll" ref={scroll}>
        <p className="terminal-welcome">
          fuch_ai v9.0 · cognition_layer online
        </p>
        <p>
          type a question, or one of:{" "}
          <span>/work /idea52 /about /contact /cv /clear</span>
        </p>
        <p className="terminal-comment">
          // hello. ask me anything about sayandeep.
        </p>
        <div className="terminal-prompts">
          {prompts.map((p) => (
            <button key={p} onClick={() => submit(p)} disabled={busy}>
              {p}
            </button>
          ))}
        </div>
        {messages.map((m, i) => (
          <div className="terminal-exchange" key={i}>
            <p>
              <span>$</span> {m.q}
            </p>
            <p className="terminal-answer">{m.a?.text || "thinking…"}</p>
            {m.a?.route && (
              <button
                className="terminal-link"
                onClick={() => follow(m.a.route)}
              >
                Explore {m.a.route.mode || "this project"} ↗
              </button>
            )}
          </div>
        ))}
      </div>
      <form
        className="terminal-input"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <span>$</span>
        <label htmlFor="terminal-query">guest@fuch:~ $</label>
        <input
          id="terminal-query"
          ref={field}
          autoFocus
          aria-label="Ask Fuch a question"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          autoComplete="off"
          disabled={busy}
        />
        <button
          type="submit"
          aria-label="Send question"
          disabled={busy || !input.trim()}
        >
          ↵
        </button>
      </form>
      {!import.meta.env.VITE_CHAT_ENDPOINT && (
        <span className="archive-mode">LOCAL ARCHIVE</span>
      )}
    </Window>
  );
}
