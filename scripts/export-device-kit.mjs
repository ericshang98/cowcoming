import { mkdir, copyFile, mkdtemp, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
const output = resolve("public/downloads");
const temp = await mkdtemp(join(tmpdir(), "cowcoming-kit-"));
try {
  const kit = join(temp, "cowcoming-device");
  await mkdir(kit);
  await mkdir(output, { recursive: true });
  for (const file of [
    "adapter.py",
    "client.py",
    "camera.py",
    "run.py",
    "requirements.txt",
    "requirements-camera.txt",
    "requirements-lock.txt",
    "test_client.py",
    "README.md",
  ])
    await copyFile(resolve("examples/device", file), join(kit, file));
  await copyFile(
    resolve("docs/live-device.md"),
    join(kit, "device-protocol.md"),
  );
  await copyFile(
    resolve("docs/live-device.md"),
    join(output, "device-protocol.md"),
  );
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
