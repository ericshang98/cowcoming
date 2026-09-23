import { useCallback, useEffect, useRef } from 'react';
import { planEvolutionSync } from './evolution-sync.mjs';
export function useEvolutionDeviceSync(session, live) {
  const memory = useRef(null);
  const latest = useRef(session.state);
  latest.current = session.state;
  useEffect(() => {
    const plan = planEvolutionSync(memory.current, session.state, live.snapshot, live.status === 'connected', live.error);
    memory.current = plan.memory;
    if (plan.adoptForm) session.dispatch({ type: 'select', form: plan.adoptForm });
    if (plan.patch) live.updateProfile(plan.patch);
  }, [session.state.sessionId, session.state.generation, session.state.form, live.snapshot?.roomId, live.snapshot?.profile.revision, live.status, live.error, live.updateProfile, session.dispatch]);
  return useCallback((revision, formId) => {
    const m = memory.current, state = latest.current;
    return Boolean(m && !m.pending && m.revision === revision && state.form === formId && m.local === `${state.sessionId}:${state.generation}:${state.form}`);
  }, []);
}
