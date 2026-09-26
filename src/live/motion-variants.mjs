// Software-only accents make one base action feel native to each form. They
// never become hardware commands: the device still receives the same five
// action IDs from shared/action-catalog.mjs.
export const SOFTWARE_VARIANTS = Object.freeze({
  calf: {
    NOD: [{ id: 'attentive-bow', clip: 'bow', phase: 'before', speed: 0.84, amplitude: 0.78 }],
    SHAKE: [{ id: 'small-wave', clip: 'wave', phase: 'after', speed: 0.9, amplitude: 0.72 }],
    TILT_LEFT: [{ id: 'curious-bow', clip: 'bow', phase: 'before', speed: 0.92, amplitude: 0.66 }],
    TILT_RIGHT: [{ id: 'curious-wave', clip: 'wave', phase: 'after', speed: 0.92, amplitude: 0.66 }],
  },
  normal: {
    NOD: [{ id: 'formal-bow', clip: 'bow', phase: 'before', speed: 0.82, amplitude: 0.8 }],
    NOD_DOUBLE: [{ id: 'showcase-wave', clip: 'wave', phase: 'after', speed: 0.88, amplitude: 0.8 }],
    TILT_LEFT: [{ id: 'formal-left-bow', clip: 'bow', phase: 'before', speed: 0.9, amplitude: 0.64 }],
    TILT_RIGHT: [{ id: 'formal-right-bow', clip: 'bow', phase: 'before', speed: 0.9, amplitude: 0.64 }],
  },
  playful: {
    NOD: [{ id: 'spotlight-bow', clip: 'bow', phase: 'before', speed: 0.9, amplitude: 0.78 }],
    SHAKE: [{ id: 'teasing-wave', clip: 'wave', phase: 'after', speed: 0.82, amplitude: 0.9 }],
    NOD_DOUBLE: [{ id: 'proud-leg-sway', clip: 'leg_sway', phase: 'after', speed: 0.86, amplitude: 0.86 }],
    TILT_LEFT: [{ id: 'left-spotlight-wave', clip: 'wave', phase: 'after', speed: 0.86, amplitude: 0.82 }],
    TILT_RIGHT: [{ id: 'right-spotlight-wave', clip: 'wave', phase: 'after', speed: 0.86, amplitude: 0.82 }],
  },
  tough: {
    NOD: [{ id: 'reluctant-bow', clip: 'bow', phase: 'before', speed: 0.88, amplitude: 0.72 }],
    SHAKE: [{ id: 'stubborn-wave', clip: 'wave', phase: 'after', speed: 0.86, amplitude: 0.76 }],
    NOD_DOUBLE: [{ id: 'tough-showcase-wave', clip: 'wave', phase: 'after', speed: 0.92, amplitude: 0.74 }],
    TILT_LEFT: [{ id: 'guarded-left-bow', clip: 'bow', phase: 'before', speed: 0.94, amplitude: 0.58 }],
    TILT_RIGHT: [{ id: 'guarded-right-bow', clip: 'bow', phase: 'before', speed: 0.94, amplitude: 0.58 }],
  },
  celestial: {
    NOD: [{ id: 'reflective-nod', clip: 'reflect', phase: 'before', speed: 0.82, amplitude: 0.78 }],
    SHAKE: [{ id: 'oracle-look', clip: 'look', phase: 'before', speed: 0.86, amplitude: 0.72 }],
    NOD_DOUBLE: [{ id: 'ceremonial-bow', clip: 'bow', phase: 'before', speed: 0.78, amplitude: 0.76 }],
    TILT_LEFT: [{ id: 'left-meditative-tilt', clip: 'tilt', phase: 'after', speed: 0.84, amplitude: 0.72 }],
    TILT_RIGHT: [{ id: 'right-meditative-tilt', clip: 'tilt', phase: 'after', speed: 0.84, amplitude: 0.72 }],
  },
  dark: {
    NOD: [{ id: 'command-reflect', clip: 'reflect', phase: 'before', speed: 0.8, amplitude: 0.82 }],
    SHAKE: [{ id: 'threatening-look', clip: 'look', phase: 'before', speed: 0.84, amplitude: 0.76 }],
    NOD_DOUBLE: [{ id: 'imperial-bow', clip: 'bow', phase: 'before', speed: 0.8, amplitude: 0.8 }],
    TILT_LEFT: [{ id: 'left-final-boss-tilt', clip: 'tilt', phase: 'after', speed: 0.84, amplitude: 0.74 }],
    TILT_RIGHT: [{ id: 'right-final-boss-tilt', clip: 'tilt', phase: 'after', speed: 0.84, amplitude: 0.74 }],
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

export function selectSoftwareVariant(formId, actionId, eventId, { actions = {} } = {}) {
  const candidates = SOFTWARE_VARIANTS[formId]?.[actionId] || [];
  const available = candidates.filter((variant) => actions[variant.clip]);
  if (!available.length) return null;
  const variant = available[hash(`${formId}:${actionId}:${eventId}`) % available.length];
  return {
    ...variant,
    tuning: { speed: variant.speed, amplitude: variant.amplitude },
  };
}

export function softwareVariantCount(formId = null) {
  const source = formId ? { [formId]: SOFTWARE_VARIANTS[formId] } : SOFTWARE_VARIANTS;
  return Object.values(source).reduce((total, form) => total + Object.values(form || {}).reduce((count, variants) => count + variants.length, 0), 0);
}
