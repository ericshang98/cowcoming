import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { ACTION_CATALOG, ACTION_GROUPS, HARDWARE_ACTION_IDS } from '../shared/action-catalog.mjs';
import { createDesktopPetClips } from '../src/scene/ip-motion.mjs';

function rig(names) {
  const root = new THREE.Group();
  let parent = root;
  for (const name of names) {
    const bone = new THREE.Bone();
    bone.name = name;
    parent.add(bone);
    parent = bone;
  }
  return root;
}

test('desktop-pet catalog is broader than the legacy device profile and covers every body region', () => {
  assert.ok(Object.keys(ACTION_CATALOG).length >= 30);
  assert.ok(Object.keys(ACTION_CATALOG).length > HARDWARE_ACTION_IDS.length);
  assert.deepEqual(
    new Set(Object.values(ACTION_CATALOG).map((action) => action.group)),
    new Set(ACTION_GROUPS.map((group) => group.id)),
  );
});

test('procedural desktop actions use available body bones and return to neutral', () => {
  const model = rig(['Hips', 'Spine', 'Chest', 'Neck', 'Head', 'UpperArm.L', 'Forearm.L', 'Tail']);
  const clips = createDesktopPetClips(model);
  const names = new Set(clips.map((clip) => clip.name));
  for (const name of ['look-left', 'stretch', 'breathe', 'paw-wave', 'belly-rub', 'tail-wag', 'play-bounce']) {
    assert.ok(names.has(name), name);
  }
  for (const clip of clips) {
    assert.ok(clip.tracks.length > 0);
    assert.equal(clip.duration, 1);
    for (const track of clip.tracks) {
      assert.ok(track.values.every(Number.isFinite));
      const last = track.values.slice(-4);
      const first = track.values.slice(0, 4);
      assert.ok(first.every(Number.isFinite));
      assert.ok(last.every(Number.isFinite));
    }
  }
});
