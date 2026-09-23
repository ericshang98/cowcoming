import { useCallback, useEffect, useReducer, useRef } from 'react';
import { createEvolutionSession, readEvolutionSettings, evolutionReducer, evaluationDue, evaluationRequest, requestEvolutionEvaluation, EVOLUTION_SETTINGS_KEY } from './evolution-session.mjs';

export function useEvolutionSession() {
  const [state, dispatch] = useReducer(evolutionReducer, null, () => {
    let storage; try { storage = window.localStorage; } catch { /* Storage is optional. */ }
    return createEvolutionSession(crypto.randomUUID(), readEvolutionSettings(storage));
  });
  const stateRef = useRef(state);
  stateRef.current = state;
  useEffect(() => {
    try { localStorage.setItem(EVOLUTION_SETTINGS_KEY, JSON.stringify(state.settings)); } catch { /* Session remains usable. */ }
  }, [state.settings]);
  useEffect(() => {
    if (evaluationDue(state)) dispatch({ type: 'evaluate', requestId: crypto.randomUUID() });
  }, [state]);
  useEffect(() => {
    if (!state.pending) return;
    let active = true;
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), 30000);
    requestEvolutionEvaluation(state.settings.endpoint, evaluationRequest(state), { signal: abort.signal })
      .then(result => { if (active) dispatch({ type: 'result', result }); })
      .catch(error => { if (active) dispatch({ type: 'error', requestId: state.pending.requestId, error: error.name === 'AbortError' ? 'timeout' : error.message }); })
      .finally(() => clearTimeout(timer));
    return () => { active = false; clearTimeout(timer); abort.abort(); };
    // New turns must not cancel an in-flight snapshot; control changes do.
  }, [state.pending, state.settings.endpoint]);
  const recordTurn = useCallback(turn => dispatch({ type: 'turn', turn }), []);
  const context = useCallback(() => {
    const value = stateRef.current;
    return { sessionId: value.sessionId, generation: value.generation, formId: value.form };
  }, []);
  return { state, dispatch, recordTurn, context, reset: () => dispatch({ type: 'reset', sessionId: crypto.randomUUID() }) };
}
