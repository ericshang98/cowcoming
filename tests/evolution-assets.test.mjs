import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { evolutionAssets } from "../src/evolution-assets.mjs";
import { ACTION_CATALOG, HARDWARE_ACTION_IDS } from "../shared/action-catalog.mjs";
test("all six shipped rigs contain the verified hardware clips while the software catalog remains broader", () => {
  assert.equal(Object.keys(evolutionAssets).length, 6);
  for (const [form, m] of Object.entries(evolutionAssets)) {
    const bytes = fs.readFileSync(
      new URL("../public" + m.model, import.meta.url),
    );
    assert.equal(createHash("sha256").update(bytes).digest("hex"), m.sha256);
    const json = JSON.parse(
      bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString(),
    );
    const bones = new Set(
      json.skins.flatMap((s) => s.joints.map((j) => json.nodes[j].name)),
    );
    assert.equal(m.variants.length, HARDWARE_ACTION_IDS.length - 1);
    assert.deepEqual(
      m.variants.map((v) => v.actionId).sort(),
      HARDWARE_ACTION_IDS.filter((id) => id !== "WAIT").sort(),
    );
    for (const v of m.variants) {
      assert.ok(json.animations.some((a) => a.name === v.clip));
      for (const b of v.requiredBones) assert.ok(bones.has(b), `${form} ${b}`);
    }
    assert.ok(!json.animations.some((a) => /approve/.test(a.name)));
  }
});

// The reclining pose must never inherit a standing character's wide head gaze.
test("playful retains its original clips, mouth shapes and reclining presentation", () => {
  const m = evolutionAssets.playful;
  assert.equal(m.neutralPose, "reclining");
  assert.equal(m.headTracking, false);
  assert.ok(m.viewYawRadians > 0.6 && m.viewYawRadians < 0.7);
  const bytes = fs.readFileSync(
    new URL("../public" + m.model, import.meta.url),
  );
  const json = JSON.parse(
    bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString(),
  );
  assert.equal(json.animations.length, 14);
  for (const name of ["idle", "wave", "bow", "leg_sway", "NOD", "NOD_DOUBLE", "SHAKE", "TILT_LEFT", "TILT_RIGHT"])
    assert.ok(json.animations.some((a) => a.name === name));
  const morphNames = new Set(
    json.meshes.flatMap((m) => m.extras?.targetNames || []),
  );
  assert.deepEqual([...morphNames].sort(), [
    "MouthOpen",
    "MouthRound",
    "MouthWide",
  ]);
  assert.ok(
    m.variants.every(
      (v) => v.entryPose === "reclining" && v.exitPose === "reclining",
    ),
  );
});
