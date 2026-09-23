import { spawn } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import net from "node:net";
import crypto from "node:crypto";
const folder = await mkdtemp(join(tmpdir(), "cowcoming-relay-test-"));
const listener = net.createServer();
await new Promise((r) => listener.listen(0, "127.0.0.1", r));
const port = listener.address().port;
await new Promise((r) => listener.close(r));
const secret = crypto.randomBytes(32).toString("hex");
await writeFile(
  join(folder, "wrangler.json"),
  JSON.stringify({
    name: "cowcoming-test",
    main: resolve("server/worker.mjs"),
    compatibility_date: "2025-11-25",
    durable_objects: {
      bindings: [{ name: "ROOMS", class_name: "DeviceRoom" }],
    },
    migrations: [{ tag: "v1", new_sqlite_classes: ["DeviceRoom"] }],
    vars: { ALLOWED_ORIGINS: "http://127.0.0.1:4317" },
  }),
);
await writeFile(join(folder, ".dev.vars"), `ADMIN_KEY=${secret}\n`, {
  mode: 0o600,
});
const child = spawn(
  process.execPath,
  [
    resolve("node_modules/wrangler/bin/wrangler.js"),
    "dev",
    "--config",
    join(folder, "wrangler.json"),
    "--port",
    String(port),
    "--ip",
    "127.0.0.1",
    "--persist-to",
    join(folder, "state"),
  ],
  {
    detached: true,
    env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let logs = "";
child.stdout.on("data", (x) => (logs = (logs + x).slice(-6000)));
child.stderr.on("data", (x) => (logs = (logs + x).slice(-6000)));
const base = `http://127.0.0.1:${port}`;
try {
  const deadline = Date.now() + 60000;
  while (true) {
    try {
      if (
        (await fetch(base + "/health", { signal: AbortSignal.timeout(500) })).ok
      )
        break;
    } catch {
      /* waiting for own worker */
    }
    if (child.exitCode !== null || Date.now() > deadline)
      throw new Error("Test Worker did not start");
    await new Promise((r) => setTimeout(r, 250));
  }
  const test = spawn(process.execPath, ["scripts/live-relay-check.mjs"], {
    env: { ...process.env, TEST_RELAY_URL: base, TEST_RELAY_ADMIN: secret },
    stdio: "inherit",
  });
  const code = await new Promise((r) => test.on("exit", r));
  if (code !== 0) throw new Error("Relay integration failed");
} catch (error) {
  console.error(logs.replaceAll(secret, "[redacted]"));
  throw error;
} finally {
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    /* already exited */
  }
  await Promise.race([
    new Promise((r) => child.once("exit", r)),
    new Promise((r) => setTimeout(r, 3000)),
  ]);
  await rm(folder, { recursive: true, force: true });
}
