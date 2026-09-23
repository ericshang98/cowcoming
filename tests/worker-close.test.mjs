import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

// Exercise the actual handlers without starting a Cloudflare runtime.
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "cloudflare:workers")
      return {
        url: "data:text/javascript,export class DurableObject {}",
        shortCircuit: true,
      };
    return nextResolve(specifier, context);
  },
});
const { DeviceRoom } = await import("../server/worker.mjs");
hooks.deregister();

function fixture({ role = "device", throws = false } = {}) {
  let attachment = { role, clientId: "peer", closed: false };
  const calls = [];
  const ws = {
    deserializeAttachment: () => attachment,
    serializeAttachment: (value) => { attachment = value; },
    close: (code) => {
      calls.push(["close", code]);
      if (throws) throw new Error("Socket already gone");
      assert.ok(code === 1000 || (code >= 3000 && code <= 4999));
    },
  };
  const room = Object.assign(Object.create(DeviceRoom.prototype), {
    state: { appliedRevision: 4, version: 8, messages: [
      { status: "streaming", text: "partial" },
      { status: "complete", text: "saved" },
    ] },
    persist: async () => { calls.push(["persist"]); },
    broadcast: () => { calls.push(["broadcast"]); },
    device: () => ({}),
    send: (_ws, message) => { calls.push(["send", message]); },
  });
  return { room, ws, calls };
}

test("abnormal device close persists and broadcasts offline before replying", async () => {
  const { room, ws, calls } = fixture();
  await room.webSocketClose(ws, 1006);
  assert.deepEqual(calls, [["persist"], ["broadcast"], ["close", 1000]]);
  assert.equal(room.state.appliedRevision, null);
  assert.equal(room.state.version, 9);
  assert.deepEqual(room.state.messages.map(m => m.status), ["interrupted", "complete"]);
});

test("a failed close reply cannot suppress offline state or duplicate its update", async () => {
  const { room, ws, calls } = fixture({ throws: true });
  await room.webSocketClose(ws, 1006);
  await room.webSocketError(ws);
  assert.equal(room.state.version, 9);
  assert.deepEqual(calls, [["persist"], ["broadcast"], ["close", 1000]]);
});

test("abnormal browser close still informs the device which peer disconnected", async () => {
  const { room, ws, calls } = fixture({ role: "browser", throws: true });
  await room.webSocketClose(ws, 1006);
  assert.deepEqual(calls, [
    ["send", { type: "signal", kind: "close", peerId: "peer" }],
    ["close", 1000],
  ]);
  assert.equal(room.state.appliedRevision, 4);
});

test("reserved close codes are normalized while application codes are preserved", async () => {
  for (const [received, expected] of [[1000, 1000], [1005, 1000], [1015, 1000], [4001, 4001], [4003, 4003]]) {
    const { room, ws, calls } = fixture();
    await room.webSocketClose(ws, received);
    assert.deepEqual(calls.at(-1), ["close", expected]);
  }
});
