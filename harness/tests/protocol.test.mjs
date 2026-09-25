import test from 'node:test';
import assert from 'node:assert/strict';
import { createId, INTENT_TYPES, EXECUTION_STATUSES } from '../src/protocol.mjs';
import { validateIntent, validateProfile, validatePlan, validateExecutionEvent } from '../src/validation.mjs';

test('exports protocol enums and deterministic ids', () => {
  assert.ok(INTENT_TYPES.includes('express'));
  assert.ok(EXECUTION_STATUSES.includes('completed'));
  assert.equal(createId('request', 123), 'request-123');
});

test('validates legal protocol objects', () => {
  const params = { intensity: 2 };
  const intent = validateIntent({ requestId: 'r1', type: 'express', semantic: 'approval', params });
  const profile = validateProfile({ profileId: 'simulator', capabilities: [{ id: 'nod' }] });
  const plan = validatePlan({ planId: 'p1', intentId: 'r1', steps: [{ capabilityId: 'nod' }] });
  const event = validateExecutionEvent({ eventId: 'e1', planId: 'p1', status: 'completed', simulated: true, result: { ok: true } });
  assert.equal(intent.params, params);
  assert.equal(profile.capabilities[0].id, 'nod');
  assert.equal(plan.steps[0].capabilityId, 'nod');
  assert.equal(event.status, 'completed');
});

test('rejects missing required fields and unknown states', () => {
  assert.throws(() => validateIntent({ semantic: 'approval' }), /requestId/);
  assert.throws(() => validateProfile({ profileId: 'p' }), /capabilities/);
  assert.throws(() => validatePlan({ intentId: 'r1', steps: [] }), /planId/);
  assert.throws(() => validateExecutionEvent({ eventId: 'e1', planId: 'p1', status: 'done' }), /status/);
});

test('returns frozen shallow copies without mutating input', () => {
  const input = { requestId: 'r1', type: 'speak', semantic: 'greeting', params: { text: 'hi' } };
  const output = validateIntent(input);
  assert.notEqual(output, input);
  assert.equal(output.params, input.params);
  assert.equal(Object.isFrozen(output), true);
  input.semantic = 'changed';
  assert.equal(output.semantic, 'greeting');
});
