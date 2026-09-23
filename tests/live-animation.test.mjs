import test from "node:test";
import assert from "node:assert/strict";
import { proceduralPose } from "../src/live/animation.mjs";
test("procedural clips preserve semantics, bounded movement and return to rest", () => {
  for (const clip of [
    "nod-soft",
    "nod-double",
    "look-left",
    "look-right",
    "tilt-left",
    "tilt-right",
  ]) {
    assert.deepEqual(proceduralPose(clip, 0), { yaw: 0, pitch: 0, roll: 0 });
    assert.deepEqual(proceduralPose(clip, 2), { yaw: 0, pitch: 0, roll: 0 });
    for (let t = 0; t < 2; t += 0.05)
      for (const value of Object.values(proceduralPose(clip, t)))
        assert.ok(Math.abs(value) < 0.6);
  }
  assert.ok(proceduralPose("look-left", 0.8).yaw < 0);
  assert.ok(proceduralPose("look-right", 0.8).yaw > 0);
  assert.equal(proceduralPose("nod-soft", 0.8).yaw, 0);
  assert.equal(proceduralPose("tilt-left", 0.8).pitch, 0);
});
