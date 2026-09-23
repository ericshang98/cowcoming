import test from 'node:test';
import assert from 'node:assert/strict';
import { ancestry, evolutionEdges, evolutionRoutes, forms, resolvePreview, selectEvolutionForm } from '../src/evolution.mjs';
import { NIULAI_ASSET } from '../src/scene/niulai.mjs';
const allRevealed = Object.keys(forms);

test('the tree follows the specified shared origin and two branches exactly', () => {
  assert.equal(Object.keys(forms).length, 6);
  assert.deepEqual(ancestry('celestial').map(id => forms[id].name), ['小牛', '普通牛来', '骚牛', '仙牛']);
  assert.deepEqual(ancestry('dark').map(id => forms[id].name), ['小牛', '普通牛来', '硬牛', '暗黑牛']);
  assert.equal(evolutionEdges.length, 5);
  for (const route of evolutionRoutes) assert.deepEqual(route.nodes, ancestry(route.nodes.at(-1)));
});

test('selecting the other branch in the atlas selects its matching sidebar route', () => {
  assert.deepEqual(selectEvolutionForm('celestial', 'dark', allRevealed), { route: 'dark', form: 'dark' });
  assert.deepEqual(selectEvolutionForm('dark', 'playful', allRevealed), { route: 'celestial', form: 'playful' });
  assert.deepEqual(selectEvolutionForm('dark', 'normal'), { route: 'dark', form: 'normal' });
  assert.equal(resolvePreview('celestial', 'dark').form.id, 'calf');
  assert.equal(resolvePreview('missing', 'missing').form.id, 'calf');
});

test('all missing models remain honest placeholders backed by the reference asset', () => {
  for (const form of Object.values(forms)) {
    const selection = selectEvolutionForm('celestial', form.id, allRevealed);
    const preview = resolvePreview(selection.route, selection.form, allRevealed);
    assert.equal(preview.form.id, form.id);
    assert.equal(preview.placeholder, true);
    assert.equal(preview.model, NIULAI_ASSET);
    assert.equal(form.model, null);
  }
});

test('a supplied model changes only its own preview node', () => {
  const previous = forms.dark.model;
  try {
    forms.dark.model = '/models/dark.glb';
    assert.equal(resolvePreview('dark', 'dark', allRevealed).model, '/models/dark.glb');
    assert.equal(resolvePreview('dark', 'dark', allRevealed).placeholder, false);
    assert.equal(resolvePreview('celestial', 'celestial', allRevealed).model, NIULAI_ASSET);
  } finally {
    forms.dark.model = previous;
  }
});


test('unrevealed forms cannot be selected or exposed by previewing or supplying a model', () => {
  for (const id of ['playful', 'tough', 'celestial', 'dark']) {
    assert.equal(selectEvolutionForm('celestial', id).form, 'calf');
    assert.equal(resolvePreview(forms[id].branch, id).form.id, 'calf');
  }
  const previous = forms.dark.model;
  try {
    forms.dark.model = '/models/dark.glb';
    assert.equal(resolvePreview('dark', 'dark').form.id, 'calf');
    assert.equal(resolvePreview('dark', 'dark').model, NIULAI_ASSET);
    assert.equal(resolvePreview('dark', 'normal').form.id, 'normal');
  } finally {
    forms.dark.model = previous;
  }
});
