import { Localized } from "../i18n/Language";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useApp } from "../context";
const words = ["BUILD", "THINK", "CRAFT", "PIXEL", "SPACE", "LIGHT", "FRAME"];
export default function Wordle() {
  const { setWordle } = useApp();
  const answer = words[Math.floor(Date.now() / 86400000) % words.length];
  const [rows, setRows] = useState([]),
    [value, setValue] = useState(""),
    [notice, setNotice] = useState("");
  const won = rows.at(-1) === answer,
    done = won || rows.length === 6;
  const type = (key) => {
    if (done) return;
    if (key === "Backspace") {
      setValue((v) => v.slice(0, -1));
      return;
    }
    if (key === "Enter") {
      if (value.length !== 5) {
        setNotice("Five letters, please.");
        return;
      }
      setRows((r) => [...r, value]);
      setValue("");
      setNotice(
        value === answer
          ? "Nice work. See you tomorrow."
          : rows.length === 5
            ? `The word was ${answer}.`
            : "",
      );
      return;
    }
    if (/^[a-z]$/i.test(key))
      setValue((v) => (v + key.toUpperCase()).slice(0, 5));
  };
  useEffect(() => {
    const h = (e) => {
      if (e.key === "Escape") {
        setWordle(false);
        return;
      }
      e.preventDefault();
      type(e.key);
    };
    addEventListener("keydown", h);
    return () => removeEventListener("keydown", h);
  }, [value, rows]);
  function colors(word) {
    const result = Array(5).fill("absent"),
      remaining = answer.split("");
    for (let i = 0; i < 5; i++)
      if (word[i] === answer[i]) {
        result[i] = "correct";
        remaining[i] = null;
      }
    for (let i = 0; i < 5; i++)
      if (result[i] !== "correct") {
        const j = remaining.indexOf(word[i]);
        if (j >= 0) {
          result[i] = "present";
          remaining[j] = null;
        }
      }
    return result;
  }
  return (
    <Localized><div className="wordle-overlay">
      <section role="dialog" aria-modal="true" aria-label="Daily word game">
        <button
          className="close-corner"
          onClick={() => setWordle(false)}
          aria-label="Close word game"
        >
          <X />
        </button>
        <span className="eyebrow">A SMALL BREAK FROM THE WORK</span>
        <h2>Five letters. Six tries.</h2>
        <p className="wordle-notice" aria-live="polite">
          {notice || "One word for today. Your keyboard is ready."}
        </p>
        <div className="wordle-grid">
          {Array.from({ length: 6 }, (_, i) => {
            const word = rows[i] || (i === rows.length ? value : "");
            const styles = rows[i] ? colors(word) : [];
            return (
              <div key={i}>
                {Array.from({ length: 5 }, (_, j) => (
                  <span key={j} className={styles[j] || ""}>
                    {word[j]}
                  </span>
                ))}
              </div>
            );
          })}
        </div>
        <div className="wordle-keyboard">
          {["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"].map((row) => (
            <div key={row}>
              {[...row].map((key) => (
                <button onClick={() => type(key)} key={key}>
                  {key}
                </button>
              ))}
            </div>
          ))}
          <div>
            <button onClick={() => type("Enter")}>ENTER</button>
            <button onClick={() => type("Backspace")}>⌫</button>
          </div>
        </div>
      </section>
    </div></Localized>
  );
}
