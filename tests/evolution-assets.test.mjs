import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { evolutionAssets } from "../src/evolution-assets.mjs";
import { ACTION_CATALOG } from "../shared/action-catalog.mjs";
test("all five shipped rigs contain the exact five clips and their required bones", () => {
  assert.equal(Object.keys(evolutionAssets).length, 5);
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
    assert.equal(m.variants.length, 5);
    assert.deepEqual(
      m.variants.map((v) => v.actionId).sort(),
      Object.keys(ACTION_CATALOG).sort(),
    );
    for (const v of m.variants) {
      assert.ok(json.animations.some((a) => a.name === v.clip));
      for (const b of v.requiredBones) assert.ok(bones.has(b), `${form} ${b}`);
    }
    assert.ok(!json.animations.some((a) => /approve/.test(a.name)));
  }
});
