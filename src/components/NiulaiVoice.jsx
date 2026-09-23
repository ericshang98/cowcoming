import { Localized, useLanguage, translateText } from "../i18n/Language";
import { useEffect, useRef } from "react";
import { Play, Square, Volume2, VolumeX, X } from "lucide-react";
import { useApp } from "../context";
import voices from "../voices.json";
import "./niulai-voice.css";

export default function NiulaiVoice() {
  const { language } = useLanguage();
  const { homeModel, voiceOpen, setVoiceOpen, muted, setMuted, paused, setPaused,
    voiceState: state, playVoice, stopVoice, collection } = useApp();
  const closeButton = useRef(null);
  const wasOpen = useRef(voiceOpen);
  useEffect(() => {
    if (wasOpen.current && !voiceOpen) stopVoice();
    wasOpen.current = voiceOpen;
  }, [voiceOpen, stopVoice]);
  useEffect(() => {
    if (!voiceOpen) return;
    const previous = document.activeElement;
    closeButton.current?.focus({ preventScroll: true });
    return () => { if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, [voiceOpen]);
  const close = () => { stopVoice(); setVoiceOpen(false); };
  const busy = state.status === "playing" || state.status === "loading";
  return (
    <Localized><div className="niulai-voice">
      {voiceOpen && (
        <section id="niulai-voice-panel" className="voice-panel" aria-label="Voice collection"
          onKeyDown={(event) => {
            if (event.key === "Escape") { event.stopPropagation(); close(); }
            if (event.key === " ") event.stopPropagation();
          }}>
          <header>
            <div><span className="eyebrow">NIULAI · VOICE</span><h2>Voice collection</h2></div>
            <button ref={closeButton} onClick={close} aria-label="Close voice collection"><X size={19} /></button>
          </header>
          <p className="voice-intro">Pick a line. Hear it in my own voice.</p>
          {!homeModel.mouth && <p className="voice-intro">{translateText(`${homeModel.name}暂不支持口型`, language)}</p>}
          <div className="voice-settings">
            <button onClick={() => { stopVoice(); setMuted(!muted); }}>
              {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
              {muted ? "Sound off · Unmute" : "Sound on · Mute"}
            </button>
            {paused && <button onClick={() => setPaused(false)}>Resume animation to listen</button>}
          </div>
          <div className="voice-list">
            {voices.map((track) => {
              const active = busy && state.track?.id === track.id;
              const locked = track.id === "mama" && !collection.unlocked;
              return (
                <button key={track.id} className={active ? "is-active" : ""}
                  aria-label={`${active ? "Stop" : "Play"}: ${track.textEn}`}
                  aria-pressed={active} disabled={muted || paused || locked}
                  onClick={() => active ? stopVoice() : playVoice(track)}>
                  <span className="voice-play-icon">{active ? <Square size={14} /> : <Play size={14} />}</span>
                  <span className="voice-line"><strong>{track.textEn}</strong><small>{locked ? `WORLD stars ${collection.collected.length}/27 · Collect all to unlock` : `${track.groupEn} · ${track.duration.toFixed(1)} sec`}</small></span>
                </button>
              );
            })}
          </div>
          <div className="voice-caption" role="status" aria-live="polite" data-status={state.status}>
            <span>{state.status === "loading" ? "Getting ready…" : state.status === "playing" ? "Now speaking" : state.status === "ended" ? "Just heard" : ""}</span>
            <p>{state.error || (busy || state.status === "ended" ? state.track?.textEn : homeModel.mouth ? "Pick a line to hear me speak. Watch my mouth move with the sound." : "Pick a line. Hear it in my own voice.")}</p>
          </div>
        </section>
      )}
    </div></Localized>
  );
}
