import { Localized } from "../i18n/Language";
import { useEffect, useRef, useState } from "react";
export default function Window({
  title,
  kind,
  onClose,
  onMinimize,
  children,
  statusLabel = "LIVE",
}) {
  const ref = useRef(),
    [full, setFull] = useState(false),
    [offset, setOffset] = useState({ x: 0, y: 0 }),
    drag = useRef(null),
    prior = useRef(null);
  useEffect(() => {
    prior.current = document.activeElement;
    const el = ref.current;
    el?.querySelector("input,button")?.focus();
    const key = (e) => {
      if (e.key === "Escape" && !document.querySelector(".wordle-overlay"))
        onClose();
      if (e.key === "Tab") {
        const xs = [
          ...el.querySelectorAll(
            'button:not([disabled]),a,input,textarea,[tabindex="0"]',
          ),
        ].filter((x) => x.getClientRects().length);
        if (!xs.length) return;
        const a = xs[0],
          b = xs.at(-1);
        if (e.shiftKey && document.activeElement === a) {
          e.preventDefault();
          b.focus();
        } else if (!e.shiftKey && document.activeElement === b) {
          e.preventDefault();
          a.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      prior.current?.focus();
    };
  }, []);
  useEffect(() => {
    const move = (e) => {
      if (drag.current)
        setOffset({
          x: Math.max(
            -innerWidth / 2 + 100,
            Math.min(
              innerWidth / 2 - 100,
              drag.current.ox + e.clientX - drag.current.x,
            ),
          ),
          y: Math.max(
            -innerHeight / 2 + 100,
            Math.min(
              innerHeight / 2 - 100,
              drag.current.oy + e.clientY - drag.current.y,
            ),
          ),
        });
    };
    const up = () => (drag.current = null);
    addEventListener("pointermove", move);
    addEventListener("pointerup", up);
    addEventListener("pointercancel", up);
    addEventListener("blur", up);
    return () => {
      removeEventListener("pointermove", move);
      removeEventListener("pointerup", up);
      removeEventListener("pointercancel", up);
      removeEventListener("blur", up);
    };
  }, []);
  return (
    <Localized><div
      className="window-backdrop"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        ref={ref}
        className={`floating-window ${kind} ${full ? "maximized" : ""}`}
        style={{
          transform: full ? "none" : `translate(${offset.x}px,${offset.y}px)`,
        }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <aside
          className="window-rail"
          onDoubleClick={() => setFull(!full)}
          onPointerDown={(e) => {
            if (e.target.closest("button") || full) return;
            drag.current = {
              x: e.clientX,
              y: e.clientY,
              ox: offset.x,
              oy: offset.y,
            };
          }}
        >
          <div className="traffic-lights">
            <button
              className="red"
              aria-label={`Close ${kind}`}
              onClick={onClose}
            />
            <button
              className="yellow"
              aria-label={`Minimize ${kind}`}
              onClick={onMinimize}
            />
            <button
              className="green"
              aria-label={`Maximize ${kind}`}
              onClick={() => {
                setFull(!full);
                setOffset({ x: 0, y: 0 });
              }}
            />
          </div>
          <span>{title}</span>
          <small>
            <i />
            {statusLabel}
          </small>
        </aside>
        <div className="window-body">{children}</div>
      </section>
    </div></Localized>
  );
}
