import { createId } from './protocol.mjs';
import { normalizeProfile, findCapabilities } from './capabilities.mjs';
import { validateIntent } from './validation.mjs';

const freezeDeep = (v) => { if (v && typeof v === 'object' && !Object.isFrozen(v)) { Object.values(v).forEach(freezeDeep); Object.freeze(v); } return v; };
const nowValue = (now) => typeof now === 'function' ? now() : (now ?? Date.now());

function normalizeArgs(params = {}, specs = {}) {
  if (params === null || typeof params !== 'object' || Array.isArray(params)) throw new TypeError('params must be an object');
  const args = {};
  for (const [name, value] of Object.entries(params)) {
    const spec = specs[name];
    if (!spec) continue;
    if (spec.enum && !spec.enum.includes(value)) throw new Error(`parameter ${name} is invalid`);
    if (spec.type === 'number' || spec.min !== undefined || spec.max !== undefined) {
      const number = Number(value);
      if (!Number.isFinite(number)) throw new Error(`parameter ${name} must be a number`);
      args[name] = Math.max(spec.min ?? -Infinity, Math.min(spec.max ?? Infinity, number));
    } else if (spec.type === 'integer') args[name] = Math.round(Number(value));
    else args[name] = value;
  }
  for (const [name, spec] of Object.entries(specs)) if (args[name] === undefined && spec.default !== undefined) args[name] = spec.default;
  return args;
}

export function planIntent(intent, profile, { now = Date.now } = {}) {
  let valid;
  try { valid = validateIntent(intent); } catch (error) { return { status: 'invalid', reason: error.message }; }
  const current = nowValue(now);
  if (valid.expiresAt !== undefined && valid.expiresAt <= current) return { status: 'stale', reason: 'intent expired' };
  let normalized;
  try { normalized = normalizeProfile(profile); } catch (error) { return { status: 'invalid', reason: error.message }; }
  const matches = findCapabilities(normalized, valid.semantic);
  if (!matches.length) return { status: 'unsupported', reason: `unsupported semantic: ${valid.semantic}`, availableSemantics: [...new Set(normalized.capabilities.flatMap((c) => c.semanticTags))] };
  const capability = matches[0];
  let args;
  try { args = normalizeArgs(valid.params, capability.parameters); } catch (error) { return { status: 'invalid', reason: error.message }; }
  const durationMs = Number(valid.params?.durationMs ?? capability.maxDurationMs);
  if (!Number.isFinite(durationMs) || durationMs <= 0) return { status: 'invalid', reason: 'durationMs must be positive' };
  const plan = {
    planId: createId('plan', valid.requestId), intentId: valid.requestId, profileId: normalized.profileId,
    createdAt: current, expiresAt: valid.expiresAt, maxDurationMs: capability.maxDurationMs, durationMs: Math.min(durationMs, capability.maxDurationMs),
    steps: [{ capabilityId: capability.id, args }]
  };
  return { status: 'ready', plan: freezeDeep(plan) };
}
