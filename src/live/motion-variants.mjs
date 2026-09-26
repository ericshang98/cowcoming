import { ACTION_CATALOG, ACTION_IDS } from '../../shared/action-catalog.mjs';

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

const OLD_VARIANTS = Object.freeze({
  calf: {
    NOD: [{ id: 'attentive-bow', clip: 'bow', phase: 'before', speed: .84, amplitude: .78 }],
    SHAKE: [{ id: 'small-wave', clip: 'wave', phase: 'after', speed: .9, amplitude: .72 }],
    TILT_LEFT: [{ id: 'curious-bow', clip: 'bow', phase: 'before', speed: .92, amplitude: .66 }],
    TILT_RIGHT: [{ id: 'curious-wave', clip: 'wave', phase: 'after', speed: .92, amplitude: .66 }],
  },
  normal: {
    NOD: [{ id: 'formal-bow', clip: 'bow', phase: 'before', speed: .82, amplitude: .8 }],
    NOD_DOUBLE: [{ id: 'showcase-wave', clip: 'wave', phase: 'after', speed: .88, amplitude: .8 }],
    TILT_LEFT: [{ id: 'formal-left-bow', clip: 'bow', phase: 'before', speed: .9, amplitude: .64 }],
    TILT_RIGHT: [{ id: 'formal-right-bow', clip: 'bow', phase: 'before', speed: .9, amplitude: .64 }],
  },
  playful: {
    NOD: [{ id: 'spotlight-bow', clip: 'bow', phase: 'before', speed: .9, amplitude: .78 }],
    SHAKE: [{ id: 'teasing-wave', clip: 'wave', phase: 'after', speed: .82, amplitude: .9 }],
    NOD_DOUBLE: [{ id: 'proud-leg-sway', clip: 'leg_sway', phase: 'after', speed: .86, amplitude: .86 }],
    TILT_LEFT: [{ id: 'left-spotlight-wave', clip: 'wave', phase: 'after', speed: .86, amplitude: .82 }],
    TILT_RIGHT: [{ id: 'right-spotlight-wave', clip: 'wave', phase: 'after', speed: .86, amplitude: .82 }],
  },
  tough: {
    NOD: [{ id: 'reluctant-bow', clip: 'bow', phase: 'before', speed: .88, amplitude: .72 }],
    SHAKE: [{ id: 'stubborn-wave', clip: 'wave', phase: 'after', speed: .86, amplitude: .76 }],
    NOD_DOUBLE: [{ id: 'tough-showcase-wave', clip: 'wave', phase: 'after', speed: .92, amplitude: .74 }],
    TILT_LEFT: [{ id: 'guarded-left-bow', clip: 'bow', phase: 'before', speed: .94, amplitude: .58 }],
    TILT_RIGHT: [{ id: 'guarded-right-bow', clip: 'bow', phase: 'before', speed: .94, amplitude: .58 }],
  },
  celestial: {
    NOD: [{ id: 'reflective-nod', clip: 'reflect', phase: 'before', speed: .82, amplitude: .78 }],
    SHAKE: [{ id: 'oracle-look', clip: 'look', phase: 'before', speed: .86, amplitude: .72 }],
    NOD_DOUBLE: [{ id: 'ceremonial-bow', clip: 'bow', phase: 'before', speed: .78, amplitude: .76 }],
    TILT_LEFT: [{ id: 'left-meditative-tilt', clip: 'tilt', phase: 'after', speed: .84, amplitude: .72 }],
    TILT_RIGHT: [{ id: 'right-meditative-tilt', clip: 'tilt', phase: 'after', speed: .84, amplitude: .72 }],
  },
  dark: {
    NOD: [{ id: 'command-reflect', clip: 'reflect', phase: 'before', speed: .8, amplitude: .82 }],
    SHAKE: [{ id: 'threatening-look', clip: 'look', phase: 'before', speed: .84, amplitude: .76 }],
    NOD_DOUBLE: [{ id: 'imperial-bow', clip: 'bow', phase: 'before', speed: .8, amplitude: .8 }],
    TILT_LEFT: [{ id: 'left-final-boss-tilt', clip: 'tilt', phase: 'after', speed: .84, amplitude: .74 }],
    TILT_RIGHT: [{ id: 'right-final-boss-tilt', clip: 'tilt', phase: 'after', speed: .84, amplitude: .74 }],
  },
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
      if (OLD_VARIANTS[formId]?.[actionId]) return [actionId, OLD_VARIANTS[formId][actionId]];
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

export function selectSoftwareVariant(formId, actionId, eventId, { actions = {} } = {}) {
  const candidates = SOFTWARE_VARIANTS[formId]?.[actionId] || [];
  const available = candidates.filter((variant) => actions[variant.clip]);
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
  return ACTION_IDS.filter((id) => id !== 'WAIT').map((id) => ({
    id,
    label: ACTION_CATALOG[id].label,
    group: ACTION_CATALOG[id].group,
    region: ACTION_CATALOG[id].region,
  }));
}
