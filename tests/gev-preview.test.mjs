import test from 'node:test';
import assert from 'node:assert/strict';
import { GEV_PREVIEW_MODEL, requestGevDecision, resolveGevPreviewEndpoint, validateGevDecision } from '../src/gev-preview.mjs';

test('GEV endpoint prefers the public preview setting and supports the GEP alias', () => {
  assert.equal(resolveGevPreviewEndpoint({ VITE_GEV_PREVIEW_URL: ' https://gev.example ' }), 'https://gev.example');
  assert.equal(resolveGevPreviewEndpoint({ VITE_GEP_PREVIEW_URL: '/v1/gev' }), '/v1/gev');
  assert.equal(resolveGevPreviewEndpoint({}), '');
});

test('GEV decisions are restricted to the existing action contract', () => {
  const result = validateGevDecision({ requestId: 'r1', actionId: 'NOD', summary: 'ok', latencyMs: 12 }, 'r1');
  assert.deepEqual(result, { requestId: 'r1', actionId: 'NOD', summary: 'ok', modelVersion: GEV_PREVIEW_MODEL, latencyMs: 12 });
  assert.throws(() => validateGevDecision({ requestId: 'r1', actionId: 'DROP_DATABASE' }, 'r1'), /unsupported action/);
  assert.throws(() => validateGevDecision({ requestId: 'other', actionId: 'WAIT' }, 'r1'), /did not match/);
});

test('GEV request sends only preview input and validates the response', async () => {
  let request;
  const decision = await requestGevDecision('https://gev.example/v1/preview', {
    requestId: 'r2', model: GEV_PREVIEW_MODEL, formId: 'normal', text: 'hello', allowedActions: ['NOD', 'WAIT'],
  }, {
    fetcher: async (url, options) => {
      request = { url, options };
      return { ok: true, async json() { return { requestId: 'r2', actionId: 'WAIT' }; } };
    },
  });
  assert.equal(decision.actionId, 'WAIT');
  assert.equal(request.url, 'https://gev.example/v1/preview');
  assert.equal(request.options.method, 'POST');
  assert.equal(request.options.headers.authorization, undefined);
  assert.deepEqual(JSON.parse(request.options.body).allowedActions, ['NOD', 'WAIT']);
});
