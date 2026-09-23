import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Cable,
  Camera,
  Check,
  ChevronRight,
  Cloud,
  Cpu,
  FileJson,
  FolderOpen,
  HardDrive,
  Monitor,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  X,
  GitBranch,
} from "lucide-react";
import ModelPreview from "../hardware/ModelPreview";
import {
  defaultActions,
  defaultTree,
  initialSession,
  parseActionPack,
  parseTree,
  sessionReducer,
  validateLocalGlb,
} from "../hardware/core.mjs";
import "./hardware.css";
const DOC =
  "https://uxl9fceo481.feishu.cn/wiki/Ehc9w5bs1ic2gEkwZjCc8Eo1nmb#doxcn4zxwPP0x9HUqP525CnZi8d";
const BUILTIN = { url: "/models/niulai-mouth.glb", name: "niulai-mouth.glb" };
const timeLabel = () =>
  new Date().toLocaleTimeString("zh-CN", { hour12: false });
export default function Hardware() {
  const [session, dispatch] = useReducer(sessionReducer, initialSession);
  const [mode, setMode] = useState("demo"),
    [tree, setTree] = useState(defaultTree),
    [current, setCurrent] = useState("normal");
  const [selected, setSelected] = useState("normal"),
    [pending, setPending] = useState(null),
    [path, setPath] = useState(["普通牛来"]);
  const [models, setModels] = useState({}),
    [actions, setActions] = useState(defaultActions),
    [packName, setPackName] = useState("内置视觉动作包");
  const [modelReady, setModelReady] = useState(false),
    [notice, setNotice] = useState("");
  const [audioFile, setAudioFile] = useState(null),
    [audioPlaying, setAudioPlaying] = useState(false);
  const [events, setEvents] = useState([]),
    [pairing, setPairing] = useState(false);
  const sequence = useRef(0),
    input = useRef(),
    currentKind = useRef(),
    audio = useRef(),
    imports = useRef(0),
    urls = useRef([]);
  const form = tree.forms.find((f) => f.id === current),
    inspected = tree.forms.find((f) => f.id === selected) || form;
  const resource = (f) =>
    f.model === "builtin:niulai" ? BUILTIN : models[f.model];
  const shown = pending ? tree.forms.find((f) => f.id === pending) : form;
  const model = resource(shown) || BUILTIN;
  const availableActions = actions.filter((a) => form.actions.includes(a.id));
  const branches = tree.edges.filter((e) => e.from === current);
  const log = useCallback(
    (text, kind = "info") =>
      setEvents((rows) =>
        [
          { id: ++sequence.current, time: timeLabel(), text, kind },
          ...rows,
        ].slice(0, 24),
      ),
    [],
  );
  const stop = useCallback(() => {
    dispatch({ type: "stop" });
    audio.current?.pause();
    setAudioPlaying(false);
  }, []);
  const modelLoaded = useCallback(() => {
    setModelReady(true);
    if (pending) {
      const name = tree.forms.find((f) => f.id === pending).name;
      setCurrent(pending);
      setSelected(pending);
      setPath((p) => [...p, name]);
      setPending(null);
      dispatch({ type: "reset" });
      log(`形态演示切换完成 · ${name} · 模型已载入`, "growth");
    }
  }, [pending, tree, log]);
  const modelFailed = useCallback(() => {
    setModelReady(false);
    stop();
    setPending(null);
    setNotice("模型未能载入，形态未切换。请检查 GLB，或恢复内置资源。");
  }, [stop]);
  useEffect(
    () => () => {
      imports.current++;
      audio.current?.pause();
      urls.current.forEach(URL.revokeObjectURL);
    },
    [],
  );
  useEffect(() => {
    const onHide = () => {
      if (document.hidden) stop();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [stop]);
  useEffect(() => {
    if (!session.running) return;
    const { id, action } = session.running;
    const timer = setTimeout(() => {
      dispatch({ type: "complete", id });
      log(`视觉动作演示完成 · ${action.label}`, "done");
    }, action.durationMs);
    return () => clearTimeout(timer);
  }, [session.running, log]);
  function run(action) {
    if (
      mode !== "demo" ||
      !modelReady ||
      pending ||
      session.running ||
      !form.actions.includes(action.id)
    )
      return;
    dispatch({ type: "start", action, id: ++sequence.current });
    log(`开始演示 · ${action.label}`);
  }
  function selectFile(kind) {
    currentKind.current = kind;
    input.current.accept =
      kind === "model"
        ? ".glb"
        : ["actions", "tree"].includes(kind)
          ? ".json"
          : "audio/*";
    input.current.click();
  }
  function objectUrl(file) {
    const url = URL.createObjectURL(file);
    urls.current.push(url);
    return url;
  }
  async function importFile(e) {
    const file = e.target.files?.[0],
      kind = currentKind.current;
    e.target.value = "";
    if (!file) return;
    const ticket = ++imports.current;
    try {
      const config = ["actions", "tree"].includes(kind);
      if (file.size > (config ? 128 * 1024 : 30 * 1024 * 1024))
        throw new Error(
          config ? "配置文件请小于 128 KB。" : "模型或音频请小于 30 MB。",
        );
      if (kind === "model") {
        validateLocalGlb(await file.arrayBuffer());
        if (ticket !== imports.current) return;
        stop();
        setPending(null);
        if (form.model === file.name) setModelReady(false);
        setModels((old) => ({
          ...old,
          [file.name]: { url: objectUrl(file), name: file.name },
        }));
      } else if (kind === "actions") {
        const parsed = parseActionPack(await file.text());
        if (ticket !== imports.current) return;
        stop();
        setActions(parsed);
        setPackName(file.name);
      } else if (kind === "tree") {
        const parsed = parseTree(await file.text());
        if (ticket !== imports.current) return;
        const initial = parsed.forms.find((f) => f.id === parsed.initialForm);
        if (!resource(initial))
          throw new Error(`请先导入初始形态的模型：${initial.model}`);
        stop();
        setPending(null);
        setTree(parsed);
        setCurrent(parsed.initialForm);
        setSelected(parsed.initialForm);
        setPath([initial.name]);
        dispatch({ type: "reset" });
        setModelReady(false);
      } else {
        stop();
        setAudioFile({ url: objectUrl(file), name: file.name });
      }
      setNotice("本地文件已读取，仅本次页面有效，没有上传。");
      log(`读取本地文件 · ${file.name}`, "done");
    } catch (error) {
      if (ticket === imports.current)
        setNotice(error.message || "文件读取失败，请重试。");
    }
  }
  async function playAudio() {
    if (!audio.current || mode !== "demo") return;
    try {
      audio.current.currentTime = 0;
      await audio.current.play();
    } catch {
      setNotice("声音未能播放，请检查音频格式或浏览器播放权限。");
    }
  }
  function reset() {
    stop();
    setPending(null);
    dispatch({ type: "reset" });
    setCurrent(tree.initialForm);
    setSelected(tree.initialForm);
    setPath([tree.forms.find((f) => f.id === tree.initialForm).name]);
    log("新一轮演示 · 恢复配置的初始形态");
  }
  function evolve(edge) {
    const target = tree.forms.find((f) => f.id === edge.to);
    if (
      mode !== "demo" ||
      pending ||
      session.running ||
      !modelReady ||
      session.count < edge.requiredResponses ||
      !resource(target) ||
      target.actions.some((id) => !actions.some((a) => a.id === id))
    )
      return;
    stop();
    setModelReady(false);
    setPending(target.id);
    log(`正在载入目标形态 · ${target.name}`);
  }
  return (
    <section className="hardware-page" aria-labelledby="lab-title">
      <input ref={input} type="file" hidden onChange={importFile} />
      {audioFile && (
        <audio
          ref={audio}
          src={audioFile.url}
          onPlay={() => {
            setAudioPlaying(true);
            log("本地音频开始播放");
          }}
          onPause={() => setAudioPlaying(false)}
          onEnded={() => {
            setAudioPlaying(false);
            log("本地音频播放结束", "done");
          }}
          onError={() => {
            setAudioPlaying(false);
            setNotice("音频无法解码，请换一个浏览器支持的文件。");
          }}
        />
      )}
      <div className="lab-wrap">
        <header className="lab-heading">
          <div>
            <span className="lab-eyebrow">NIULAI / EVOLUTION LAB</span>
            <h1 id="lab-title">它的成长，在这里发生。</h1>
            <p>模型留在本地，动作发生在身边。每一次回应，都看得见。</p>
          </div>
          <button
            className="lab-connect"
            onClick={() => setPairing((v) => !v)}
            aria-expanded={pairing}
          >
            <Cable size={16} />
            连接电脑
            <ChevronRight size={14} />
          </button>
        </header>
        {pairing && (
          <section className="lab-pairing" aria-label="电脑连接说明">
            <div>
              <b>本机连接程序尚未接入</b>
              <p>
                后续在这台电脑启动程序 → 输入一次性配对码 → 本机确认 →
                选择机械臂。当前可先使用下方本地演示。
              </p>
              <a href={DOC} target="_blank" rel="noreferrer">
                查看连接方案 <ArrowUpRight size={13} />
              </a>
            </div>
            <button aria-label="关闭连接说明" onClick={() => setPairing(false)}>
              <X size={18} />
            </button>
          </section>
        )}
        <div className="lab-modebar">
          <div className="lab-switch" aria-label="控制台模式">
            {[
              ["demo", "本地演示", Monitor],
              ["live", "真实硬件", Cable],
            ].map(([id, label, Icon]) => (
              <button
                key={id}
                aria-pressed={mode === id}
                onClick={() => {
                  stop();
                  setPending(null);
                  setMode(id);
                }}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
          <span className="lab-mode-note">
            {mode === "demo"
              ? "演示在本页运行 · 不驱动机械臂"
              : "等待本机连接 · 暂无实时硬件数据"}
          </span>
        </div>
        <div className="lab-main">
          <section className="lab-specimen" aria-label="牛来成长模型">
            <div className="lab-specimen-top">
              <span>
                牛来 <small>NIULAI</small>
              </span>
              <span className="lab-pill">
                {mode === "demo" ? "浏览器本地演示" : "硬件未连接"}
              </span>
            </div>
            <div className="lab-model">
              <div className="lab-orbit orbit-one" />
              <div className="lab-orbit orbit-two" />
              <div className="lab-floor" />
              <ModelPreview
                url={model.url}
                running={session.running}
                onReady={modelLoaded}
                onError={modelFailed}
              />
              <span className="lab-model-caption">
                {pending
                  ? "载入候选模型 · 尚未生效"
                  : "3D 角色示意 · 拖动可旋转"}
              </span>
            </div>
            <div className="lab-identity">
              <span className="lab-eyebrow">
                {mode === "demo" ? "当前演示形态" : "真实形态 · 尚未同步"}
              </span>
              <div>
                <h2>{mode === "demo" ? form.name : "等待连接"}</h2>
                <span>
                  {pending ? "切换中" : mode === "demo" ? "LOCAL" : "—"}
                </span>
              </div>
              <p>
                {mode === "demo"
                  ? "同一只牛来，从这里长出不同的可能。"
                  : "上方为模型预览，不代表硬件的当前姿态。"}
              </p>
            </div>
            <div className="lab-growth">
              <div>
                <span>
                  {mode === "demo"
                    ? `当前节点已完成 ${session.count} 次演示动作`
                    : "真实互动记录待同步"}
                </span>
                <GitBranch size={13} />
              </div>
              <p className="lab-path">
                {mode === "demo"
                  ? path.join(" → ")
                  : "设备完成回执将更新形态与实际进化路径。"}
              </p>
              <small>按配置的分支进化，不预设固定等级或终点。</small>
            </div>
            <div className="lab-stages" aria-label="查看形态资源">
              {tree.forms.map((f) => (
                <button
                  key={f.id}
                  aria-pressed={selected === f.id}
                  onClick={() => setSelected(f.id)}
                >
                  <span>
                    {f.id === current ? "当前演示" : "候选形态"}
                    {resource(f) && <Check size={12} />}
                  </span>
                  <b>{f.name}</b>
                  <small>{resource(f) ? "模型可读取" : "模型待导入"}</small>
                </button>
              ))}
            </div>
            <div className="lab-form-inspect">
              <b>{inspected.name}</b>
              <span>
                {inspected.model === "builtin:niulai"
                  ? "内置模型"
                  : inspected.model}
              </span>
              <small>点击形态仅查看资源；模型未就绪时不会切换。</small>
            </div>
            <div className="lab-branches">
              {branches.length ? (
                branches.map((edge) => {
                  const target = tree.forms.find((f) => f.id === edge.to),
                    missing = target.actions.some(
                      (id) => !actions.some((a) => a.id === id),
                    );
                  return (
                    <button
                      key={edge.to}
                      disabled={
                        mode !== "demo" ||
                        !!pending ||
                        !!session.running ||
                        !modelReady ||
                        session.count < edge.requiredResponses ||
                        !resource(target) ||
                        missing
                      }
                      onClick={() => evolve(edge)}
                    >
                      <span>进化演示 → {target.name}</span>
                      <small>
                        {!resource(target)
                          ? "等待目标模型"
                          : missing
                            ? "等待目标动作配置"
                            : `${session.count} / ${edge.requiredResponses} 次演示回应`}
                      </small>
                    </button>
                  );
                })
              ) : (
                <p>
                  当前节点的分支尚未配置。导入进化配置后，这里显示可前往的形态与条件。
                </p>
              )}
            </div>
          </section>
          <div className="lab-right">
            <section className="lab-card lab-actions">
              <div className="lab-section-head">
                <h2>表达与能力</h2>
                <span>
                  {mode === "demo" ? `${form.name} · 视觉演示` : "等待设备能力"}
                </span>
              </div>
              <p className="lab-description">
                读取当前形态配置，用模型预览动作与反馈。
              </p>
              <div className="lab-action-grid">
                {availableActions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => run(action)}
                    disabled={
                      mode !== "demo" ||
                      !!session.running ||
                      !!pending ||
                      !modelReady
                    }
                  >
                    <span>{action.label}</span>
                    <small>
                      {session.running?.action.id === action.id
                        ? "演示中…"
                        : "演示动作"}
                      <Play size={11} />
                    </small>
                  </button>
                ))}
              </div>
              {!availableActions.length && (
                <p className="lab-empty">
                  当前形态没有可用动作，请导入匹配的动作配置。
                </p>
              )}
              <div className="lab-voice">
                <Volume2 size={16} />
                <div>
                  <b>本地声音试听</b>
                  <small>{audioFile?.name || "导入音频，听见它的声音"}</small>
                </div>
                <button
                  disabled={!audioFile || mode !== "demo" || audioPlaying}
                  onClick={playAudio}
                >
                  {audioPlaying ? "播放中" : "试听"}
                </button>
              </div>
              <div className="lab-session-controls">
                <button
                  onClick={() => {
                    stop();
                    log("演示已停止，本次不计为完成");
                  }}
                  disabled={!session.running && !audioPlaying}
                >
                  <Pause size={13} />
                  停止演示
                </button>
                <button disabled={mode !== "demo"} onClick={reset}>
                  <RotateCcw size={13} />
                  重新开始
                </button>
              </div>
            </section>
            <section className="lab-card lab-files">
              <div className="lab-section-head">
                <h2>本地能力包</h2>
                <span>
                  <HardDrive size={12} /> 不上传文件
                </span>
              </div>
              {[
                [
                  "model",
                  "角色模型",
                  "GLB",
                  `${Object.keys(models).length} 个已导入 · 内置普通牛来`,
                  FolderOpen,
                ],
                [
                  "tree",
                  "进化配置",
                  "JSON",
                  `${tree.forms.length} 个形态 · ${tree.edges.length} 条分支`,
                  GitBranch,
                ],
                [
                  "actions",
                  "动作配置",
                  "JSON",
                  `${packName} · ${actions.length} 个动作`,
                  FileJson,
                ],
                [
                  "audio",
                  "声音素材",
                  "AUDIO",
                  audioFile?.name || "尚未导入",
                  Volume2,
                ],
              ].map(([kind, label, format, detail, Icon]) => (
                <div className="lab-file-row" key={kind}>
                  <span className="lab-file-icon">
                    <Icon size={18} />
                  </span>
                  <div>
                    <b>
                      {label} <small>{format}</small>
                    </b>
                    <p>{detail}</p>
                  </div>
                  <button
                    aria-label={`导入${label}`}
                    onClick={() => selectFile(kind)}
                  >
                    导入
                  </button>
                </div>
              ))}
              <div className="lab-file-links">
                <a href="/hardware/evolution.example.json" download>
                  进化配置模板 <ArrowUpRight size={12} />
                </a>
                <a href="/hardware/actions.example.json" download>
                  动作示例 <ArrowUpRight size={12} />
                </a>
                <button
                  onClick={() => {
                    imports.current++;
                    stop();
                    setPending(null);
                    setTree(defaultTree);
                    setCurrent("normal");
                    setSelected("normal");
                    setPath(["普通牛来"]);
                    dispatch({ type: "reset" });
                    setActions(defaultActions);
                    setPackName("内置视觉动作包");
                    setModels({});
                    setAudioFile(null);
                    setNotice("已恢复内置资源。");
                  }}
                >
                  恢复内置
                </button>
              </div>
              <p className="lab-file-note">
                模型按配置中的文件名匹配。文件仅本页使用，刷新后需重新选择。推理模型与驱动由后续本机程序管理。
              </p>
              {notice && (
                <p className="lab-notice" role="status">
                  {notice}
                </p>
              )}
            </section>
          </div>
        </div>
        <div className="lab-bottom">
          <section className="lab-card lab-devices">
            <div className="lab-section-head">
              <h2>运行与同步</h2>
              <span>真实连接状态</span>
            </div>
            <div className="lab-device-grid">
              {[
                [Cpu, "本机程序", "尚未连接"],
                [Cable, "机械臂", "等待设备"],
                [Camera, "摄像头", "尚未接入"],
                [Cloud, "云端同步", "尚未接入"],
              ].map(([Icon, label, status]) => (
                <div key={label}>
                  <Icon size={17} />
                  <b>{label}</b>
                  <span>{status}</span>
                </div>
              ))}
            </div>
            <p>
              动作与推理计划在本机执行，云端同步事件与摘要。当前演示没有写入真实成长档案。
            </p>
          </section>
          <section className="lab-card lab-events">
            <div className="lab-section-head">
              <h2>
                <Activity size={15} />
                实时事件
              </h2>
              <span>来源：本页演示</span>
            </div>
            <div
              className="lab-event-list"
              role="log"
              aria-label="本地演示事件"
              aria-live="polite"
            >
              {events.length ? (
                events.map((event) => (
                  <div className={`lab-event ${event.kind}`} key={event.id}>
                    <time>{event.time}</time>
                    <span>{event.text}</span>
                  </div>
                ))
              ) : (
                <p className="lab-empty">
                  等待第一次回应。点击动作，观察执行状态与本地事件。
                </p>
              )}
            </div>
          </section>
        </div>
        <footer className="lab-footer">
          <span>LOCAL FIRST. GROW TOGETHER.</span>
          <p>形态跟随模型，进化遵循配置；演示结果与真实成长分开。</p>
          <a href={DOC} target="_blank" rel="noreferrer">
            控制内核方案 <ArrowUpRight size={12} />
          </a>
        </footer>
      </div>
    </section>
  );
}
