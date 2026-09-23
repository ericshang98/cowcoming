import test from 'node:test';
import assert from 'node:assert/strict';
import { createEvolutionSession, evolutionReducer as reduce } from '../src/evolution-session.mjs';

test('connection loss invalidates in-flight evaluation and old conversation context', () => {
  const s = { ...createEvolutionSession('room-session'), generation: 3, pending: { requestId: 'r', sessionId: 'room-session', generation: 3 }, status: 'evaluating', turns: [{ id: 'history' }] };
  const stopped = reduce(s, { type: 'suspend' });
  assert.equal(stopped.pending, null);
  assert.equal(stopped.generation, 4);
  assert.equal(stopped.status, 'error');
  assert.equal(stopped.turns.length, 1);
  assert.equal(reduce(stopped, { type: 'result', result: { requestId: 'r', sessionId: 'room-session', generation: 3, decision: 'evolve', targetForm: 'normal', reason: '' } }), stopped);
});
test('binding another room starts separate cultivation at its current device form', () => {
  const s = { ...createEvolutionSession('old'), turns: [{id:'other-room'}], form: 'dark' };
  const bound = reduce(s, { type: 'bind', roomId: 'new-room', sessionId: 'new', form: 'normal' });
  assert.equal(bound.roomId, 'new-room');
  assert.equal(bound.form, 'normal');
  assert.equal(bound.turns.length, 0);
  assert.deepEqual(bound.settings, s.settings);
  assert.equal(reduce(bound, {type: 'reset', sessionId:'reset'}).roomId, 'new-room');
});
