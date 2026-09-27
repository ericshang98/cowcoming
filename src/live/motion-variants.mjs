import { ACTION_CATALOG, PUBLIC_ACTION_IDS } from '../../shared/action-catalog.mjs';

// Software accents are independent from device capability. They enrich a
// semantic behavior with a form-specific sequence while a device, when
// present, only receives an advertised action ID.
const FORM_STYLE = Object.freeze({
  calf: { primary: 'bow', secondary: 'wave', speed: .92, amplitude: .72 },
  normal: { primary: 'bow', secondary: 'wave', speed: .88, amplitude: .78 },
  playful: { primary: 'leg_sway', secondary: 'wave', speed: .84, amplitude: .88 },
  tough: { primary: 'bow', secondary: 'wave', speed: .9, amplitude: .74 },
  celestial: { primary: 'reflect', secondary: 'tilt', speed: .84, amplitude: .76 },
  dark: { primary: 'reflect', secondary: 'look', speed: .82, amplitude: .8 },
});

function hash(value) {
  let result = 2166136261;
  for (const char of String(value || '')) {
    result ^= char.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function generatedVariants(formId) {
  const style = FORM_STYLE[formId] || FORM_STYLE.normal;
  return Object.fromEntries(
    Object.entries(ACTION_CATALOG).map(([actionId, spec]) => {
      const clip = spec.softwareClips.includes(style.primary) ? style.primary
        : spec.softwareClips.includes(style.secondary) ? style.secondary
        : spec.softwareClips[0];
      return [actionId, [{
        id: formId + '-' + actionId.toLowerCase(),
        clip,
        phase: spec.composite ? 'after' : 'before',
        speed: Math.max(.65, Math.min(1.25, style.speed + (actionId.length % 3 - 1) * .04)),
        amplitude: Math.max(.55, Math.min(1.1, style.amplitude + (actionId.charCodeAt(0) % 3 - 1) * .04)),
      }]];
    }),
  );
}

export const SOFTWARE_VARIANTS = Object.freeze(
  Object.fromEntries(Object.keys(FORM_STYLE).map((formId) => [formId, generatedVariants(formId)])),
);

export function selectSoftwareVariant(formId, actionId, eventId, { actions = {}, baseClip = null } = {}) {
  // Verified semantic clips are the complete action. Do not prepend or append
  // a generic software accent (for example a wave before a curious tilt),
  // because that changes the meaning and makes the motion look like two
  // unrelated actions.
  if (ACTION_CATALOG[actionId]?.suffix) return null;
  const candidates = SOFTWARE_VARIANTS[formId]?.[actionId] || [];
  const available = candidates.filter((variant) => actions[variant.clip] && variant.clip !== baseClip);
  if (!available.length) return null;
  const variant = available[hash(formId + ':' + actionId + ':' + eventId) % available.length];
  return {
    ...variant,
    tuning: { speed: variant.speed, amplitude: variant.amplitude },
  };
}

export function softwareVariantCount(formId = null) {
  const source = formId ? { [formId]: SOFTWARE_VARIANTS[formId] } : SOFTWARE_VARIANTS;
  return Object.values(source).reduce((total, form) => total + Object.values(form || {}).reduce((count, variants) => count + variants.length, 0), 0);
}

export function softwareActionSummary() {
  return PUBLIC_ACTION_IDS.map((id) => ({
    id,
    label: ACTION_CATALOG[id].label,
    group: ACTION_CATALOG[id].group,
    region: ACTION_CATALOG[id].region,
  }));
}
