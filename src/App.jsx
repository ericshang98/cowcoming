import { Localized, useLanguage, translateText } from "./i18n/Language";
import React, {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FileText, MessageCircle } from "lucide-react";
import { AppContext } from "./context";
import portfolio from "./portfolio.json";
import ideas from "./ideas.json";
import { makeController } from "./scene/motion.mjs";
import { useWorldCollection } from "./useWorldCollection";
import { useNiulaiVoice } from "./useNiulaiVoice";
import { useIpVoice } from "./useIpVoice";
import { useIpSelection } from "./useIpSelection";
import { getIp } from "./ip-catalog.mjs";
import IpSwitcher from "./components/IpSwitcher";
import IpAssetProbe, { IpLoadBoundary } from "./components/IpAssetProbe";
import { isWaveShortcut } from "./voice-interactions.mjs";
import Character from "./scene/Character";
import Evolution from "./pages/Evolution";
import useLiveDevice from "./live/useLiveDevice";
import { useEvolutionDeviceSync } from "./live/useEvolutionDeviceSync";
import { useEvolutionSession } from "./useEvolutionSession";
import { NIULAI_ASSET } from "./scene/niulai.mjs";
import { resolvePreview, forms } from "./evolution.mjs";
import { shownEvolutionForm } from "./live/guest-preview.mjs";
import { Header, Ambient, Boot } from "./components/Chrome";
import {
  Home,
  ProjectDetail,
  SearchDialog,
} from "./pages/Portfolio";
import Contact from "./pages/Contact";
import Terminal from "./components/Terminal";
import Resume from "./components/Resume";
import Wordle from "./components/Wordle";
const World = lazy(() => import("./scene/World"));
function route() {
  const q = new URLSearchParams(location.search);
  if (q.get('section') === 'about') {
    q.delete('section');
    history.replaceState({}, '', location.pathname + (q.size ? `?${q}` : '') + location.hash);
  }
  return {
    mode: q.has("project")
      ? "work"
      : q.has("idea")
        ? "blog"
        : ["home", "hardware", "work", "contact", "blog"].includes(
              q.get("section"),
            )
          ? q.get("section") === "hardware"
            ? "work"
            : q.get("section")
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
  const { language } = useLanguage();
  const [locationState, setLocationState] = useState(route),
    { mode, project, idea } = locationState;
  const [mobile, setMobile] = useState(innerWidth <= 768),
    [ready, setReady] = useState(false),
    [bootDone, setBootDone] = useState(() =>
      ["blog", "work", "contact"].includes(route().mode),
    ),
    [chat, setChat] = useState("closed"),
    [cv, setCv] = useState("closed"),
    [query, setQuery] = useState(null),
    [tracking, setTracking] = useState(() => pref("tracking", true)),
    [muted, setMuted] = useState(() => pref("muted", false)),
    [paused, setPaused] = useState(() => pref("paused", false)),
    [voiceOpen, setVoiceOpen] = useState(false),
    [search, setSearch] = useState(false),
    [wordle, setWordle] = useState(false),
    [worldEntered, setWorldEntered] = useState(false);
  const [ipOpen, setIpOpen] = useState(false);
  const selection = useIpSelection(() => setIpOpen(false));
  const selectedIp = getIp(selection.active);
  const canSwitchIp = ['home', 'contact'].includes(mode);
  const otherIpPage = canSwitchIp && selection.active !== 'niulai';
  const controller = useMemo(makeController, []),
    sound = useRef(null),
    viewRef = useRef();
  const live = useLiveDevice(controller, mode === "work");
  const evolutionSession = useEvolutionSession({ enabled: live.online, roomId: live.snapshot?.roomId, form: live.snapshot?.profile.formId, localGatewayKey: live.localGatewayKey });
  const deviceFormReady = useEvolutionDeviceSync(evolutionSession, live);
  const [evolutionRoute, setEvolutionRoute] = useState('celestial');
  useEffect(() => {
    const branch = forms[evolutionSession.state.form].branch;
    if (branch) setEvolutionRoute(branch);
  }, [evolutionSession.state.form]);
  useEffect(() => {
    // Connection adapters capture context at input start and report only completed turns.
    controller.evolution = { context: evolutionSession.context, recordTurn: evolutionSession.recordTurn, deviceFormReady };
    return () => { delete controller.evolution; };
  }, [controller, evolutionSession.context, evolutionSession.recordTurn, deviceFormReady]);
  const [previewModelState, setPreviewModelState] = useState({ model: null, status: 'loading' });
  const [guestPreviewForm, setGuestPreviewForm] = useState(null);
  useEffect(() => { if (live.online) setGuestPreviewForm(null); }, [live.online]);
  const shownForm = shownEvolutionForm(live.online, evolutionSession.state.form, guestPreviewForm, Object.keys(forms));
  const evolutionPreview = resolvePreview(forms[shownForm].branch || evolutionRoute, shownForm, Object.keys(forms));
  const activeModel = canSwitchIp ? selectedIp.model : mode === 'work' ? evolutionPreview.model : NIULAI_ASSET;
  const evolutionPage = <Evolution
    live={live}
    preview={evolutionPreview}
    controller={controller}
    modelStatus={previewModelState.model === evolutionPreview.model ? previewModelState.status : 'loading'}
    session={{ ...evolutionSession, reset: () => {
      if (!live.online) return;
      live.command({ command: "stop" });
      evolutionSession.reset();
    } }}
    browseRoute={evolutionRoute}
    onSelectRoute={setEvolutionRoute}
    onSelectForm={form => { if (live.online) evolutionSession.dispatch({ type: 'select', form }); else setGuestPreviewForm(form); }}
  />;
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
      setIpOpen(false); selection.cancel();
      setChat("closed");
      setSearch(false);
      change({
        mode: m === "hardware" ? "work" : m,
        project: null,
        idea: null,
      });
    },
    [change, selection.cancel],
  );
  const openProject = (id) => change({ mode: "work", project: id, idea: null });
  const openIdea = (id) => change({ mode: "blog", project: null, idea: id });
  const closeDetail = () => change({ mode, project: null, idea: null });
  const openChat = (q) => {
    setQuery(q || null);
    setChat("open");
    setCv((v) => (v === "open" ? "minimized" : v));
  };
  const collection = useWorldCollection();
  const worldBlocked = ipOpen || chat === "open" || cv === "open" || search || wordle || voiceOpen;
  const voice = useNiulaiVoice({
    controller, muted, paused, mode, collected: collection.collected,
    enabled: !otherIpPage && !ipOpen && (mode === "home" || (mode === "blog" && worldEntered)) && bootDone && chat !== "open" && cv !== "open" && !search && !wordle,
  });
  const ipVoice = useIpVoice({ controller, ipId: selection.active, muted, paused,
    enabled: otherIpPage && bootDone && !worldBlocked });
  const currentVoice = otherIpPage ? ipVoice : voice;
  useEffect(() => { ipVoice.stopVoice(); controller.queue.clear(); }, [mode, ipVoice.stopVoice, controller]);
  const closeIp = () => { setIpOpen(false); selection.cancel(); };
  const openIp = () => { if (!canSwitchIp) return; if (ipOpen) { closeIp(); return; } voice.stopVoice(); ipVoice.stopVoice(); controller.queue.clear(); setChat('closed'); setCv('closed'); setSearch(false); setVoiceOpen(false); setIpOpen(true); };
  useEffect(() => {
    controller.queue.clear(); controller.gaze = null; controller.dragYaw = 0;
  }, [selection.active, controller]);
  useEffect(() => {
    controller.queue.clear();
    controller.gaze = null;
    controller.dragYaw = 0;
    voice.stopVoice();
  }, [evolutionSession.state.sessionId, evolutionSession.state.form, controller]);
  useEffect(() => {
    const resize = () => setMobile(innerWidth <= 768),
      pop = () => {
        setIpOpen(false); selection.cancel();
        setLocationState(route());
        setChat("closed");
      };
    addEventListener("resize", resize);
    addEventListener("popstate", pop);
    return () => {
      removeEventListener("resize", resize);
      removeEventListener("popstate", pop);
    };
  }, [selection.cancel]);
  useEffect(() => {
    controller.tracking = tracking;
    controller.paused = mode === "work" ? false : paused;
    try {
      for (const [k, v] of Object.entries({ tracking, paused, muted }))
        localStorage.setItem("fuch-replica-" + k, JSON.stringify(v));
    } catch { /* Controls remain usable when browser storage is unavailable. */ }
    document.documentElement.classList.toggle("motion-paused", mode === "work" ? false : paused);
  }, [tracking, paused, muted, mode, controller]);
  useEffect(() => {
    setVoiceOpen(false);
    viewRef.current?.scrollTo(0, 0);
  }, [mode, project, idea]);
  useEffect(() => {
    const section = mode === 'home' ? '基于 JEV 决策模型的可进化 AI 宠物'
      : mode === 'contact' ? 'VOTE US'
      : mode === 'blog' ? 'WORLD' : 'WORK';
    document.title = `Cowcoming — ${translateText(section, language)}`;
  }, [mode, language]);
  useEffect(() => {
    const key = (e) => {
      if (ipOpen) return;
      if (wordle) return;
      if (e.key === "Escape") {
        ipVoice.stopVoice();
        setSearch(false);
        setVoiceOpen(false);
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
      if ((mode === "home" || otherIpPage) && isWaveShortcut(e)) {
        e.preventDefault();
        currentVoice.wave();
        return;
      }
      if (
        /INPUT|TEXTAREA|SELECT|BUTTON|A/.test(e.target.tagName) ||
        e.target.isContentEditable
      )
        return;
      if (e.key === "/") {
        e.preventDefault();
        openChat();
      }
      if (e.key === " " && mode !== "blog") {
        e.preventDefault();
        controller.gesture("happy");
      }
    };
    addEventListener("keydown", key);
    return () => removeEventListener("keydown", key);
  }, [mode, chat, cv, project, idea, currentVoice.wave, ipVoice.stopVoice, ipOpen, wordle]);
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
        if (!e.target.closest("button,a") || e.target.closest(".niulai-voice")) return;
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
    mode,
    mobile,
    portfolio,
    ideas,
    controller,
    activeIp: selectedIp,
    canSwitchIp,
    ipOpen,
    openIp,
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
    ...currentVoice,
    collection,
    worldBlocked,
    voiceOpen,
    setVoiceOpen,
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
        voice: voice.voiceState,
        activeIp: selection.active,
        pendingIp: selection.pending?.ip.id || null,
        ipVoice: ipVoice.voiceState,
      }),
    };
    return () => delete window.__replica;
  }, [ctx]);
  const overlay = chat === "open" || cv === "open" || !!project || !!idea;
  return (
    <Localized><AppContext.Provider value={ctx}>
      <div
        className={`app ${mobile ? "mobile" : "desktop"} route-${mode} ${mode === "work" && !live.online ? "binding-required" : ""} ${bootDone ? "boot-complete" : "booting"}`}
      >
        {selection.pending && <IpLoadBoundary key={selection.pending.request} onError={selection.fail}>
          <Suspense fallback={null}><IpAssetProbe ip={selection.pending.ip} onReady={selection.complete} onError={selection.fail} /></Suspense>
        </IpLoadBoundary>}
        <Ambient />
        {mode !== "blog" && !(mode === "contact" && mobile) && (
          <Character
            rigKey={mode === "work" ? "work-character" : "default-character"}
            controller={controller}
            mode={mode}
            mobile={mobile}
            ready={ready}
            modelAsset={activeModel}
            characterId={otherIpPage ? selection.active : 'niulai'}
            onTap={otherIpPage ? ipVoice.tap : undefined}
            onReady={() => {
              setReady(true);
              setPreviewModelState({ model: activeModel, status: 'ready' });
            }}
            onError={() => {
              setPreviewModelState({ model: activeModel, status: 'error' });
            }}
            boot={bootDone}
            overlay={overlay}
          />
        )}
        <main
          className="page-host"
          ref={viewRef}

        >
          {mode === "home" ? (
            <Home />
          ) : mode === "hardware" ? (
            evolutionPage
          ) : mode === "work" ? (
            evolutionPage
          ) : mode === "contact" ? (
            <Contact />
          ) : (
            <Suspense
              fallback={<div className="world-loading">PREPARING WORLD…</div>}
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
              JEV 决策指南
            </button>
          )}
        </div>
        {project && <ProjectDetail id={project} />}{" "}
        {chat === "open" && <Terminal />}
        {cv === "open" && <Resume />}
        {search && <SearchDialog />}
        {wordle && <Wordle />}
        {ipOpen && <IpSwitcher selection={selection} onClose={closeIp} />}
        {selection.error && !ipOpen && <div className="ip-restore-notice" role="alert">
          {language === 'en' ? 'Could not restore your character. Niulai is ready.' : '上次的角色暂时无法载入，先和牛来玩吧。'}
          <button onClick={openIp}>{language === 'en' ? 'Choose IP' : '选择 IP'}</button>
        </div>}

      </div>
    </AppContext.Provider></Localized>
  );
}
