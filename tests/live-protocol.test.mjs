import test from "node:test";
import assert from "node:assert/strict";
import {
  initialRoom,
  updateProfile,
  applyDeviceEvent,
  makeCommand,
  validateSignal,
  parseKey,
  chooseAnimation,
} from "../shared/live-protocol.mjs";

function readyRoom() {
 return applyDeviceEvent(initialRoom('demo','Desk'), {type:'device.status', eventId:'caps', actionContractVersion:2, supportedActions:['NOD','SHAKE','NOD_DOUBLE','TILT_LEFT','TILT_RIGHT','WAIT'], hardware:'ready', jev:'ready'});
}
test("keys are scoped by room and role; malformed input fails closed", () => {
  assert.deepEqual(parseKey(`cw1.browser.demo_01.${"a".repeat(64)}`), {
    role: "browser",
    roomId: "demo_01",
    secret: "a".repeat(64),
  });
  for (const key of [
    "demo",
    "cw1.admin.demo.abc",
    `cw1.device...${"a".repeat(64)}`,
  ])
    assert.throws(() => parseKey(key));
});
test("manual profile edit increments revision without inventing evolution", () => {
  const s = readyRoom();
  const next = updateProfile(s, {
    expectedRevision: 1,
    formId: "normal",
    prompt: "Respond with a gentle nod.",
  });
  assert.equal(next.profile.revision, 2);
  assert.equal(next.profile.formId, "normal");
  assert.equal(next.appliedRevision, null);
  assert.equal(next.evolutionMode, "manual");
  assert.throws(
    () => updateProfile(next, { expectedRevision: 1, prompt: "stale" }),
    /conflict/,
  );
  assert.throws(() =>
    updateProfile(s, { expectedRevision: 1, formId: "invented" }),
  );
  assert.throws(() =>
    updateProfile(s, {
      expectedRevision: 1,
      animationMap: { NOD: ["arbitrary-script"] },
    }),
  );
});
test("device acknowledgements cannot apply a stale or future prompt revision", () => {
  const s = readyRoom();
  assert.throws(() =>
    applyDeviceEvent(s, { type: "profile.applied", eventId: "a", revision: 2 }),
  );
  assert.equal(
    applyDeviceEvent(s, { type: "profile.applied", eventId: "a", revision: 1 })
      .appliedRevision,
    1,
  );
});
test("decision events are deduplicated and constrained by the applied profile", () => {
  let s = readyRoom();
  const event = {
    type: "decision",
    eventId: "d1",
    decisionId: "d1",
    actionId: "NOD",
    summary: "Greeting",
    profileRevision: 1,
  };
  assert.throws(() => applyDeviceEvent(s, event), /profile/);
  s = applyDeviceEvent(s, {
    type: "profile.applied",
    eventId: "a",
    revision: 1,
  });
  const next = applyDeviceEvent(s, event);
  assert.equal(next.events.at(-1).actionId, "NOD");
  assert.equal(applyDeviceEvent(next, event), next);
  assert.throws(() =>
    applyDeviceEvent(s, { ...event, actionId: "DELETE_FILES" }),
  );
  assert.equal(
    chooseAnimation("NOD", s.profile.animationMap, () => 0),
    "nod-soft",
  );
  assert.equal(
    chooseAnimation("NOD", s.profile.animationMap, () => 0.99),
    "nod-soft",
  );
  assert.equal(chooseAnimation("UNKNOWN", s.profile.animationMap), null);
});
test("commands require a live device and applied prompt; stop is still available", () => {
  const s = readyRoom();
  assert.throws(
    () => makeCommand(s, { command: "action", actionId: "NOD" }, false),
    /offline/,
  );
  assert.throws(
    () => makeCommand(s, { command: "action", actionId: "NOD" }, true),
    /profile/,
  );
  assert.equal(makeCommand(s, { command: "stop" }, true, 100).expiresAt, 5100);
  s.appliedRevision = 1;
  const c = makeCommand(s, { command: "action", actionId: "NOD" }, true, 100);
  assert.equal(c.actionId, "NOD");
  assert.equal(c.profileRevision, 1);
  assert.throws(() =>
    makeCommand(s, { command: "action", actionId: "EXEC" }, true),
  );
});
test("language messages append once and reject late chunks after completion", () => {
  let s = readyRoom();
  s = applyDeviceEvent(s, {
    type: "language.start",
    eventId: "s",
    messageId: "m",
    role: "assistant",
    text: "",
  });
  s = applyDeviceEvent(s, {
    type: "language.delta",
    eventId: "d",
    messageId: "m",
    text: "Hello",
  });
  s = applyDeviceEvent(s, {
    type: "language.end",
    eventId: "e",
    messageId: "m",
  });
  assert.equal(s.messages[0].text, "Hello");
  assert.equal(s.messages[0].status, "complete");
  assert.throws(() =>
    applyDeviceEvent(s, {
      type: "language.delta",
      eventId: "late",
      messageId: "m",
      text: "!",
    }),
  );
  assert.throws(() =>
    applyDeviceEvent(s, { type: "camera.frame", eventId: "v", data: "base64" }),
  );
});
test("WebRTC signaling is bounded and does not accept video frames", () => {
  assert.equal(
    validateSignal({
      type: "signal",
      kind: "offer",
      peerId: "p1",
      sdp: "v=0\r\n",
    }).kind,
    "offer",
  );
  assert.throws(() =>
    validateSignal({
      type: "signal",
      kind: "frame",
      peerId: "p1",
      data: "pixels",
    }),
  );
  assert.throws(() =>
    validateSignal({
      type: "signal",
      kind: "offer",
      peerId: "p1",
      sdp: "x".repeat(70000),
    }),
  );
});
test("each form keeps its own editable prompt and action mapping", () => {
  let s = readyRoom();
  s = updateProfile(s, { expectedRevision: 1, prompt: "Calf prompt" });
  s = updateProfile(s, {
    expectedRevision: 2,
    formId: "normal",
    prompt: "Normal prompt",
  });
  s = updateProfile(s, { expectedRevision: 3, formId: "calf" });
  assert.equal(s.profile.prompt, "Calf prompt");
  s = updateProfile(s, { expectedRevision: 4, formId: "normal" });
  assert.equal(s.profile.prompt, "Normal prompt");
});
test("a completed action cannot move backwards and interrupted text stays interrupted", () => {
  let s = readyRoom();
  s = applyDeviceEvent(s, {
    type: "profile.applied",
    eventId: "apply",
    revision: 1,
  });
  s = applyDeviceEvent(s, {
    type: "decision",
    eventId: "d",
    decisionId: "d",
    actionId: "NOD",
    profileRevision: 1,
  });
  s = applyDeviceEvent(s, {
    type: "action",
    eventId: "done",
    decisionId: "d",
    status: "completed",
  });
  assert.throws(
    () =>
      applyDeviceEvent(s, {
        type: "action",
        eventId: "late-start",
        decisionId: "d",
        status: "started",
      }),
    /terminal/,
  );
  s = applyDeviceEvent(s, {
    type: "language.start",
    eventId: "ls",
    messageId: "m",
    role: "assistant",
    text: "Partial",
  });
  s = applyDeviceEvent(s, {
    type: "language.end",
    eventId: "le",
    messageId: "m",
    status: "interrupted",
  });
  assert.equal(s.messages[0].status, "interrupted");
});
