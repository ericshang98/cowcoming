import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  defaultActions,
  initialSession,
  parseActionPack,
  sessionReducer,
  defaultTree,
  parseTree,
  validateLocalGlb,
} from "../src/hardware/core.mjs";
test("only matching completed actions grow the demo, duplicate and late completions do not", () => {
  let s = sessionReducer(initialSession, {
    type: "start",
    id: 1,
    action: defaultActions[0],
  });
  assert.equal(s.count, 0);
  assert.equal(sessionReducer(s, { type: "complete", id: 2 }), s);
  s = sessionReducer(s, { type: "complete", id: 1 });
  assert.equal(s.count, 1);
  assert.equal(sessionReducer(s, { type: "complete", id: 1 }), s);
  s = sessionReducer(s, { type: "start", id: 2, action: defaultActions[2] });
  s = sessionReducer(s, { type: "stop" });
  assert.equal(sessionReducer(s, { type: "complete", id: 2 }), s);
  s = sessionReducer(s, { type: "reset" });
  assert.equal(sessionReducer(s, { type: "complete", id: 2 }).count, 0);
});
test("concurrent actions cannot start and branch trees reject cycles or missing nodes", () => {
  const s = sessionReducer(initialSession, {
    type: "start",
    id: 1,
    action: defaultActions[0],
  });
  assert.equal(
    sessionReducer(s, { type: "start", id: 2, action: defaultActions[1] }),
    s,
  );
  assert.deepEqual(parseTree(JSON.stringify(defaultTree)), defaultTree);
  for (const edges of [
    [{ from: "normal", to: "missing", requiredResponses: 1 }],
    [{ from: "normal", to: "young", requiredResponses: 0 }],
    [
      { from: "normal", to: "young", requiredResponses: 1 },
      { from: "young", to: "normal", requiredResponses: 1 },
    ],
  ])
    assert.throws(() => parseTree(JSON.stringify({ ...defaultTree, edges })));
});
test("imported action files are validated and cannot supply executable or unknown motions", () => {
  assert.deepEqual(
    parseActionPack(JSON.stringify({ version: 1, actions: defaultActions })),
    defaultActions,
  );
  for (const change of [
    { motion: "execute" },
    { durationMs: 999999 },
    { label: "" },
  ]) {
    assert.throws(() =>
      parseActionPack(
        JSON.stringify({
          version: 1,
          actions: [{ ...defaultActions[0], ...change }],
        }),
      ),
    );
  }
  assert.throws(() =>
    parseActionPack(
      JSON.stringify({
        version: 1,
        actions: [defaultActions[0], defaultActions[0]],
      }),
    ),
  );
  assert.throws(() => parseActionPack("not json"));
});
test("GLB checks accept the bundled model and reject invalid or externally loaded resources", () => {
  const file = readFileSync(
    new URL("../public/models/niulai-mouth.glb", import.meta.url),
  );
  assert.equal(
    validateLocalGlb(
      file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength),
    ),
    true,
  );
  assert.throws(() => validateLocalGlb(new ArrayBuffer(32)));
  const json = new TextEncoder().encode(
    JSON.stringify({ images: [{ uri: "https://example.com/texture.png" }] }),
  );
  const buffer = new ArrayBuffer(20 + json.length),
    view = new DataView(buffer);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, buffer.byteLength, true);
  view.setUint32(12, json.length, true);
  view.setUint32(16, 0x4e4f534a, true);
  new Uint8Array(buffer, 20).set(json);
  assert.throws(() => validateLocalGlb(buffer), /内嵌/);
});
