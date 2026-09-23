import { useCallback, useEffect, useRef, useState } from "react";
import usePeerCamera from "./usePeerCamera";
import {
  CAMERA_DEFAULTS,
  normalizeCameraConfig,
  cameraConstraints,
  localCameraUrl,
  readSnapshot,
} from "./camera-config.mjs";

const empty = () => ({
  stream: null,
  image: null,
  detections: null,
  actual: null,
  status: "idle",
  error: "",
  frameAt: 0,
});
const preferenceKey = (room) => `cowcoming.camera.v1.${room || "unbound"}`;
function saved(room) {
  try {
    return normalizeCameraConfig(
      JSON.parse(localStorage.getItem(preferenceKey(room))) ?? {},
    );
  } catch {
    return { ...CAMERA_DEFAULTS };
  }
}
export default function useLocalCamera(live) {
  const room = live.snapshot?.roomId,
    peer = usePeerCamera(live);
  const [config, setConfig] = useState(() => saved(room)),
    [state, setState] = useState(empty),
    [devices, setDevices] = useState([]),
    [token, setToken] = useState("");
  const latest = useRef({}),
    resources = useRef({ generation: 0 }),
    mounted = useRef(true);
  latest.current = { live, config, token, peer };
  const release = useCallback(() => {
    const r = resources.current;
    r.generation++;
    clearTimeout(r.timer);
    clearTimeout(r.permissionTimer);
    r.abort?.abort();
    r.stream?.getTracks().forEach((t) => {
      t.onended = null;
      t.stop();
    });
    r.stream = null;
    r.abort = null;
    latest.current.peer.stop();
  }, []);
  const stop = useCallback(() => {
    release();
    if (mounted.current) setState(empty());
  }, [release]);
  const enumerate = useCallback(async () => {
    try {
      const all = await navigator.mediaDevices?.enumerateDevices();
      if (mounted.current)
        setDevices(
          (all ?? [])
            .filter((d) => d.kind === "videoinput")
            .map((d) => ({ deviceId: d.deviceId, label: d.label })),
        );
    } catch {
      /* permission hint remains visible */
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    const media = navigator.mediaDevices;
    media?.addEventListener?.("devicechange", enumerate);
    enumerate();
    return () => {
      mounted.current = false;
      media?.removeEventListener?.("devicechange", enumerate);
      release();
    };
  }, [enumerate, release]);
  useEffect(() => {
    stop();
    setToken("");
    setConfig(saved(room));
  }, [room, stop]);
  useEffect(() => {
    if (!live.online) stop();
  }, [live.online, stop]);
  const apply = useCallback(
    (next, nextToken) => {
      const clean = normalizeCameraConfig(next),
        old = latest.current.config;
      if (
        ["source", "url", "deviceId", "width", "height", "fps", "refresh"].some(
          (k) => clean[k] !== old[k],
        ) ||
        nextToken !== latest.current.token
      )
        stop();
      setConfig(clean);
      setToken(nextToken);
      try {
        localStorage.setItem(
          preferenceKey(latest.current.live.snapshot?.roomId),
          JSON.stringify(clean),
        );
      } catch {
        /* still usable for this visit */
      }
    },
    [stop],
  );
  const start = useCallback(async () => {
    stop();
    const { live, config: c, token: secret } = latest.current;
    if (!live.online) {
      setState({ ...empty(), error: "device_offline" });
      return;
    }
    if (c.source === "peer") {
      latest.current.peer.start();
      return;
    }
    const r = resources.current,
      gen = r.generation;
    const current = () =>
      mounted.current && r.generation === gen && latest.current.live.online;
    const fail = (code) => {
      if (current()) {
        release();
        setState({ ...empty(), status: "failed", error: code });
      }
    };
    setState({ ...empty(), status: "connecting" });
    if (c.source === "browser") {
      if (!navigator.mediaDevices?.getUserMedia) {
        fail("camera_unavailable");
        return;
      }
      r.permissionTimer = setTimeout(() => fail("camera_timeout"), 15000);
      try {
        const stream = await navigator.mediaDevices.getUserMedia(
          cameraConstraints(c),
        );
        if (!current()) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        clearTimeout(r.permissionTimer);
        r.stream = stream;
        const track = stream.getVideoTracks()[0];
        if (!track) {
          fail("camera_unavailable");
          return;
        }
        track.onended = () => fail("camera_ended");
        const actual = track.getSettings(),
          caps = track.getCapabilities?.() ?? {};
        setState({
          ...empty(),
          stream,
          status: "live",
          actual: { ...actual, label: track.label, caps },
        });
        enumerate();
      } catch (e) {
        fail(e.name || "camera_failed");
      }
      return;
    }
    let url;
    try {
      url = localCameraUrl(c.url);
    } catch {
      fail("local_url");
      return;
    }
    let previous = null,
      lastNew = Date.now();
    async function poll() {
      if (!current()) return;
      const controller = new AbortController();
      r.abort = controller;
      const deadline = setTimeout(() => controller.abort(), 4000);
      const requestedAt = Date.now();
      let decodeTimer;
      try {
        const response = await fetch(url, {
          signal: controller.signal,
          cache: "no-store",
          credentials: "omit",
          redirect: "error",
          referrerPolicy: "no-referrer",
          headers: secret ? { Authorization: `Bearer ${secret}` } : {},
        });
        const frame = await readSnapshot(response);
        if (!current()) return;
        if (frame.frameId !== previous) {
          const img = new Image();
          img.src = frame.image;
          await Promise.race([
            img.decode(),
            new Promise((_, reject) => {
              decodeTimer = setTimeout(
                () => reject(new Error("snapshot_decode")),
                3000,
              );
            }),
          ]);
          clearTimeout(decodeTimer);
          if (!current()) return;
          previous = frame.frameId;
          lastNew = Date.now();
          const age = frame.age + lastNew - requestedAt;
          if (age > 1500) throw new Error("snapshot_stale");
          setState({
            ...empty(),
            image: frame.image,
            status: "live",
            frameAt: lastNew - age,
            actual: {
              width: img.naturalWidth,
              height: img.naturalHeight,
              frameRate: frame.fps,
            },
            detections: {
              boxes: frame.boxes,
              points: frame.points,
              receivedAt: lastNew - age,
            },
          });
        } else if (Date.now() - lastNew > 2000) {
          throw new Error("snapshot_stale");
        }
      } catch (e) {
        if (current())
          fail(
            e.name === "AbortError"
              ? "local_timeout"
              : e instanceof TypeError
                ? "local_network"
                : e.message?.startsWith("snapshot_") ||
                    e.message?.startsWith("local_")
                  ? e.message
                  : "snapshot_format",
          );
        return;
      } finally {
        clearTimeout(deadline);
        clearTimeout(decodeTimer);
      }
      if (current()) r.timer = setTimeout(poll, 1000 / c.refresh);
    }
    poll();
  }, [stop, release, enumerate]);
  return {
    ...(config.source === "peer"
      ? { ...peer, image: null, actual: null, frameAt: 0 }
      : state),
    config,
    devices,
    token,
    apply,
    enumerate,
    start,
    stop,
  };
}
