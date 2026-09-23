import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  HOME_MODELS,
  DEFAULT_HOME_MODEL,
  modelForPage,
} from "../src/scene/home-models.mjs";

test("HOME model selection cannot replace WORK, About, Contact or IDEA52 assets", () => {
  for (const model of HOME_MODELS) {
    assert.equal(modelForPage("home", model), model);
    for (const page of ["work", "about", "contact", "blog"]) {
      assert.equal(modelForPage(page, model), DEFAULT_HOME_MODEL);
    }
  }
});

for (const model of HOME_MODELS) {
  test(`${model.name} asset matches the declared rig and mouth capabilities`, () => {
    const data = readFileSync(
      new URL(`../public${model.asset}`, import.meta.url),
    );
    assert.equal(data.readUInt32LE(0), 0x46546c67);
    assert.equal(data.readUInt32LE(4), 2);
    assert.equal(data.readUInt32LE(8), data.length);
    const gltf = JSON.parse(data.subarray(20, 20 + data.readUInt32LE(12)));
    assert.ok(gltf.skins?.length);
    for (const name of ["Head", "Neck"])
      assert.ok(gltf.nodes.some((node) => node.name === name));
    for (const name of ["idle", "bow", "wave"])
      assert.ok(gltf.animations.some((clip) => clip.name === name));
    for (const resource of [...gltf.buffers, ...(gltf.images || [])]) {
      assert.ok(!resource.uri || resource.uri.startsWith("data:"));
    }
    const targets = new Set(
      gltf.meshes.flatMap((mesh) => mesh.extras?.targetNames || []),
    );
    assert.equal(
      ["MouthOpen", "MouthWide", "MouthRound"].every((name) =>
        targets.has(name),
      ),
      model.mouth,
    );
  });
}
