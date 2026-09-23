import { useCallback, useEffect, useRef, useState } from "react";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DEFAULT_HOME_MODEL, HOME_MODELS } from "./home-models.mjs";

// Cache source scenes for this page session. Rig clones own their materials;
// shared source geometry/textures stay available when returning to HOME.
const assets = new Map();
function loadModel(model) {
  if (model.id === DEFAULT_HOME_MODEL.id) return Promise.resolve(null);
  if (assets.has(model.id)) return assets.get(model.id);
  const abort = new AbortController();
  let timer;
  const loading = (async () => {
    const response = await fetch(model.asset, { signal: abort.signal });
    if (!response.ok) throw new Error("Model request failed");
    return new GLTFLoader().parseAsync(await response.arrayBuffer(), "");
  })();
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      abort.abort();
      reject(new Error("Model request timed out"));
    }, 20000);
  });
  const result = Promise.race([loading, timeout])
    .catch((error) => {
      assets.delete(model.id);
      throw error;
    })
    .finally(() => clearTimeout(timer));
  assets.set(model.id, result);
  return result;
}

export default function useHomeModel(mode) {
  const [selection, setSelection] = useState({
    model: DEFAULT_HOME_MODEL,
    gltf: null,
  });
  const [pending, setPending] = useState(null);
  const [error, setError] = useState("");
  const sequence = useRef(0);
  const currentMode = useRef(mode);
  currentMode.current = mode;
  const cancel = useCallback(() => {
    sequence.current++;
    setPending(null);
    setError("");
  }, []);
  useEffect(() => {
    if (mode !== "home") cancel();
  }, [mode, cancel]);
  useEffect(
    () => () => {
      sequence.current++;
    },
    [],
  );
  const choose = useCallback(
    async (id) => {
      if (currentMode.current !== "home") return;
      const model = HOME_MODELS.find((item) => item.id === id);
      if (!model) return;
      const request = ++sequence.current;
      setError("");
      if (model.id === selection.model.id) {
        setPending(null);
        return;
      }
      setPending(model);
      try {
        const gltf = await loadModel(model);
        if (request !== sequence.current || currentMode.current !== "home")
          return;
        setSelection({ model, gltf });
        setPending(null);
      } catch {
        if (request !== sequence.current || currentMode.current !== "home")
          return;
        setPending(null);
        setError(
          `${model.name}加载失败，仍显示${selection.model.name}。请重试。`,
        );
      }
    },
    [selection],
  );
  return { selection, pending, error, choose, cancel };
}
