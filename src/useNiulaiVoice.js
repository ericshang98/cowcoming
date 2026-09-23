import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createVoicePlayer } from "./voice-player.mjs";
import { pickWaveVoice } from "./voice-interactions.mjs";
import voices from "./voices.json";
import { canPlayTrack } from "./world-collection.mjs";

export function useNiulaiVoice({
  controller,
  muted,
  paused,
  mode,
  enabled,
  collected = [],
}) {
  const [voiceState, setState] = useState({
    status: "idle",
    track: null,
    error: "",
  });
  const [interactionNotice, setNotice] = useState("");
  const previous = useRef(null);
  const player = useMemo(
    () =>
      createVoicePlayer({
        onState: setState,
        onLevel: (level, active) => {
          controller.voiceLevel = level;
          controller.voiceActive = active;
          controller.mouthPose = "closed";
        },
      }),
    [controller],
  );
  useEffect(() => () => player.dispose(), [player]);
  useEffect(() => {
    if (muted || paused || !enabled) player.stop();
  }, [muted, paused, enabled, player]);
  useEffect(() => {
    player.stop();
    setNotice("");
  }, [mode, player]);
  useEffect(() => {
    const hide = () => {
      if (document.hidden) player.stop();
    };
    document.addEventListener("visibilitychange", hide);
    return () => document.removeEventListener("visibilitychange", hide);
  }, [player]);
  const playVoice = useCallback(
    (track, gesture, { loop = false } = {}) => {
      if (!enabled) return;
      setNotice("");
      if (!track || !canPlayTrack(track.id, collected, mode)) {
        setNotice("Press L to interact.");
        return;
      }
      if (paused) {
        setNotice("Animation is paused. Resume to play.");
        return;
      }
      if (muted) {
        if (gesture) controller.gesture(gesture);
        setNotice("Sound is off. Unmute to hear me.");
        return;
      }
      player.play(track, {
        loop,
        onStart: () => {
          if (gesture) controller.gesture(gesture);
        },
      });
    },
    [enabled, muted, paused, controller, player, collected, mode],
  );
  const callMama = useCallback(
    ({ loop = false } = {}) => playVoice(voices.find((v) => v.id === "mama"), undefined, { loop }),
    [playVoice],
  );
  const wave = useCallback(() => {
    const track = pickWaveVoice(voices, previous.current);
    previous.current = track.id;
    playVoice(track, "wave");
  }, [playVoice]);
  useEffect(() => {
    controller.onCharacterTap =
      mode === "home" && enabled ? callMama : undefined;
    return () => {
      controller.onCharacterTap = undefined;
    };
  }, [mode, enabled, callMama, controller]);
  return {
    voiceState,
    interactionNotice,
    playVoice,
    stopVoice: player.stop,
    callMama,
    wave,
  };
}
