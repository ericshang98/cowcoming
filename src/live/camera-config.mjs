const clamp = (n, lo, hi, fallback) =>
  Number.isFinite(Number(n)) ? Math.max(lo, Math.min(hi, Number(n))) : fallback;
const pick = (v, list, fallback) => (list.includes(v) ? v : fallback);
export const CAMERA_DEFAULTS = Object.freeze({
  source: "local",
  url: "http://127.0.0.1:8767/snapshot",
  deviceId: "",
  width: 1280,
  height: 720,
  fps: 30,
  refresh: 10,
  title: "",
  ratio: "16:9",
  fit: "contain",
  rotation: 0,
  mirror: false,
  zoom: 1,
  brightness: 100,
  contrast: 100,
  boxes: true,
  points: true,
  grid: false,
});
export function normalizeCameraConfig(raw = {}) {
  const d = CAMERA_DEFAULTS,
    auto = raw.width === 0 && raw.height === 0;
  return {
    source: pick(raw.source, ["local", "browser", "peer"], d.source),
    url: typeof raw.url === "string" ? raw.url.slice(0, 300) : d.url,
    deviceId:
      typeof raw.deviceId === "string" ? raw.deviceId.slice(0, 300) : "",
    width: auto
      ? 0
      : Math.round(clamp(raw.width ?? d.width, 160, 7680, d.width)),
    height: auto
      ? 0
      : Math.round(clamp(raw.height ?? d.height, 120, 4320, d.height)),
    fps: clamp(raw.fps ?? d.fps, 1, 60, d.fps),
    refresh: clamp(raw.refresh ?? d.refresh, 1, 30, d.refresh),
    title: typeof raw.title === "string" ? raw.title.slice(0, 40) : "",
    ratio: pick(raw.ratio, ["auto", "16:9", "4:3", "1:1", "9:16"], d.ratio),
    fit: pick(raw.fit, ["contain", "cover"], d.fit),
    rotation: pick(Number(raw.rotation), [0, 90, 180, 270], 0),
    mirror: raw.mirror === true,
    zoom: clamp(raw.zoom ?? 1, 1, 3, 1),
    brightness: clamp(raw.brightness ?? 100, 50, 150, 100),
    contrast: clamp(raw.contrast ?? 100, 50, 150, 100),
    boxes: raw.boxes !== false,
    points: raw.points !== false,
    grid: raw.grid === true,
  };
}
export function cameraConstraints(c) {
  return {
    audio: false,
    video: {
      ...(c.deviceId ? { deviceId: { exact: c.deviceId } } : {}),
      ...(c.width
        ? { width: { ideal: c.width }, height: { ideal: c.height } }
        : {}),
      frameRate: { ideal: c.fps },
    },
  };
}
export function localCameraUrl(value) {
  const u = new URL(value);
  if (
    !["http:", "https:"].includes(u.protocol) ||
    !["localhost", "127.0.0.1", "[::1]"].includes(u.hostname) ||
    u.username ||
    u.password ||
    u.search ||
    u.hash
  )
    throw new Error("local_url");
  return u.href;
}
export function mediaLayout(w, h, iw, ih, fit, rotation) {
  const rotated = rotation % 180 !== 0,
    rw = rotated ? ih : iw,
    rh = rotated ? iw : ih;
  const scale = (fit === "cover" ? Math.max : Math.min)(w / rw, h / rh);
  return { width: iw * scale, height: ih * scale };
}
function box(b) {
  const v = b?.bbox ?? b?.box;
  if (
    !Array.isArray(v) ||
    v.length !== 4 ||
    !v.every(
      (n) => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 1,
    ) ||
    !v[2] ||
    !v[3]
  )
    return null;
  return {
    id: String(b.id ?? "").slice(0, 40),
    label: String(b.label ?? "person").slice(0, 40),
    bbox: [v[0], v[1], Math.min(v[2], 1 - v[0]), Math.min(v[3], 1 - v[1])],
  };
}
export function parseSnapshot(s) {
  if (!s || typeof s !== "object") throw new Error("snapshot_format");
  const age = s.ageMs ?? s.age_ms;
  if (
    !Number.isFinite(age) ||
    age < 0 ||
    age > 1500 ||
    ["stale", "error", "starting"].includes(s.state)
  )
    throw new Error("snapshot_stale");
  const seq = s.frameId ?? s.processed_frames;
  if (!["string", "number"].includes(typeof seq) || String(seq).length > 100)
    throw new Error("snapshot_format");
  const b64 = s.image?.base64 ?? s.jpeg,
    mime = s.image?.mime ?? "image/jpeg";
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(mime) ||
    typeof b64 !== "string" ||
    b64.length < 8 ||
    b64.length > 8_000_000 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(b64)
  )
    throw new Error("snapshot_format");
  const boxes = (Array.isArray(s.boxes) ? s.boxes : [])
      .slice(0, 30)
      .map(box)
      .filter(Boolean),
    points = [];
  for (const t of (Array.isArray(s.tracks) ? s.tracks : []).slice(0, 30)) {
    if (!t?.visible) continue;
    const body = box(t);
    if (!body) continue;
    boxes.push(body);
    const face = box({ ...t.face, label: "face", id: `${t.id}-face` });
    if (face) boxes.push(face);
    for (const p of Object.values(t.keypoints ?? {}).slice(0, 30))
      if (
        Number.isFinite(p?.x) &&
        Number.isFinite(p?.y) &&
        p.x >= 0 &&
        p.x <= 1 &&
        p.y >= 0 &&
        p.y <= 1
      )
        points.push({ x: p.x, y: p.y });
  }
  return {
    image: `data:${mime};base64,${b64}`,
    frameId: `${s.sessionId ?? s.service_started_at ?? ""}:${seq}`,
    age,
    boxes: boxes.slice(0, 60),
    points,
    width: clamp(s.width, 0, 7680, 0),
    height: clamp(s.height, 0, 4320, 0),
    fps: clamp(s.fps ?? s.capture_fps, 0, 240, 0),
  };
}
export async function readSnapshot(response) {
  if (!response.ok)
    throw new Error(
      response.status === 401 ? "local_auth" : `local_http_${response.status}`,
    );
  if (!response.headers.get("content-type")?.includes("application/json"))
    throw new Error("snapshot_format");
  const reader = response.body.getReader();
  let size = 0;
  const decoder = new TextDecoder();
  let text = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 8_100_000) throw new Error("snapshot_size");
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return parseSnapshot(JSON.parse(text));
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
