import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getIp } from './ip-catalog.mjs';

export function useIpVoice({ controller, ipId, enabled, muted, paused }) {
  const audio = useMemo(() => new Audio(), []), request = useRef(0), loadingTimer = useRef(null);
  const [voiceState, setState] = useState({ status: 'idle', track: null, error: '' });
  const [interactionNotice, setNotice] = useState('');
  const stopVoice = useCallback(() => {
    clearTimeout(loadingTimer.current);
    request.current++; audio.pause(); audio.currentTime = 0; controller.ipPlayback = null;
    setState({ status: 'idle', track: null, error: '' });
  }, [audio, controller]);
  useEffect(() => { stopVoice(); setNotice(''); }, [ipId, enabled, muted, paused, stopVoice]);
  useEffect(() => {
    const hide = () => { if (document.hidden) stopVoice(); };
    document.addEventListener('visibilitychange', hide); window.addEventListener('pagehide', stopVoice);
    return () => { document.removeEventListener('visibilitychange', hide); window.removeEventListener('pagehide', stopVoice); clearTimeout(loadingTimer.current); audio.pause(); controller.ipPlayback = null; request.current++; };
  }, [audio, controller, stopVoice]);
  const play = useCallback(async input => {
    if (!enabled) return;
    if (paused) { setNotice('Animation is paused. Resume to play.'); return; }
    stopVoice(); setNotice('');
    const track = getIp(ipId)?.actions?.[input], token = request.current;
    if (!track) return;
    audio.src = track.src; audio.muted = muted; audio.volume = .65;
    setState({ status: 'loading', track, error: '' });
    const fail = () => { if (token !== request.current) return; stopVoice(); setState({ status: 'error', track, error: '声音暂时无法播放，请再试一次。' }); };
    audio.onerror = fail;
    loadingTimer.current = setTimeout(fail, 12000);
    audio.onended = () => { if (token === request.current) stopVoice(); };
    try {
      await audio.play(); if (token !== request.current) return;
      clearTimeout(loadingTimer.current);
      controller.queue.clear(); controller.ipPlayback = { clip: track.clip, duration: track.duration, audio };
      setState({ status: 'playing', track, error: '' });
    } catch { fail(); }
  }, [ipId, enabled, paused, muted, stopVoice, audio, controller]);
  return { voiceState, interactionNotice, stopVoice, tap: useCallback(() => play('tap'), [play]), wave: useCallback(() => play('signature'), [play]) };
}
