import { useCallback, useEffect, useRef, useState } from 'react';
import { useGLTF } from '@react-three/drei';
import { getIp, savedIp } from './ip-catalog.mjs';

export function useIpSelection(onUserSelected) {
  const [active, setActive] = useState('niulai');
  const [pending, setPending] = useState(null);
  const [error, setError] = useState(null);
  const token = useRef(0), activeRef = useRef(active), onSelected = useRef(onUserSelected);
  onSelected.current = onUserSelected;
  const cancel = useCallback(() => { token.current++; setPending(null); setError(null); }, []);
  const select = useCallback((id, user = true) => {
    const ip = getIp(id); if (!ip?.available) return;
    const request = ++token.current; setError(null);
    if (activeRef.current === id) { setPending(null); if (user) onSelected.current(); return; }
    useGLTF.clear(ip.model);
    setPending({ ip, request, user });
  }, []);
  const complete = useCallback(() => {
    if (!pending || token.current !== pending.request) return;
    activeRef.current = pending.ip.id; setActive(pending.ip.id); setPending(null);
    try { localStorage.setItem('cowcoming-ip', pending.ip.id); } catch { /* Optional preference. */ }
    if (pending.user) onSelected.current();
  }, [pending]);
  const fail = useCallback(() => {
    if (!pending || token.current !== pending.request) return;
    setError(pending.ip.id); setPending(null);
  }, [pending]);
  useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(fail, 20000);
    return () => clearTimeout(timer);
  }, [pending, fail]);
  useEffect(() => {
    let id; try { id = savedIp(localStorage); } catch { id = 'niulai'; }
    if (id !== 'niulai') select(id, false);
    return () => { token.current++; };
  }, [select]);
  return { active, pending, error, select, cancel, complete, fail };
}
