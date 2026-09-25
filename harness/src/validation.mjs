import { EXECUTION_STATUSES, INTENT_TYPES } from './protocol.mjs';

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const requireRecord = (value, name) => {
  if (!isRecord(value)) throw new TypeError(`${name} must be an object`);
};
const requireString = (value, field) => {
  if (typeof value !== 'string' || value.length === 0) throw new TypeError(`${field} must be a non-empty string`);
};
const copyAndFreeze = (value) => Object.freeze({ ...value });

export function validateIntent(value) {
  requireRecord(value, 'intent');
  requireString(value.requestId, 'requestId');
  if (!INTENT_TYPES.includes(value.type)) throw new TypeError(`type must be one of: ${INTENT_TYPES.join(', ')}`);
  requireString(value.semantic, 'semantic');
  if (value.params !== undefined && !isRecord(value.params)) throw new TypeError('params must be an object');
  if (value.target !== undefined) requireString(value.target, 'target');
  if (value.confidence !== undefined && (typeof value.confidence !== 'number' || value.confidence < 0 || value.confidence > 1)) {
    throw new TypeError('confidence must be a number between 0 and 1');
  }
  if (value.expiresAt !== undefined && (typeof value.expiresAt !== 'number' || !Number.isFinite(value.expiresAt))) {
    throw new TypeError('expiresAt must be a finite number');
  }
  return copyAndFreeze(value);
}

export function validateProfile(value) {
  requireRecord(value, 'profile');
  if (value.profileId !== undefined) requireString(value.profileId, 'profileId');
  if (!Array.isArray(value.capabilities)) throw new TypeError('capabilities must be an array');
  value.capabilities.forEach((capability, index) => {
    requireRecord(capability, `capabilities[${index}]`);
    requireString(capability.id, `capabilities[${index}].id`);
  });
  return copyAndFreeze(value);
}

export function validatePlan(value) {
  requireRecord(value, 'plan');
  requireString(value.planId, 'planId');
  requireString(value.intentId, 'intentId');
  if (!Array.isArray(value.steps)) throw new TypeError('steps must be an array');
  value.steps.forEach((step, index) => {
    if (!isRecord(step) && typeof step !== 'string') throw new TypeError(`steps[${index}] must be an object or string`);
    if (isRecord(step)) {
      const capabilityId = step.capabilityId ?? step.id;
      if (capabilityId !== undefined) requireString(capabilityId, `steps[${index}].capabilityId`);
    }
  });
  return copyAndFreeze(value);
}

export function validateExecutionEvent(value) {
  requireRecord(value, 'execution event');
  if (value.eventId !== undefined) requireString(value.eventId, 'eventId');
  if (value.planId !== undefined) requireString(value.planId, 'planId');
  if (!EXECUTION_STATUSES.includes(value.status)) {
    throw new TypeError(`status must be one of: ${EXECUTION_STATUSES.join(', ')}`);
  }
  if (value.simulated !== undefined && typeof value.simulated !== 'boolean') throw new TypeError('simulated must be a boolean');
  if (value.sensorVerified !== undefined && typeof value.sensorVerified !== 'boolean') throw new TypeError('sensorVerified must be a boolean');
  if (value.result !== undefined && !isRecord(value.result)) throw new TypeError('result must be an object');
  if (value.error !== undefined && !isRecord(value.error) && typeof value.error !== 'string') throw new TypeError('error must be an object or string');
  return copyAndFreeze(value);
}
