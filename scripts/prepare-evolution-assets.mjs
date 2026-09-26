/** Prepare cache-versioned website GLBs from Blender output. */
import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, join } from "node:path";
import { ACTION_CATALOG, HARDWARE_ACTION_IDS } from "../shared/action-catalog.mjs";
const sourceRoot = resolve(process.env.NIULAI_PACKAGE || "tmp/evolution");
const allForms = ["calf", "normal", "playful", "tough", "celestial", "dark"];
const selectedForms = process.env.NIULAI_FORMS?.split(",") || allForms;
if (selectedForms.some((form) => !allForms.includes(form)))
  throw Error("Unknown form");
const assets = process.env.NIULAI_FORMS
  ? JSON.parse(await readFile("public/models/evolution/manifest.json", "utf8"))
      .forms
  : {};
await mkdir("public/models/evolution", { recursive: true });
for (const form of selectedForms) {
  const input = join(sourceRoot, form);
  const manifest = JSON.parse(
    await readFile(join(input, "actions.json"), "utf8"),
  );
  const bytes = await readFile(join(input, manifest.model));
  const sha = createHash("sha256").update(bytes).digest("hex");
  const name = `${form}-${sha.slice(0, 12)}.glb`;
  const variants = HARDWARE_ACTION_IDS.filter((id) => id !== "WAIT").map((actionId) => {
    const a = ACTION_CATALOG[actionId];
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
    ...(form === "playful"
      ? {
          neutralPose: manifest.neutralPose,
          headTracking: manifest.headTracking,
          viewYawRadians: manifest.viewYawRadians,
        }
      : {}),
    variants,
  };
}
// Partial builds must preserve and verify every previously shipped asset.
for (const [form, asset] of Object.entries(assets)) {
  const bytes = await readFile("public" + asset.model);
  if (createHash("sha256").update(bytes).digest("hex") !== asset.sha256)
    throw Error(`Hash differs: ${form}`);
}
const orderedAssets = Object.fromEntries(
  allForms.filter((form) => assets[form]).map((form) => [form, assets[form]]),
);
await writeFile(
  "src/evolution-assets.mjs",
  "// Generated from verified animation assets by scripts/prepare-evolution-assets.mjs.\nexport const evolutionAssets = " +
    JSON.stringify(orderedAssets, null, 2) +
    ";\n",
);
await writeFile(
  "public/models/evolution/manifest.json",
  JSON.stringify({ actionContractVersion: 2, forms: orderedAssets }, null, 2) +
    "\n",
);
console.log(
  `Prepared ${Object.keys(orderedAssets).length} evolution models and ${Object.keys(orderedAssets).length * (HARDWARE_ACTION_IDS.length - 1)} verified response clips; software-only behaviors are generated at runtime.`,
);
