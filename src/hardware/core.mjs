export const defaultActions = [
  { id: "look", label: "看向你", motion: "look", durationMs: 1800 },
  { id: "bow", label: "轻轻低头", motion: "bow", durationMs: 2200 },
  { id: "nod", label: "点头回应", motion: "nod", durationMs: 2200 },
  { id: "tilt", label: "好奇歪头", motion: "tilt", durationMs: 2500 },
  { id: "reflect", label: "思考，再回应", motion: "reflect", durationMs: 3600 },
];
export const initialSession = { count: 0, running: null };
export function sessionReducer(state, event) {
  if (event.type === "reset") return initialSession;
  if (event.type === "stop") return { ...state, running: null };
  if (event.type === "start") {
    if (state.running) return state;
    return { ...state, running: { id: event.id, action: event.action } };
  }
  if (event.type === "complete" && state.running?.id === event.id) {
    return { count: state.count + 1, running: null };
  }
  return state;
}
export function parseActionPack(text) {
  const pack = JSON.parse(text);
  if (
    pack.version !== 1 ||
    !Array.isArray(pack.actions) ||
    !pack.actions.length ||
    pack.actions.length > 24
  )
    throw new Error("请使用 version 为 1、包含 1–24 个动作的配置。");
  const ids = new Set();
  return pack.actions.map((a) => {
    if (
      !a ||
      typeof a.id !== "string" ||
      !/^[a-z0-9_-]{1,40}$/.test(a.id) ||
      ids.has(a.id)
    )
      throw new Error(
        "动作 ID 必须唯一，只能包含小写字母、数字、短横线与下划线。",
      );
    if (typeof a.label !== "string" || !a.label.trim() || a.label.length > 24)
      throw new Error("每个动作需要 1–24 字的名称。");
    if (!["look", "bow", "nod", "tilt", "reflect"].includes(a.motion))
      throw new Error("动作预览仅支持 look、bow、nod、tilt、reflect。");
    if (
      !Number.isInteger(a.durationMs) ||
      a.durationMs < 500 ||
      a.durationMs > 10000
    )
      throw new Error("时长须为 500–10000 毫秒。");
    ids.add(a.id);
    return {
      id: a.id,
      label: a.label.trim(),
      motion: a.motion,
      durationMs: a.durationMs,
    };
  });
}
export function validateLocalGlb(buffer) {
  const view = new DataView(buffer);
  if (
    view.byteLength < 20 ||
    view.getUint32(0, true) !== 0x46546c67 ||
    view.getUint32(4, true) !== 2 ||
    view.getUint32(8, true) !== view.byteLength ||
    view.getUint32(16, true) !== 0x4e4f534a
  )
    throw new Error("请选择有效的 GLB 2.0 模型。");
  const length = view.getUint32(12, true);
  if (length > buffer.byteLength - 20) throw new Error("模型文件不完整。");
  const manifest = JSON.parse(
    new TextDecoder().decode(new Uint8Array(buffer, 20, length)),
  );
  for (const resource of [
    ...(manifest.buffers || []),
    ...(manifest.images || []),
  ]) {
    if (resource.uri && !resource.uri.startsWith("data:"))
      throw new Error("请选择纹理与模型全部内嵌的 GLB，避免依赖外部文件。");
  }
  return true;
}

export const defaultTree = {
  version: 1,
  initialForm: "normal",
  forms: [
    {
      id: "normal",
      name: "普通牛来",
      model: "builtin:niulai",
      actions: defaultActions.map((a) => a.id),
    },
    {
      id: "young",
      name: "幼年牛来",
      model: "young.glb",
      actions: ["look", "bow"],
    },
    {
      id: "mature",
      name: "成熟牛来",
      model: "mature.glb",
      actions: ["look", "nod", "tilt"],
    },
    { id: "hard", name: "硬牛", model: "hard.glb", actions: [] },
  ],
  edges: [],
};
export function parseTree(text) {
  const tree = JSON.parse(text);
  if (
    tree.version !== 1 ||
    !Array.isArray(tree.forms) ||
    !tree.forms.length ||
    tree.forms.length > 24 ||
    !Array.isArray(tree.edges) ||
    tree.edges.length > 48
  )
    throw new Error("进化配置需包含 1–24 个形态及 edges 数组。");
  const ids = new Set();
  const forms = tree.forms.map((f) => {
    if (
      !f ||
      typeof f.id !== "string" ||
      !/^[a-z0-9_-]{1,40}$/.test(f.id) ||
      ids.has(f.id) ||
      typeof f.name !== "string" ||
      !f.name.trim() ||
      f.name.length > 24
    )
      throw new Error("形态需要唯一 ID 与有效名称。");
    if (
      typeof f.model !== "string" ||
      !(f.model === "builtin:niulai" || /^[^/\\:]{1,100}\.glb$/i.test(f.model))
    )
      throw new Error("模型请引用本地 GLB 文件名。");
    if (
      !Array.isArray(f.actions) ||
      f.actions.length > 24 ||
      f.actions.some(
        (id) => typeof id !== "string" || !/^[a-z0-9_-]{1,40}$/.test(id),
      )
    )
      throw new Error("形态动作须为动作 ID 数组。");
    ids.add(f.id);
    return {
      id: f.id,
      name: f.name,
      model: f.model,
      actions: [...new Set(f.actions)],
    };
  });
  if (!ids.has(tree.initialForm)) throw new Error("初始形态必须存在。");
  const connections = new Set();
  const edges = tree.edges.map((e) => {
    if (
      !e ||
      !ids.has(e.from) ||
      !ids.has(e.to) ||
      e.from === e.to ||
      !Number.isInteger(e.requiredResponses) ||
      e.requiredResponses < 1 ||
      e.requiredResponses > 10000 ||
      connections.has(e.from + ":" + e.to)
    )
      throw new Error(
        "分支需要有效的起止节点、唯一连接和 1–10000 次演示回应条件。",
      );
    connections.add(e.from + ":" + e.to);
    return { from: e.from, to: e.to, requiredResponses: e.requiredResponses };
  });
  const seen = new Set(),
    active = new Set();
  function visit(id) {
    if (active.has(id)) throw new Error("进化树不能包含循环。");
    if (seen.has(id)) return;
    active.add(id);
    for (const e of edges.filter((e) => e.from === id)) visit(e.to);
    active.delete(id);
    seen.add(id);
  }
  forms.forEach((f) => visit(f.id));
  return { version: 1, initialForm: tree.initialForm, forms, edges };
}
