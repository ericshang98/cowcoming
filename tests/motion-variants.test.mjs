import test from 'node:test';
import assert from 'node:assert/strict';
import { ACTION_CATALOG } from '../shared/action-catalog.mjs';
import { SOFTWARE_VARIANTS, selectSoftwareVariant, softwareVariantCount } from '../src/live/motion-variants.mjs';

test('software variants cover the desktop-pet catalog across every form', () => {
  assert.ok(Object.keys(ACTION_CATALOG).length > 20);
  assert.ok(softwareVariantCount() >= Object.keys(ACTION_CATALOG).length * 6);
  for (const [formId, actions] of Object.entries(SOFTWARE_VARIANTS)) {
    for (const [actionId, variants] of Object.entries(actions)) {
      assert.ok(ACTION_CATALOG[actionId], `${formId} uses an unknown base action`);
      for (const variant of variants) {
        assert.ok(variant.id && variant.clip && ['before', 'after'].includes(variant.phase));
        assert.ok(variant.speed >= 0.5 && variant.speed <= 1.5);
        assert.ok(variant.amplitude >= 0.5 && variant.amplitude <= 1.25);
      }
    }
  }
});

test('variant selection is deterministic for an interaction and fails closed when a clip is absent', () => {
  const actions = { bow: {} };
  const first = selectSoftwareVariant('calf', 'NOD', 'event-1', { actions });
  const second = selectSoftwareVariant('calf', 'NOD', 'event-1', { actions });
  assert.deepEqual(first, second);
  assert.equal(selectSoftwareVariant('calf', 'NOD', 'event-1', { actions: {} }), null);
});
