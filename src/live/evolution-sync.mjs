const localKey = state => `${state.sessionId}:${state.generation}:${state.form}`;
// The relay remains authoritative for acknowledged device profiles. Local choices
// queue at most one profile update; a newer choice waits for its revision receipt.
export function planEvolutionSync(memory, state, snapshot, connected, error = '') {
  if (!connected || !snapshot) return { memory: null };
  const key = localKey(state), { roomId, profile } = snapshot;
  const adopt = () => ({ memory: { roomId, revision: profile.revision, local: `${state.sessionId}:${state.generation + 1}:${profile.formId}`, sessionId: state.sessionId, pending: null }, adoptForm: profile.formId });
  if (!memory || memory.roomId !== roomId) {
    if (profile.formId !== state.form) return adopt();
    return { memory: { roomId, revision: profile.revision, local: key, sessionId: state.sessionId, pending: null } };
  }
  let next = { ...memory };
  if (profile.revision !== memory.revision) {
    next.revision = profile.revision;
    if (memory.pending) {
      if (profile.formId !== memory.pending.form) return adopt();
      next.pending = null;
    } else if (profile.formId !== state.form) return adopt();
  }
  if (error && next.pending) return { memory: { ...next, pending: null, local: key } };
  if (next.pending || next.local === key) return { memory: next };
  const reset = next.sessionId !== state.sessionId;
  next.local = key;
  next.sessionId = state.sessionId;
  if (profile.formId === state.form && !reset) return { memory: next };
  next.pending = { form: state.form, revision: profile.revision };
  return { memory: next, patch: { formId: state.form, expectedRevision: profile.revision, source: reset ? "reset" : state.settings.mode === "auto" ? "automatic" : "manual" } };
}
