import { useEffect, useRef, useState } from "react";
import {
  MessageCircle,
  FileText,
  House,
  FolderGit2,
  Sparkles,
  User,
  Send,
  Volume2,
  VolumeX,
  Pause,
  Play,
  Scan,
  Music2,
  X,
  Smartphone,
} from "lucide-react";
import { useApp } from "../context";
export const routes = [
  ["home", "HOME", House],
  ["work", "WORK", FolderGit2],
  ["blog", "IDEA52", Sparkles],
  ["about", "ABOUT", User],
  ["contact", "CONTACT", Send],
];
export function Controls({ music = true }) {
  const {
    tracking,
    setTracking,
    muted,
    setMuted,
    paused,
    setPaused,
    setMusicOpen,
  } = useApp();
  return (
    <div className="scene-controls">
      <button
        aria-label={
          tracking ? "Turn off cursor tracking" : "Turn on cursor tracking"
        }
        aria-pressed={tracking}
        onClick={() => setTracking(!tracking)}
      >
        <Scan size={15} />
      </button>
      <button
        aria-label={muted ? "Unmute sound" : "Mute sound"}
        aria-pressed={!muted}
        onClick={() => setMuted(!muted)}
      >
        {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
      </button>
      <button
        aria-label={paused ? "Resume animations" : "Pause animations"}
        aria-pressed={paused}
        onClick={() => setPaused(!paused)}
      >
        {paused ? <Play size={15} /> : <Pause size={15} />}
      </button>
      {music && (
        <button
          aria-label="Show the last track played"
          onClick={() => setMusicOpen((v) => !v)}
        >
          <Music2 size={15} />
        </button>
      )}
    </div>
  );
}
export function Header() {
  const { mode, navigate, openChat, setCv, muted, setMuted, snapshot, reaction } =
    useApp();
  return (
    <>
      <header className="identity">
        <button onClick={() => navigate("home")} aria-label="牛来">
          牛来
        </button>
        <div className="identity-desktop">一个 IP · 跑在一套尚未命名的系统上</div>
        <div className="identity-mobile">
          <i />
          形态 · {snapshot.name}
        </div>
      </header>
      <div className="mobile-actions">
        <button
          onClick={() => setMuted(!muted)}
          aria-label={muted ? "Unmute sound" : "Mute sound"}
        >
          {muted ? <VolumeX /> : <Volume2 />}
        </button>
        <button aria-label="Open living CV" onClick={() => setCv("open")}>
          <FileText />
        </button>
        <button
          className="chat-dot"
          aria-label="Ask Fuch"
          onClick={() => openChat()}
        >
          <MessageCircle />
        </button>
      </div>
      <nav className="navigation glass" aria-label="Main navigation">
        <button
          className="desktop-nav-icon chat-dot"
          aria-label="Ask Fuch"
          onClick={() => openChat()}
        >
          <MessageCircle size={15} />
        </button>
        <button
          className="desktop-nav-icon"
          aria-label="Open living CV"
          onClick={() => setCv("open")}
        >
          <FileText size={13} />
        </button>
        {routes.map(([id, title, Icon]) => (
          <button
            key={id}
            onClick={() => navigate(id)}
            aria-current={mode === id ? "page" : undefined}
            className={mode === id ? "selected" : ""}
          >
            <Icon className="mobile-nav-icon" size={21} />
            <span>{title}</span>
          </button>
        ))}
      </nav>
      {mode === "home" && (
        <div className="snapshot-tag" aria-live="polite">
          <b>形态 · {snapshot.name}</b>
          <span>
            读到{reaction.read} → {reaction.judgment}
          </span>
        </div>
      )}
    </>
  );
}
export function Boot({ ready, onDone }) {
  const { controller } = useApp();
  const [phase, setPhase] = useState("load"),
    [progress, setProgress] = useState(0),
    [skip, setSkip] = useState(false);
  const begin = useRef(performance.now());
  const fonts = useRef(false);
  useEffect(() => {
    document.fonts.ready.then(() => (fonts.current = true));
    const stop = () => setSkip(true);
    const id = setTimeout(() => {
      addEventListener("pointerdown", stop, { once: true });
      addEventListener("keydown", stop, { once: true });
    }, 400);
    return () => {
      clearTimeout(id);
      removeEventListener("pointerdown", stop);
      removeEventListener("keydown", stop);
    };
  }, []);
  useEffect(() => {
    if (phase !== "load") return;
    const id = setInterval(() => {
      if (controller.error) {
        setPhase("error");
        return;
      }
      const elapsed = performance.now() - begin.current;
      let p = Math.min(
        elapsed / 3000,
        0.45 * Math.min(elapsed / 3000, 1) + (fonts.current ? 0.2 : 0) + 0.2,
      );
      // Download/decoding time must not consume the character's entrance.
      // Follow rendered animation progress, including on slow first visits.
      if (ready) p = 0.85 + 0.15 * controller.entranceProgress;
      if (ready && fonts.current && controller.entranceProgress >= 1) p = 1;
      else p = Math.min(p, 0.99);
      if (skip && ready) p = 1;
      setProgress(Math.round(p * 100));
      if (p >= 1) setPhase("ready");
    }, 40);
    return () => clearInterval(id);
  }, [ready, skip, phase]);
  useEffect(() => {
    if (phase === "ready") {
      const t = setTimeout(() => setPhase("handoff"), 420);
      return () => clearTimeout(t);
    }
    if (phase === "handoff") {
      const t = setTimeout(onDone, 700);
      return () => clearTimeout(t);
    }
  }, [phase, onDone]);
  return (
    <div className={`boot-overlay ${phase}`} data-pwc-critical="boot">
      <div className="boot-meter">
        <div className="boot-line">
          <span style={{ transform: `scaleX(${progress / 100})` }} />
        </div>
        <div className="boot-status">
          <span>{String(progress).padStart(3, "0")}</span>
          <span key={Math.floor(progress / 34)}>
            {phase === "error"
              ? "SCENE UNAVAILABLE"
              : phase !== "load"
                ? "FUCH ONLINE"
                : [
                    "POWERING ON",
                    "CALIBRATING CHASSIS",
                    "MOUNTING OPERATOR MEMORY",
                  ][Math.min(2, Math.floor(progress / 34))]}
          </span>
        </div>
        {phase === "error" && (
          <div className="boot-error" role="alert">
            <p>The 3D scene could not load.</p>
            <button onClick={() => location.reload()}>Try again ↗</button>
          </div>
        )}
        {phase !== "error" &&
          !ready &&
          performance.now() - begin.current > 10000 && (
            <span className="loading-note">Preparing the 3D scene…</span>
          )}
      </div>
    </div>
  );
}
export function Ambient() {
  const ref = useRef();
  const { paused, mobile } = useApp();
  useEffect(() => {
    if (mobile) return;
    const canvas = ref.current,
      ctx = canvas.getContext("2d");
    let frame;
    const dots = Array.from({ length: 42 }, (_, i) => ({
      x: ((i * 73) % 101) / 101,
      y: ((i * 47) % 103) / 103,
      phase: i * 0.7,
    }));
    let t = 0;
    const draw = () => {
      const w = innerWidth,
        h = innerHeight;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      ctx.clearRect(0, 0, w, h);
      if (!paused) t += 0.005;
      dots.forEach((d, i) => {
        const x = d.x * w + Math.sin(t + d.phase) * 15,
          y = d.y * h + Math.cos(t + d.phase) * 12;
        ctx.fillStyle = "rgba(255,255,255,.5)";
        ctx.beginPath();
        ctx.arc(x, y, 1.1, 0, Math.PI * 2);
        ctx.fill();
        if (i % 3 === 0) {
          ctx.font = "7px monospace";
          ctx.fillText(String(11 + (i % 23)), x + 10, y - 8);
        }
        const n = dots[i + 1];
        if (n && Math.hypot((d.x - n.x) * w, (d.y - n.y) * h) < 140) {
          ctx.strokeStyle = "rgba(255,255,255,.22)";
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(n.x * w, n.y * h);
          ctx.stroke();
        }
      });
      frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, [paused, mobile]);
  return <canvas ref={ref} className="ambient" aria-hidden="true" />;
}
export function TiltPrompt() {
  const { controller } = useApp();
  const [visible, setVisible] = useState(
      !sessionStorage.getItem("fuch-tilt-dismissed"),
    ),
    [error, setError] = useState("");
  useEffect(() => {
    const tilt = (e) => {
      controller.tilt.x = Math.max(-1, Math.min(1, (e.gamma || 0) / 30));
      controller.tilt.y = Math.max(-1, Math.min(1, ((e.beta || 0) - 30) / 40));
    };
    const shake = (e) => {
      const a = e.acceleration;
      if (a && Math.hypot(a.x || 0, a.y || 0, a.z || 0) > 18)
        controller.gesture("curious");
    };
    addEventListener("deviceorientation", tilt);
    addEventListener("devicemotion", shake);
    return () => {
      removeEventListener("deviceorientation", tilt);
      removeEventListener("devicemotion", shake);
    };
  }, [controller]);
  if (!visible) return null;
  return (
    <div className="tilt-prompt">
      <button
        onClick={async () => {
          try {
            if (typeof DeviceOrientationEvent === "undefined") {
              setError("Motion sensors unavailable");
              return;
            }
            if (
              DeviceOrientationEvent.requestPermission &&
              (await DeviceOrientationEvent.requestPermission()) !== "granted"
            ) {
              setError("Motion access was not allowed");
              return;
            }
            setVisible(false);
          } catch {
            setError("Motion sensors unavailable");
          }
        }}
      >
        <Smartphone size={15} />
        {error || "Tilt & shake to play"}
      </button>
      <button
        aria-label="Dismiss"
        onClick={() => {
          setVisible(false);
          sessionStorage.setItem("fuch-tilt-dismissed", "1");
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
