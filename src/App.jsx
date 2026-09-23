import React, {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FileText, MessageCircle, X } from "lucide-react";
import { AppContext } from "./context";
import portfolio from "./portfolio.json";
import ideas from "./ideas.json";
import { makeController } from "./scene/motion.mjs";
import { snapshot } from "./snapshot";
import Character from "./scene/Character";
import useHomeModel from "./scene/useHomeModel";
import { modelForPage } from "./scene/home-models.mjs";
import { Header, Ambient, Boot } from "./components/Chrome";
import {
  Home,
  Work,
  About,
  ProjectDetail,
  AwardsDialog,
  SearchDialog,
} from "./pages/Portfolio";
import Contact from "./pages/Contact";
import Terminal from "./components/Terminal";
import Resume from "./components/Resume";
import Wordle from "./components/Wordle";
const World = lazy(() => import("./scene/World"));
function route() {
  const q = new URLSearchParams(location.search);
  return {
    mode: q.has("project")
      ? "work"
      : q.has("idea")
        ? "blog"
        : ["home", "work", "about", "contact", "blog"].includes(
              q.get("section"),
            )
          ? q.get("section")
          : "home",
    project: q.get("project"),
    idea: q.get("idea"),
  };
}
function pref(name, fallback) {
  try {
    return JSON.parse(localStorage.getItem("fuch-replica-" + name)) ?? fallback;
  } catch {
    return fallback;
  }
}
export default function App() {
  const [locationState, setLocationState] = useState(route),
    { mode, project, idea } = locationState;
  const [mobile, setMobile] = useState(innerWidth <= 768),
    [ready, setReady] = useState(false),
    [bootDone, setBootDone] = useState(() => route().mode === "blog"),
    [chat, setChat] = useState("closed"),
    [cv, setCv] = useState("closed"),
    [query, setQuery] = useState(null),
    [tracking, setTracking] = useState(() => pref("tracking", true)),
    [muted, setMuted] = useState(() => pref("muted", false)),
    [paused, setPaused] = useState(() => pref("paused", false)),
    [likes, setLikes] = useState(() => pref("likes", 12018)),
    [musicOpen, setMusicOpen] = useState(false),
    [awards, setAwards] = useState(false),
    [search, setSearch] = useState(false),
    [wordle, setWordle] = useState(false),
    [worldEntered, setWorldEntered] = useState(false),
    [reactionId, setReactionId] = useState(snapshot.reactions[0].id);
  const controller = useMemo(makeController, []),
    sound = useRef(null),
    likeSequence = useRef({ time: 0, count: 0 }),
    viewRef = useRef();
  const homeModels = useHomeModel(mode);
  const characterModel = modelForPage(mode, homeModels.selection.model);
  const change = useCallback(
    (next) => {
      const q = new URLSearchParams();
      if (next.project) q.set("project", next.project);
      else if (next.idea) q.set("idea", next.idea);
      else if (next.mode !== "home") q.set("section", next.mode);
      history.pushState({}, "", location.pathname + (q.size ? "?" + q : ""));
      setLocationState(next);
      controller.gaze = null;
      controller.mouse.active = false;
    },
    [controller],
  );
  const navigate = useCallback(
    (m) => {
      setChat("closed");
      setSearch(false);
      setAwards(false);
      change({ mode: m, project: null, idea: null });
    },
    [change],
  );
  const openProject = (id) => change({ mode: "work", project: id, idea: null });
  const openIdea = (id) => change({ mode: "blog", project: null, idea: id });
  const closeDetail = () => change({ mode, project: null, idea: null });
  const openChat = (q) => {
    setQuery(q || null);
    setChat("open");
    setCv((v) => (v === "open" ? "minimized" : v));
  };
  const like = useCallback(() => {
    setLikes((n) => n + 1);
    const s = likeSequence.current,
      now = performance.now();
    s.count = now - s.time < 12000 ? s.count + 1 : 1;
    s.time = now;
    controller.gesture(
      s.count >= 4 ? "flip" : s.count >= 2 ? "dance" : "cheer",
    );
  }, [controller]);
  useEffect(() => {
    const resize = () => setMobile(innerWidth <= 768),
      pop = () => {
        setLocationState(route());
        setChat("closed");
      };
    addEventListener("resize", resize);
    addEventListener("popstate", pop);
    return () => {
      removeEventListener("resize", resize);
      removeEventListener("popstate", pop);
    };
  }, []);
  useEffect(() => {
    controller.tracking = tracking;
    controller.paused = paused;
    for (const [k, v] of Object.entries({ tracking, paused, muted, likes }))
      localStorage.setItem("fuch-replica-" + k, JSON.stringify(v));
    document.documentElement.classList.toggle("motion-paused", paused);
  }, [tracking, paused, muted, likes, controller]);
  useEffect(() => {
    document.title = `牛来 — ${mode === "home" ? "感知" : mode === "blog" ? "IDEA52" : mode.toUpperCase()}`;
    viewRef.current?.scrollTo(0, 0);
  }, [mode, project, idea]);
  useEffect(() => {
    const key = (e) => {
      if (wordle) return;
      if (e.key === "Escape") {
        setAwards(false);
        setSearch(false);
        setWordle(false);
        if (chat === "open") setChat("closed");
        else if (cv === "open") setCv("closed");
        else if (project || idea) closeDetail();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearch((v) => !v);
        return;
      }
      if (
        /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) ||
        e.target.isContentEditable
      )
        return;
      if (e.key === "/") {
        e.preventDefault();
        openChat();
      }
      if (e.key.toLowerCase() === "l") like();
      if (e.key === " " && mode !== "blog") {
        e.preventDefault();
        controller.gesture("happy");
      }
    };
    addEventListener("keydown", key);
    return () => removeEventListener("keydown", key);
  }, [mode, chat, cv, project, idea, like, wordle]);
  useEffect(() => {
    const down = (e) => {
      if (muted) return;
      try {
        if (!sound.current)
          sound.current = new (
            window.AudioContext || window.webkitAudioContext
          )();
        const ac = sound.current;
        ac.resume();
        if (!e.target.closest("button,a")) return;
        const osc = ac.createOscillator(),
          gain = ac.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(480, ac.currentTime);
        osc.frequency.exponentialRampToValueAtTime(260, ac.currentTime + 0.045);
        gain.gain.setValueAtTime(0.025, ac.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(ac.destination);
        osc.start();
        osc.stop(ac.currentTime + 0.08);
      } catch {}
    };
    addEventListener("pointerdown", down);
    return () => removeEventListener("pointerdown", down);
  }, [muted]);
  const bootEnd = useCallback(() => {
    setBootDone(true);
    controller.gesture("greet", "conversation");
  }, [controller]);
  const ctx = {
    homeModel: homeModels.selection.model,
    pendingModel: homeModels.pending,
    modelError: homeModels.error,
    chooseHomeModel: homeModels.choose,
    cancelHomeModel: homeModels.cancel,
    mode,
    mobile,
    portfolio,
    ideas,
    controller,
    bootDone,
    navigate,
    openProject,
    openIdea,
    closeDetail,
    openChat,
    chat,
    setChat,
    query,
    setQuery,
    cv,
    setCv,
    tracking,
    setTracking,
    muted,
    setMuted,
    paused,
    setPaused,
    like,
    likes,
    snapshot,
    reaction:
      snapshot.reactions.find((item) => item.id === reactionId) ??
      snapshot.reactions[0],
    setReactionId,
    musicOpen,
    setMusicOpen,
    setAwards,
    setSearch,
    setWordle,
  };
  useEffect(() => {
    window.__replica = {
      controller,
      getState: () => ({
        mode,
        project,
        idea,
        chat,
        cv,
        bootDone,
        tracking,
        paused,
        likes,
        homeModel: homeModels.selection.model.id,
        pendingModel: homeModels.pending?.id || null,
        modelError: homeModels.error,
      }),
    };
    return () => delete window.__replica;
  }, [ctx]);
  const overlay = chat === "open" || cv === "open" || !!project || !!idea;
  return (
    <AppContext.Provider value={ctx}>
      <div
        className={`app ${mobile ? "mobile" : "desktop"} route-${mode} ${bootDone ? "boot-complete" : "booting"}`}
      >
        <Ambient />
        {mode !== "blog" && (
          <Character
            model={characterModel}
            gltf={mode === "home" ? homeModels.selection.gltf : null}
            controller={controller}
            mode={mode}
            mobile={mobile}
            ready={ready}
            onReady={() => setReady(true)}
            boot={bootDone}
            overlay={overlay}
          />
        )}
        <main
          className="page-host"
          ref={viewRef}
          onDoubleClick={(e) => {
            if (
              mobile &&
              mode === "home" &&
              !e.target.closest("button,a,input")
            )
              like();
          }}
        >
          {mode === "home" ? (
            <Home />
          ) : mode === "work" ? (
            <Work />
          ) : mode === "about" ? (
            <About />
          ) : mode === "contact" ? (
            <Contact />
          ) : (
            <Suspense
              fallback={<div className="world-loading">PREPARING IDEA52…</div>}
            >
              <World
                entered={worldEntered}
                setEntered={setWorldEntered}
                ideaId={idea}
              />
            </Suspense>
          )}
        </main>
        <div className="interface-chrome">
          <Header />
        </div>
        {!bootDone && mode !== "blog" && (
          <Boot ready={ready} onDone={bootEnd} />
        )}
        <div className="minimized-tray">
          {cv === "minimized" && (
            <button
              className="glass"
              onClick={() => {
                setCv("open");
                setChat((v) => (v === "open" ? "minimized" : v));
              }}
            >
              <FileText size={18} />
              LIVE RESUME
            </button>
          )}
          {chat === "minimized" && (
            <button className="glass" onClick={() => setChat("open")}>
              <MessageCircle size={18} />
              FUCH TERMINAL
            </button>
          )}
        </div>
        {project && <ProjectDetail id={project} />}{" "}
        {chat === "open" && <Terminal />}
        {cv === "open" && <Resume />}
        {awards && <AwardsDialog />}
        {search && <SearchDialog />}
        {wordle && <Wordle />}
        {musicOpen && (
          <aside className="music-card glass">
            <button
              className="close-corner"
              aria-label="Close music card"
              onClick={() => setMusicOpen(false)}
            >
              <X size={12} />
            </button>
            <MusicRecord />
            <div>
              <span>LAST JAMMED TO · SOURCE SNAPSHOT</span>
              <strong>Californication</strong>
              <small>Red Hot Chili Peppers</small>
              <a
                href="https://music.apple.com/us/album/californication/945575406?i=945575413"
                target="_blank"
                rel="noreferrer"
              >
                Listen ↗
              </a>
            </div>
          </aside>
        )}
      </div>
    </AppContext.Provider>
  );
}
function MusicRecord() {
  return (
    <div className="record-art">
      <i />
    </div>
  );
}
