import test from "node:test";
import assert from "node:assert/strict";
import { proceduralPose } from "../src/live/animation.mjs";
test("procedural clips preserve semantics, bounded movement and return to rest", () => {
  for (const clip of [
    "nod-soft",
    "nod-double",
    "head-shake",
    "tilt-left",
    "tilt-right",
  ]) {
    assert.deepEqual(proceduralPose(clip, 0), { yaw: 0, pitch: 0, roll: 0 });
    assert.deepEqual(proceduralPose(clip, 2), { yaw: 0, pitch: 0, roll: 0 });
    for (let t = 0; t < 2; t += 0.05)
      for (const value of Object.values(proceduralPose(clip, t)))
        assert.ok(Math.abs(value) < 0.6);
  }
  assert.deepEqual(proceduralPose("look-left", 0.8), {yaw:0,pitch:0,roll:0});
  const yaws = Array.from({length:40},(_,i)=>proceduralPose("head-shake",i/20).yaw);
  assert.ok(Math.min(...yaws)<0 && Math.max(...yaws)>0);
  assert.equal(proceduralPose("nod-soft", 0.8).yaw, 0);
  assert.equal(proceduralPose("tilt-left", 0.8).pitch, 0);
});
