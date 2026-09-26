import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createResponsePlayer } from "../src/live/response-player.mjs";
import {
  ACTION_CATALOG,
  availableDeviceActions,
} from "../shared/action-catalog.mjs";
import { initialRoom, updateProfile } from "../shared/live-protocol.mjs";
function fixture({ accent = false } = {}) {
  const root = new THREE.Group(),
    bone = new THREE.Bone();
  bone.name = "Head";
  root.add(bone);
  const mixer = new THREE.AnimationMixer(root),
    actions = {};
  for (const name of [
    "idle", "bow",
    ...Object.values(ACTION_CATALOG).map((a) => a.suffix),
  ])
    actions[name] = mixer.clipAction(
      new THREE.AnimationClip(name, 0.4, [
        new THREE.NumberKeyframeTrack(
          "Head.rotation[x]",
          [0, 0.2, 0.4],
          [0, 0.2, 0],
        ),
      ]),
    );
  const manifest = {
    formId: "calf",
    variants: Object.values(ACTION_CATALOG).map((a) => ({
      logicalId: a.suffix,
      clip: a.suffix,
      requiredBones: ["Head"],
    })),
  };
  const player = createResponsePlayer({
    mixer,
    actions,
    manifest,
    bones: new Set(["Head"]),
    getSoftwareVariant: accent
      ? () => ({ id: "test-accent", clip: "bow", phase: "before", tuning: { speed: 1, amplitude: 1 } })
      : undefined,
  });
  return {
    player,
    mixer,
    actions,
    advance(seconds = 1) {
      for (let i = 0; i < Math.ceil(100 * seconds); i++) {
        player.update(0.01);
        mixer.update(0.01);
      }
    },
  };
}
test("all five actions play their distinct clip, complete after recovery and deduplicate", async () => {
  const f = fixture();
  for (const [id, a] of Object.entries(ACTION_CATALOG)) {
    const request = { eventId: id, formId: "calf", actionId: id };
    const result = f.player.play(request);
    assert.equal(f.player.clip, a.suffix);
    assert.equal(f.player.busy, true);
    assert.equal((await f.player.play(request)).status, "duplicate");
    f.advance();
    assert.equal((await result).status, "completed");
    assert.equal(f.player.busy, false);
  }
  f.player.dispose();
});
test("software accents enrich a base action without changing its action identity", async () => {
  const f = fixture({ accent: true });
  const result = f.player.play({ eventId: "accent", formId: "calf", actionId: "NOD" });
  assert.equal(f.player.busy, true);
  assert.equal(f.player.clip, "bow");
  f.advance(0.4);
  assert.equal(f.player.busy, true);
  assert.equal(f.player.clip, "nod_confirm");
  f.advance();
  assert.equal((await result).softwareVariant, "test-accent");
  assert.equal(f.player.busy, false);
  f.player.dispose();
});
test("unavailable models never claim completion; stop interrupts actual playback", async () => {
  const f = fixture();
  assert.equal(
    (await f.player.play({ eventId: "a", formId: "dark", actionId: "NOD" }))
      .status,
    "unavailable",
  );
  const p = f.player.play({ eventId: "b", formId: "calf", actionId: "NOD" });
  const queued = f.player.play({ eventId: "c", formId: "calf", actionId: "SHAKE" });
  f.player.stop();
  assert.equal((await p).status, "interrupted");
  assert.equal((await queued).status, "interrupted");
  f.advance();
  assert.equal(f.player.busy, false);
  f.player.dispose();
});
test("protocol migration is explicit and action semantics cannot be swapped", () => {
  const state = initialRoom("test", "test");
  delete state.profile.actionContractVersion;
  assert.throws(
    () => updateProfile(state, { expectedRevision: 1, prompt: "new" }),
    /upgrade/,
  );
  const next = updateProfile(state, {
    expectedRevision: 1,
    migrateActions: true,
  });
  assert.equal(next.profile.actionContractVersion, 2);
  for (const [id, a] of Object.entries(ACTION_CATALOG))
    for (const other of Object.values(ACTION_CATALOG))
      if (a !== other)
        assert.throws(
          () =>
            updateProfile(next, {
              expectedRevision: 2,
              animationMap: { [id]: [other.animation] },
            }),
          /mapping/,
        );
  next.device = {
    hardware: "ready",
    actionContractVersion: 2,
    supportedActions: ["NOD"],
  };
  assert.deepEqual(availableDeviceActions(next), ["NOD", "WAIT"]);
  next.device.hardware = "offline";
  assert.deepEqual(availableDeviceActions(next), ["WAIT"]);
  next.device.actionContractVersion = 1;
  assert.deepEqual(availableDeviceActions(next), []);
});

import { completedEvolutionTurn } from "../src/live/evolution-turn.mjs";
test("evolution waits for both endpoints and excludes incomplete software results", () => {
  const context = { profileRevision: 1 };
  const snapshot = {
    profile: { revision: 1, actionContractVersion: 2 },
    device: { simulation: false },
    events: [
      { type: "decision", decisionId: "d", commandId: "c" },
      { type: "action", decisionId: "d", status: "completed" },
      { type: "command.result", commandId: "c", status: "completed" },
    ],
    messages: [
      { role: "assistant", commandId: "c", status: "complete", text: "" },
    ],
  };
  assert.deepEqual(completedEvolutionTurn(snapshot, "c", context), {
    terminal: false,
  });
  assert.ok(
    completedEvolutionTurn(snapshot, "c", context, { status: "completed" })
      .turn,
  );
  for (const status of ["unavailable", "interrupted", "duplicate"])
    assert.deepEqual(
      completedEvolutionTurn(snapshot, "c", context, { status }),
      { terminal: true },
    );
  assert.equal(
    completedEvolutionTurn(
      { ...snapshot, device: { simulation: true } },
      "c",
      context,
      { status: "completed" },
    ).turn,
    undefined,
  );
});

test("burst decisions finish in order without losing the second action", async () => {
  const f = fixture(), completed = [];
  const first = f.player.play({eventId:"one", formId:"calf", actionId:"NOD"}).then(r=>{completed.push("one");return r;});
  const second = f.player.play({eventId:"two", formId:"calf", actionId:"SHAKE"}).then(r=>{completed.push("two");return r;});
  assert.equal((await f.player.play({eventId:"two",formId:"calf",actionId:"SHAKE"})).status,"duplicate");
  f.advance(); await first;
  assert.deepEqual(completed,["one"]);
  f.advance(); assert.equal((await second).status,"completed");
  assert.deepEqual(completed,["one","two"]);
  f.player.dispose();
});
test("unavailable requests are retryable and do not consume event IDs",async()=>{
  const f=fixture();
  assert.equal((await f.player.play({eventId:"retry",formId:"calf",actionId:"invalid"})).status,"unavailable");
  const result=f.player.play({eventId:"retry",formId:"calf",actionId:"NOD"});
  f.advance(); assert.equal((await result).status,"completed");
});
test('WAIT stays behind an already playing action',async()=>{
 const f=fixture();let done=false;
 const motion=f.player.play({eventId:'movement',formId:'calf',actionId:'NOD'});
 const waiting=f.player.play({eventId:'waiting',formId:'calf',actionId:'WAIT'}).then(r=>{done=true;return r;});
 await Promise.resolve();assert.equal(done,false);
 f.advance();assert.equal((await motion).status,'completed');
 assert.equal((await waiting).status,'completed');f.player.dispose();
});
