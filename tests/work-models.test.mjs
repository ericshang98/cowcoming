import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { ipCatalog } from "../src/ip-catalog.mjs";
import { evolutionAssets } from "../src/evolution-assets.mjs";
import { forms, resolvePreview } from "../src/evolution.mjs";
const catalog = JSON.parse(
  readFileSync(
    new URL("../public/models/work/route-models.json", import.meta.url),
  ),
);
test("仙牛与暗黑牛属于 WORK 路线，不出现在 HOME 菜单", () => {
  assert.equal(catalog.scope, "work");
  assert.deepEqual(
    catalog.models.map((m) => [m.name, m.targetRouteLabel]),
    [
      ["仙牛", "仙牛路线"],
      ["暗黑牛", "暗黑牛路线"],
    ],
  );
  for (const model of catalog.models) {
    assert.ok(!ipCatalog.some((home) => home.id === model.id));
    const preview = resolvePreview(forms[model.formId].branch, model.formId, Object.keys(forms));
    assert.equal(preview.model, evolutionAssets[model.formId].model);
    assert.equal(evolutionAssets[model.formId].sourceSha256, model.sha256);
    assert.equal(preview.placeholder, false);
  }
});
for (const model of catalog.models)
  test(model.name + " 的最终 GLB 具有真实蒙皮、独立动作和内嵌资源", () => {
    const b = readFileSync(new URL("../public" + model.asset, import.meta.url));
    assert.equal(createHash("sha256").update(b).digest("hex"), model.sha256);
    assert.equal(b.readUInt32LE(0), 0x46546c67);
    assert.equal(b.readUInt32LE(8), b.length);
    const g = JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)));
    assert.equal(g.skins[0].joints.length, model.bones);
    assert.ok(
      g.nodes.some((n) => n.mesh !== undefined && n.skin !== undefined),
    );
    for (const n of ["Head", "Neck", "Hips"])
      assert.ok(g.nodes.some((node) => node.name === n));
    for (const a of model.animations)
      assert.ok(g.animations.some((c) => c.name === a));
    for (const m of g.meshes)
      for (const p of m.primitives) {
        assert.ok(p.attributes.WEIGHTS_0 !== undefined);
        assert.ok(p.attributes.JOINTS_0 !== undefined);
        assert.equal(p.targets, undefined);
      }
    for (const resource of [...g.buffers, ...g.images])
      assert.equal(resource.uri, undefined);
    assert.equal(model.mouth, false);
    assert.equal(model.walking, false);
  });
