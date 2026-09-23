import { useCallback, useEffect, useRef, useState } from "react";
import {
  collectStar,
  readCollection,
  writeCollection,
  mamaUnlocked,
} from "./world-collection.mjs";
function storage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
export function useWorldCollection() {
  const [initial] = useState(() => readCollection(storage()));
  const [collected, setCollected] = useState(initial.ids);
  const [persistent, setPersistent] = useState(initial.persistent);
  const [lastPickup, setLastPickup] = useState(null);
  const [celebrating, setCelebrating] = useState(false);
  const current = useRef(collected);
  useEffect(() => {
    setPersistent(writeCollection(storage(), collected));
  }, [collected]);
  const collect = useCallback((id, position, active) => {
    const next = collectStar(current.current, id, position, active);
    if (next === current.current) return false;
    current.current = next;
    setCollected(next);
    setLastPickup({ id, count: next.length });
    if (mamaUnlocked(next)) setCelebrating(true);
    return true;
  }, []);
  useEffect(() => {
    if (!lastPickup) return;
    const timer = setTimeout(() => setLastPickup(null), 2600);
    return () => clearTimeout(timer);
  }, [lastPickup]);
  const dismissCelebration = useCallback(() => setCelebrating(false), []);
  return {
    collected,
    persistent,
    lastPickup,
    celebrating,
    dismissCelebration,
    collect,
    unlocked: mamaUnlocked(collected),
  };
}
