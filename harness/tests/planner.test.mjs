import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProfile } from '../src/capabilities.mjs';
import { planIntent } from '../src/planner.mjs';
import { createSafetyArbiter } from '../src/safety.mjs';

const profile = loadProfile(new URL('../profiles/benben-five-servo.json', import.meta.url));
const intent = (semantic, params = {}, extra = {}) => ({ requestId: `r-${semantic}`, type: 'express', semantic, params, ...extra });

test('plans approval through a profile capability and clamps parameters', () => {
  const result = planIntent(intent('approval', { intensity: 4 }), profile, { now: 100 });
  assert.equal(result.status, 'ready');
  assert.equal(result.plan.steps[0].capabilityId, 'nod');
  assert.equal(result.plan.steps[0].args.intensity, 1);
  assert.equal(result.plan.steps[0].hardwareCommand, undefined);
});

test('rejects unsupported and invalid or stale intents', () => {
  assert.equal(planIntent(intent('dance'), profile).status, 'unsupported');
  assert.equal(planIntent(intent('approval', { intensity: 'bad' }), profile).status, 'invalid');
  assert.equal(planIntent(intent('approval', {}, { expiresAt: 10 }), profile, { now: 10 }).status, 'stale');
});

test('safety arbiter rejects offline, stopped, stale and excessive plans', () => {
  let now = 100;
  const arbiter = createSafetyArbiter({ clock: () => now });
  const plan = planIntent(intent('approval'), profile, { now }).plan;
  assert.equal(arbiter.accept(plan, { online: false }).status, 'rejected');
  assert.equal(arbiter.accept(plan, { online: true }).status, 'accepted');
  arbiter.stop('user requested');
  assert.equal(arbiter.accept(plan, { online: true }).status, 'rejected');
  arbiter.reset(); now = 3000;
  assert.equal(arbiter.accept({ ...plan, expiresAt: 200 }, { online: true }).reason, 'stale');
  assert.equal(arbiter.accept({ ...plan, durationMs: 4000, maxDurationMs: 1000 }, { online: true }).reason, 'exceeds maximum duration');
});
