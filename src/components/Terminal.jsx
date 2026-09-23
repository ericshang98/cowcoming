import { Localized, useLanguage, translateText } from "../i18n/Language";
import { useEffect, useRef, useState } from "react";
import { useApp } from "../context";
import Window from "./Window";
import { answerJevQuestion, jevTopics } from "./jev-guide.mjs";

export default function Terminal() {
  const { language } = useLanguage();
  const { setChat, query, setQuery, navigate } = useApp();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const field = useRef();
  const scroll = useRef();

  function submit(raw = input, display = raw) {
    const text = raw.trim();
    if (!text) return;
    setInput("");
    const command = text.normalize("NFKC").toLowerCase();
    if (command === "/clear") {
      setMessages([]);
      field.current?.focus();
      return;
    }
    if (["/home", "/work", "/about", "/contact"].includes(command)) {
      setChat("closed");
      navigate(command.slice(1));
      return;
    }
    setMessages((prev) => [...prev, { q: display.trim(), a: answerJevQuestion(text) }]);
    field.current?.focus();
  }

  useEffect(() => {
    if (query) {
      setQuery(null);
      submit(query);
    }
  }, [query]);
  useEffect(() => {
    scroll.current?.scrollTo({
      top: scroll.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  return (
    <Localized><Window
      title="JEV · 牛来决策指南"
      kind="terminal"
      statusLabel="GUIDE"
      onClose={() => setChat("closed")}
      onMinimize={() => setChat("minimized")}
    >
      <div className="terminal-scroll" ref={scroll}>
        <p className="terminal-welcome">JEV · 从快速决策到硬件行动</p>
        <p>
          点击下方问题，或输入关键词：<span>决策 / 硬件 / 示例</span>
        </p>
        <p className="terminal-comment">
          // 牛来如何使用 JEV？这里用固定问答讲清楚。/help 查看指令，/clear
          清空。
        </p>
        <div className="terminal-prompts">
          {jevTopics.map((topic) => (
            <button key={topic.id} onClick={() => submit(topic.question, translateText(topic.question, language))}>
              {topic.question}
            </button>
          ))}
        </div>
        <div
          role="log"
          aria-label="JEV 问答记录"
          aria-live="polite"
          aria-relevant="additions"
        >
          {messages.map((message, index) => (
            <div className="terminal-exchange" key={index}>
              <p>
                <span>$</span> <span translate="no">{message.q}</span>
              </p>
              <p className="terminal-answer">{message.a}</p>
            </div>
          ))}
        </div>
      </div>
      <form
        className="terminal-input"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <span>$</span>
        <label htmlFor="terminal-query">guest@niulai:~</label>
        <input
          id="terminal-query"
          ref={field}
          autoFocus
          aria-label="输入 JEV 相关问题"
          placeholder="试试：怎么接入硬件？"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          autoComplete="off"
        />
        <button type="submit" aria-label="发送问题" disabled={!input.trim()}>
          ↵
        </button>
      </form>
      <span className="archive-mode">固定问答 · 非实时 AI</span>
    </Window></Localized>
  );
}
