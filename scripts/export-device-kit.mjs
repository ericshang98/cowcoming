import { mkdir, copyFile, mkdtemp, rm, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { defaultTuningDocument } from "../src/live/motion-tuning.mjs";
const output = resolve("public/downloads");
const temp = await mkdtemp(join(tmpdir(), "cowcoming-kit-"));
try {
  const kit = join(temp, "cowcoming-device");
  await mkdir(kit);
  await writeFile(join(kit, "version.json"), JSON.stringify({
    repository: "https://github.com/ericshang98/cowcoming",
    commit: execFileSync("git", ["rev-parse", "HEAD"], {encoding:"utf8"}).trim(),
    actionContractVersion: 2,
    localController: "https://github.com/Mark10667/benben/blob/main/docs/cowcoming-handoff.md"
  }, null, 2) + "\n");
  await mkdir(output, { recursive: true });
  for (const file of [
    "adapter.py",
    "action_contract.py",
    "hardware_adapter.py",
    "local_preview.py",
    "test_local_preview.py",
    "client.py",
    "publisher.py",
    "camera.py",
    "run.py",
    "requirements.txt",
    "requirements-camera.txt",
    "requirements-lock.txt",
    "test_client.py",
    "README.md",
  ])
    await copyFile(resolve("examples/device", file), join(kit, file));
  await copyFile(resolve("shared/niulai-personas.json"), join(kit, "niulai-personas.json"));
  await copyFile(resolve("shared/form-profiles.json"), join(kit, "form-profiles.json"));
  await copyFile(
    resolve("docs/live-device.md"),
    join(kit, "device-protocol.md"),
  );
  await copyFile(
    resolve("docs/live-device.md"),
    join(output, "device-protocol.md"),
  );
  for (const file of ["hardware-handoff.md", "evolution-runtime.md", "local-camera.md", "motion-self-tuning.md", "benben-handoff.md"]) {
    await copyFile(resolve("docs", file), join(kit, file));
    await copyFile(resolve("docs", file), join(output, file));
  }
  const defaults = JSON.stringify(defaultTuningDocument(), null, 2) + "\n";
  await writeFile(join(kit, "motion-tuning-defaults.json"), defaults);
  await writeFile(join(output, "motion-tuning-defaults.json"), defaults);
  execFileSync("tar", [
    "-czf",
    join(output, "cowcoming-device.tar.gz"),
    "-C",
    temp,
    "cowcoming-device",
  ]);
  console.log("Exported device guide and key-free Python kit.");
} finally {
  await rm(temp, { recursive: true, force: true });
}
