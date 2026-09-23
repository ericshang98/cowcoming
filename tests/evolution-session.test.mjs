import test from 'node:test';
import assert from 'node:assert/strict';
import { createEvolutionSession, evolutionReducer as reduce, evaluationDue, evaluationRequest, evolutionStatus, successors, validateSettings, requestEvolutionEvaluation } from '../src/evolution-session.mjs';
const config = { mode: 'auto', interval: 5, endpoint: '/api/evolution/evaluate', model: 'test-evaluator' };
const fresh = () => createEvolutionSession('session-a', config);
const turn = (s, id, extra = {}) => ({ id: String(id), sessionId: s.sessionId, generation: s.generation, formId: s.form, source: 'live', status: 'completed', userText: '你好', replyText: '哞？', ...extra });
const add = (s, id, extra) => reduce(s, { type: 'turn', turn: turn(s, id, extra) });
const rounds = (s, count = 5, offset = 0) => { for(let i = 0; i < count; i++) s = add(s, i + offset); return s; };
const result = (s, decision, targetForm) => ({ requestId: s.pending.requestId, sessionId: s.sessionId, generation: s.generation, decision, targetForm, reason: '足够互动，开始形成表达。' });

test('exactly N complete unique live turns trigger evaluation; action-only calf replies count', () => {
  let s = fresh();
  for (const invalid of [{ source: 'demo' }, { status: 'streaming' }, { userText: '' }, { replyText: '' }, { generation: 99 }, { sessionId: 'other' }, { formId: 'dark' }]) assert.equal(add(s, 'bad', invalid), s);
  s = rounds(s, 4); assert.equal(evaluationDue(s), false);
  assert.equal(add(s, 1), s);
  s = add(s, 4, { replyText: '', actionCompleted: true }); assert.equal(evaluationDue(s), true);
  s = reduce(s, { type: 'evaluate', requestId: 'eval-1' });
  assert.equal(evaluationDue(s), false); assert.equal(evaluationRequest(s).turns.length, 5);
});
test('stay consumes one interval; subsequent evaluation receives all conversation, not just the last five', () => {
  let s = reduce(rounds(fresh()), { type: 'evaluate', requestId: 'first' });
  s = reduce(s, { type: 'result', result: result(s, 'stay', 'calf') });
  assert.equal(s.checkpoint, 5); assert.equal(evaluationDue(s), false);
  s = reduce(rounds(s, 5, 5), { type: 'evaluate', requestId: 'second' });
  assert.equal(evaluationRequest(s).turns.length, 10);
  s = reduce(s, { type: 'result', result: result(s, 'evolve', 'normal') });
  assert.equal(s.form, 'normal'); assert.equal(s.turns.length, 10);
});
test('invalid skip, sibling, regression and malformed stay cannot evolve', () => {
  for (const targetForm of ['dark', 'playful', 'tough', 'missing']) {
    let s = reduce(rounds(fresh()), { type: 'evaluate', requestId: 'eval' });
    s = reduce(s, { type: 'result', result: result(s, 'evolve', targetForm) });
    assert.equal(s.form, 'calf'); assert.equal(s.status, 'error'); assert.equal(s.checkpoint, 0);
  }
  assert.deepEqual(successors('normal'), ['playful', 'tough']);
  assert.deepEqual(successors('playful'), ['celestial']); assert.deepEqual(successors('tough'), ['dark']);
});
test('manual selection, config changes and reset invalidate late decisions and old turn completions', () => {
  const pending = reduce(rounds(fresh()), { type: 'evaluate', requestId: 'eval' });
  const late = { type: 'result', result: result(pending, 'evolve', 'normal') };
  for (const event of [{ type: 'select', form: 'dark' }, { type: 'settings', settings: { ...config, interval: 10 } }, { type: 'reset', sessionId: 'new-session' }]) {
    const s = reduce(pending, event);
    assert.equal(reduce(s, late), s);
    assert.equal(reduce(s, { type: 'turn', turn: turn(pending, 'late') }), s);
  }
  let s = reduce(pending, { type: 'select', form: 'dark' }); assert.equal(evolutionStatus(s), 'manual');
  s = reduce(s, { type: 'reset', sessionId: 'new' });
  assert.equal(s.form, 'calf'); assert.equal(s.turns.length, 0); assert.equal(s.settings.model, config.model); assert.equal(s.settings.mode, 'manual');
});
test('re-enabling automatic mode and changing interval begin a fresh cadence without losing history', () => {
  let s = reduce(rounds(fresh(), 4), { type: 'select', form: 'normal' });
  s = reduce(s, { type: 'settings', settings: { ...config, interval: 10 } });
  s = rounds(s, 9, 4); assert.equal(evaluationDue(s), false);
  s = add(s, 13); assert.equal(evaluationDue(s), true); assert.equal(s.turns.length, 14);
});
test('final forms stop evaluating and reset returns to calf; errors retry without consuming the interval', () => {
  let s = reduce(fresh(), { type: 'select', form: 'celestial' });
  s = reduce(s, { type: 'settings', settings: config });
  s = rounds(s, 10); assert.equal(evolutionStatus(s), 'terminal'); assert.equal(evaluationDue(s), false);
  s = reduce(s, { type: 'reset', sessionId: 'reset' }); assert.equal(s.form, 'calf');
  s = reduce(rounds(s), { type: 'evaluate', requestId: 'failure' });
  s = reduce(s, { type: 'error', requestId: 'failure', error: 'timeout' });
  assert.equal(evaluationDue(s), false); assert.equal(s.turns.length, 5);
  s = reduce(s, { type: 'retry' }); assert.equal(evaluationDue(s), true);
});
test('in-flight snapshot stays fixed while new turns arrive; new stage starts a fresh interval', () => {
  let s = reduce(rounds(fresh()), { type: 'evaluate', requestId: 'snapshot' });
  s = rounds(s, 3, 5); assert.equal(evaluationRequest(s).turns.length, 5);
  s = reduce(s, { type: 'result', result: result(s, 'evolve', 'normal') });
  assert.equal(s.checkpoint, 8); assert.equal(s.turns.length, 8);
});
test('gateway requires correlation, preserves full input and propagates HTTP errors', async () => {
  const s = reduce(rounds(fresh()), { type: 'evaluate', requestId: 'api' }), payload = evaluationRequest(s);
  const expected = result(s, 'stay', 'calf');
  const response = await requestEvolutionEvaluation(config.endpoint, payload, { fetcher: async (url, options) => {
    assert.equal(url, config.endpoint); assert.deepEqual(JSON.parse(options.body), payload);
    return { ok: true, json: async () => expected };
  } }); assert.deepEqual(response, expected);
  await assert.rejects(requestEvolutionEvaluation(config.endpoint, payload, { fetcher: async () => ({ ok: false, status: 503 }) }), /http_503/);
  await assert.rejects(requestEvolutionEvaluation(config.endpoint, payload, { fetcher: async () => ({ ok: true, json: async () => ({ ...expected, requestId: 'wrong' }) }) }), /invalid_response/);
});
test('configuration rejects unsafe URLs and fractional intervals; no gateway means no automatic requests', () => {
  for (const endpoint of ['http://example.com', '//example.com', 'https://user:password@example.com', '/api?key=secret']) assert.throws(() => validateSettings({ ...config, endpoint }));
  for (const interval of [0, 1.5, 101, NaN]) assert.throws(() => validateSettings({ ...config, interval }));
  assert.equal(evaluationDue(rounds(createEvolutionSession('offline'))), false);
});
