/** Prepare cache-versioned website GLBs from Blender output. */
import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, join } from "node:path";
import { ACTION_CATALOG } from "../shared/action-catalog.mjs";
const sourceRoot = resolve(process.env.NIULAI_PACKAGE || "tmp/evolution");
const assets = {};
await mkdir("public/models/evolution", { recursive: true });
for (const form of ["calf", "normal", "tough", "celestial", "dark"]) {
  const input = join(sourceRoot, form);
  const manifest = JSON.parse(
    await readFile(join(input, "actions.json"), "utf8"),
  );
  const bytes = await readFile(join(input, manifest.model));
  const sha = createHash("sha256").update(bytes).digest("hex");
  const name = `${form}-${sha.slice(0, 12)}.glb`;
  const variants = Object.entries(ACTION_CATALOG).map(([actionId, a]) => {
    const v = manifest.variants.find((v) => v.logicalId === a.suffix);
    if (!v) throw Error(`Missing ${form} ${actionId}`);
    return { ...v, actionId };
  });
  await copyFile(
    join(input, manifest.model),
    join("public/models/evolution", name),
  );
  assets[form] = {
    formId: form,
    formLabel: manifest.formLabel,
    model: "/models/evolution/" + name,
    sha256: sha,
    sourceSha256: manifest.sourceSha256,
    variants,
  };
}
await writeFile(
  "src/evolution-assets.mjs",
  "// Generated from verified animation assets by scripts/prepare-evolution-assets.mjs.\nexport const evolutionAssets = " +
    JSON.stringify(assets, null, 2) +
    ";\n",
);
await writeFile(
  "public/models/evolution/manifest.json",
  JSON.stringify({ actionContractVersion: 2, forms: assets }, null, 2) + "\n",
);
console.log("Prepared five evolution models and 25 semantic response clips.");
