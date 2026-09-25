import fs from 'node:fs';
import { validateProfile } from './validation.mjs';

const isRecord = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const clone = (v) => v === undefined ? v : JSON.parse(JSON.stringify(v));
const freezeDeep = (v) => {
  if (v && typeof v === 'object' && !Object.isFrozen(v)) {
    Object.values(v).forEach(freezeDeep);
    Object.freeze(v);
  }
  return v;
};

function normalizeParameter(spec) {
  if (isRecord(spec)) {
    const out = { ...spec };
    if (out.min !== undefined) out.min = Number(out.min);
    if (out.max !== undefined) out.max = Number(out.max);
    return out;
  }
  if (Array.isArray(spec)) return { enum: [...spec] };
  return { type: typeof spec === 'string' ? spec : 'number' };
}

export function normalizeProfile(profile) {
  validateProfile(profile);
  const normalized = {
    ...clone(profile),
    profileId: profile.profileId ?? profile.id ?? 'anonymous',
    capabilities: profile.capabilities.map((raw) => {
      if (!isRecord(raw)) throw new TypeError('capability must be an object');
      const semanticTags = raw.semanticTags ?? raw.semantics ?? raw.semantic ?? [];
      if (!Array.isArray(semanticTags) || semanticTags.some((s) => typeof s !== 'string' || !s)) {
        throw new TypeError(`capability ${raw.id} semanticTags must be an array of strings`);
      }
      const parameters = {};
      for (const [name, spec] of Object.entries(raw.parameters ?? {})) parameters[name] = normalizeParameter(spec);
      const maxDurationMs = Number(raw.maxDurationMs ?? 5000);
      if (!Number.isFinite(maxDurationMs) || maxDurationMs <= 0) throw new TypeError(`capability ${raw.id} maxDurationMs must be positive`);
      return {
        ...clone(raw), id: raw.id, semanticTags: [...semanticTags], parameters,
        interruptible: raw.interruptible !== false, maxDurationMs
      };
    })
  };
  return freezeDeep(normalized);
}

export function findCapabilities(profile, semantic) {
  const normalized = normalizeProfile(profile);
  if (typeof semantic !== 'string' || !semantic) return [];
  return normalized.capabilities.filter((capability) => capability.semanticTags.includes(semantic));
}

export function loadProfile(path) {
  const value = JSON.parse(fs.readFileSync(path, 'utf8'));
  return normalizeProfile(value);
}
