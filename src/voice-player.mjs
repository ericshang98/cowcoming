// One short voice at a time. Generation checks also cancel decoding/resume races.
export function createVoicePlayer({
  onState,
  onLevel,
  createContext = () => new (window.AudioContext || window.webkitAudioContext)(),
  fetchAudio = (...args) => fetch(...args),
  requestFrame = (fn) => requestAnimationFrame(fn),
  cancelFrame = (id) => cancelAnimationFrame(id),
  timeoutMs = 12000,
}) {
  let context, source, analyser, frame, abort, timer, cancelWait;
  let generation = 0, disposed = false;
  const cache = new Map();
  const report = (state) => { if (!disposed) onState(state); };
  function stop() {
    generation++;
    abort?.abort();
    abort = null;
    cancelWait?.();
    cancelWait = null;
    clearTimeout(timer);
    cancelFrame(frame);
    if (source) {
      source.onended = null;
      try { source.stop(); } catch {}
      source.disconnect();
      source = null;
    }
    analyser?.disconnect();
    analyser = null;
    onLevel(0, false);
    report({ status: "idle", track: null, error: "" });
  }
  async function play(track, { onStart, loop = false } = {}) {
    if (disposed) return;
    stop();
    const token = generation;
    report({ status: "loading", track, loop, error: "" });
    try {
      context ||= createContext();
      // Called directly inside the click handler, before any fetch await.
      const resumed = context.resume();
      abort = new AbortController();
      const signal = abort.signal;
      const deadline = new Promise((_, reject) => {
        cancelWait = () => reject(new Error("cancelled"));
        timer = setTimeout(() => { abort?.abort(); reject(new Error("timeout")); }, timeoutMs);
      });
      const load = async () => {
        if (cache.has(track.src)) return cache.get(track.src);
        const response = await fetchAudio(track.src, { signal });
        if (!response.ok) throw new Error("download failed");
        const buffer = await context.decodeAudioData(await response.arrayBuffer());
        if (!disposed && token === generation) cache.set(track.src, buffer);
        return buffer;
      };
      const [, buffer] = await Promise.race([Promise.all([resumed, load()]), deadline]);
      if (disposed || token !== generation) return;
      clearTimeout(timer);
      cancelWait = null;
      abort = null;
      if (context.state !== "running") throw new Error("audio suspended");
      source = context.createBufferSource();
      source.buffer = buffer;
      source.loop = loop;
      analyser = context.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyser.connect(context.destination);
      const samples = new Float32Array(analyser.fftSize);
      const sample = () => {
        if (token !== generation || disposed) return;
        if (context.state !== "running") { stop(); return; }
        analyser.getFloatTimeDomainData(samples);
        const rms = Math.sqrt(samples.reduce((sum, n) => sum + n * n, 0) / samples.length);
        onLevel(Math.min(1, Math.max(0, (rms - 0.008) * 5)), true);
        frame = requestFrame(sample);
      };
      source.onended = () => {
        if (token !== generation) return;
        stop();
        report({ status: "ended", track, error: "" });
      };
      source.start();
      onStart?.();
      report({ status: "playing", track, loop, error: "" });
      sample();
    } catch {
      if (disposed || token !== generation) return;
      stop();
      report({ status: "error", track, error: "Couldn’t play this line. Tap it to try again." });
    }
  }
  return {
    play,
    stop,
    dispose() {
      disposed = true;
      stop();
      cache.clear();
      context?.close().catch(() => {});
    },
  };
}
