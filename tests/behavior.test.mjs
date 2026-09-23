import test from "node:test";
import assert from "node:assert/strict";
import { damp, gazeTargets, ReactionQueue } from "../src/scene/motion.mjs";
import { questions, validateAnswer } from "../src/pages/contact-flow.mjs";
test("gaze remains bounded and mirrors pointer direction", () => {
  for (const human of [false, true])
    for (const x of [-100, -1, 0, 1, 100]) {
      const g = gazeTargets({ x, y: 100 }, { x: 0, y: 0 }, 0, human);
      assert.ok(Math.abs(g.yaw) <= 0.62);
      assert.ok(Math.abs(g.pitch) <= 0.4);
      assert.ok(Math.abs(g.body) <= (human ? 0.8 : 1.05));
      assert.equal(Math.sign(g.body), Math.sign(x));
    }
});
test("damping is frame-rate independent", () => {
  let x = 0;
  for (let i = 0; i < 60; i++) x = damp(x, 1, 9, 1 / 60);
  assert.ok(Math.abs(x - damp(0, 1, 9, 1)) < 1e-12);
});
test("user reactions survive ambient events and blocking", () => {
  const q = new ReactionQueue();
  q.request("wave", "ambient", 100);
  q.request("flip", "user", 200);
  assert.equal(q.request("idle", "ambient", 300), false);
  assert.equal(q.take(true), null);
  assert.equal(q.take().name, "flip");
  assert.equal(q.take(), null);
});
test("ambient cooldown avoids repeated interruptions", () => {
  const q = new ReactionQueue();
  assert.equal(q.request("wave", "ambient", 1000), true);
  q.take();
  assert.equal(q.request("wave", "ambient", 2000), false);
  assert.equal(q.request("wave", "ambient", 32000), true);
});
test("all contact branches enforce required replies and validate email", () => {
  assert.deepEqual(
    Object.values(questions).map((q) => q.length),
    [4, 6, 3],
  );
  for (const branch of Object.values(questions))
    for (const q of branch) {
      assert.equal(Boolean(validateAnswer(q, "")), !q.optional);
      if (q.type === "email") {
        assert.ok(validateAnswer(q, "not an email"));
        assert.equal(validateAnswer(q, "person@example.com"), "");
      }
      if (q.choices) {
        assert.ok(validateAnswer(q, "unknown"));
        assert.equal(validateAnswer(q, q.choices[0]), "");
      }
    }
});
