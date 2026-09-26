import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  defaultTuningDocument,
  parseTuningDocument,
  loadTuning,
  saveTuning,
  validateTuning,
} from "../src/live/motion-tuning.mjs";
import { tuneClip } from "../src/live/tuned-clip.mjs";
import { createResponsePlayer } from "../src/live/response-player.mjs";
test("tuning round trips the full desktop-pet catalog; rejects incompatible sources and unsafe values atomically", () => {
  const doc = defaultTuningDocument();
  doc.forms.calf.actions.NOD = { speed: 0.5, amplitude: 1.25 };
  assert.deepEqual(parseTuningDocument(JSON.stringify(doc)), doc);
  for (const mutate of [
    (d) => (d.forms.calf.modelSha256 = "stale"),
    (d) => (d.forms.calf.actions.NOD.speed = 0),
    (d) => (d.forms.calf.actions.NOD.amplitude = 9),
    (d) => (d.forms.calf.actions.APPROVE = {}),
    (d) => delete d.forms.dark,
    (d) => (d.scope = "hardware"),
    (d) => (d.actionContractVersion = 1),
  ]) {
    const bad = structuredClone(doc);
    mutate(bad);
    assert.throws(() => parseTuningDocument(JSON.stringify(bad)));
  }
  assert.throws(() => validateTuning({ speed: NaN, amplitude: 1 }));
  assert.throws(() => parseTuningDocument(" ".repeat(32769)));
  assert.equal(doc.forms.calf.actions.NOD.speed, 0.5);
});
test("storage failures are surfaced and corrupt data falls back without claiming it was saved", () => {
  const broken = {
    getItem() {
      throw Error("denied");
    },
    setItem() {
      throw Error("denied");
    },
  };
  assert.equal(loadTuning(broken).error, true);
  assert.equal(saveTuning(broken, defaultTuningDocument()), false);
  assert.equal(saveTuning(null, defaultTuningDocument()), false);
  assert.equal(loadTuning({ getItem: () => "{bad" }).error, true);
});
function clip() {
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.2, 0.1, 0.3));
  const turn = q
    .clone()
    .multiply(
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), 0.4),
    );
  return new THREE.AnimationClip("nod", 1, [
    new THREE.QuaternionKeyframeTrack(
      "Head.quaternion",
      [0, 0.5, 1],
      [...q, ...turn, ...q],
    ),
    new THREE.VectorKeyframeTrack("Head.position", [0, 1], [0, 1, 0, 0, 1, 0]),
  ]);
}
test("amplitude scales rotation around neutral pose, preserves direction/endpoints and never mutates source or translation", () => {
  const source = clip(),
    original = [...source.tracks[0].values];
  for (const amplitude of [0.5, 1, 1.25]) {
    const tuned = tuneClip(source, amplitude),
      values = tuned.tracks[0].values;
    const first = new THREE.Quaternion().fromArray(values).normalize();
    const mid = new THREE.Quaternion().fromArray(values, 4).normalize();
    const last = new THREE.Quaternion().fromArray(values, 8).normalize();
    assert.ok(Math.abs(first.angleTo(mid) - 0.4 * amplitude) < 1e-6);
    assert.ok(first.angleTo(last) < 1e-6);
    assert.deepEqual([...tuned.tracks[1].values], [...source.tracks[1].values]);
  }
  assert.deepEqual([...source.tracks[0].values], original);
});
test("tuned playback captures parameters, waits for real completion and releases cloned actions on completion and interruption", async () => {
  const root = new THREE.Group(),
    head = new THREE.Bone();
  head.name = "Head";
  root.add(head);
  const mixer = new THREE.AnimationMixer(root),
    source = clip();
  const actions = { nod: mixer.clipAction(source) };
  let settings = { speed: 0.5, amplitude: 0.5 };
  const player = createResponsePlayer({
    mixer,
    actions,
    bones: new Set(["Head"]),
    manifest: {
      formId: "calf",
      variants: [
        { logicalId: "nod_confirm", clip: "nod", requiredBones: ["Head"] },
      ],
    },
    getTuning: () => settings,
  });
  function advance(seconds) {
    for (let i = 0; i < seconds * 100; i++) {
      player.update(0.01);
      mixer.update(0.01);
    }
  }
  const baseline = mixer.stats.actions.total;
  const result = player.play({ formId: "calf", actionId: "NOD", eventId: "a" });
  assert.equal(mixer.stats.actions.total, baseline + 1);
  settings = { speed: 1.5, amplitude: 1.25 }; // applies only next time
  advance(1.5);
  assert.equal(player.busy, true);
  advance(1);
  assert.equal((await result).tuning.speed, 0.5);
  assert.equal(mixer.stats.actions.total, baseline);
  const next = player.play({ formId: "calf", actionId: "NOD", eventId: "b" });
  advance(0.2);
  player.stop();
  assert.equal((await next).status, "interrupted");
  assert.equal(mixer.stats.actions.total, baseline);
  settings = { speed: 0, amplitude: 1 };
  assert.equal(
    (await player.play({ formId: "calf", actionId: "NOD", eventId: "c" }))
      .reason,
    "invalid-tuning",
  );
  player.dispose();
});

test("legacy five-form settings gain playful defaults without losing any existing adjustments", () => {
  const old = defaultTuningDocument();
  delete old.forms.playful;
  old.forms.calf.actions.NOD = { speed: 0.65, amplitude: 0.85 };
  old.forms.dark.actions.TILT_RIGHT = { speed: 1.4, amplitude: 1.15 };
  const next = parseTuningDocument(JSON.stringify(old));
  assert.equal(Object.keys(next.forms).length, 6);
  for (const id of Object.keys(old.forms))
    assert.deepEqual(next.forms[id], old.forms[id]);
  assert.deepEqual(next.forms.playful, defaultTuningDocument().forms.playful);
  assert.equal(loadTuning({ getItem: () => JSON.stringify(old) }).error, false);
});

test('queued responses capture their own tuning and release cloned clips after draining', async () => {
  const root = new THREE.Group(), head = new THREE.Bone();
  head.name = 'Head'; root.add(head);
  const mixer = new THREE.AnimationMixer(root);
  const actions = { nod: mixer.clipAction(clip()) };
  let settings = { speed: .5, amplitude: .5 };
  const player = createResponsePlayer({ mixer, actions, bones: new Set(['Head']),
    manifest: { formId: 'calf', variants: [{logicalId:'nod_confirm',clip:'nod',requiredBones:['Head']}] },
    getTuning: () => settings });
  const baseline = mixer.stats.actions.total;
  const first = player.play({formId:'calf',actionId:'NOD',eventId:'queued-a'});
  settings = { speed: 1.5, amplitude: 1.25 };
  const second = player.play({formId:'calf',actionId:'NOD',eventId:'queued-b'});
  settings = { speed: .8, amplitude: .9 };
  for (let i=0; i<600; i++) { mixer.update(.01); player.update(.01); }
  assert.deepEqual((await first).tuning, {speed:.5,amplitude:.5});
  assert.deepEqual((await second).tuning, {speed:1.5,amplitude:1.25});
  assert.equal(mixer.stats.actions.total, baseline);
  player.dispose();
});
