const freezeDeep = (v) => { if (v && typeof v === 'object' && !Object.isFrozen(v)) { Object.values(v).forEach(freezeDeep); Object.freeze(v); } return v; };
export function createSafetyArbiter({ clock = Date.now } = {}) {
  let stopped = false; let stopReason;
  const now = () => typeof clock === 'function' ? clock() : (clock?.now?.() ?? Date.now());
  return {
    accept(plan, deviceState = {}) {
      if (!plan || typeof plan !== 'object') return { status: 'rejected', reason: 'invalid plan' };
      if (stopped) return { status: 'rejected', reason: stopReason ?? 'stopped' };
      if (deviceState.online === false || deviceState.status === 'offline') return { status: 'rejected', reason: 'offline' };
      const current = now();
      if (plan.expiresAt !== undefined && current >= plan.expiresAt) return { status: 'rejected', reason: 'stale' };
      const maxDuration = Math.min(...(plan.steps ?? []).map((s) => Number(s.maxDurationMs ?? plan.maxDurationMs ?? Infinity)));
      if (Number.isFinite(maxDuration) && Number(plan.durationMs ?? 0) > maxDuration) return { status: 'rejected', reason: 'exceeds maximum duration' };
      if (plan.createdAt !== undefined && Number(plan.durationMs) > 0 && current - plan.createdAt > Number(plan.durationMs)) return { status: 'rejected', reason: 'exceeds maximum duration' };
      return freezeDeep({ status: 'accepted', context: { acceptedAt: current, planId: plan.planId } });
    },
    stop(reason = 'stopped') { stopped = true; stopReason = reason; return { status: 'stopped', reason }; },
    reset() { stopped = false; stopReason = undefined; return { status: 'ready' }; }
  };
}
