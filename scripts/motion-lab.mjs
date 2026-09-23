import { spawn, spawnSync } from "node:child_process";
import { mkdir, writeFile, rm, open } from "node:fs/promises";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import net from "node:net";
import crypto from "node:crypto";
process.chdir(fileURLToPath(new URL("..", import.meta.url)));
const webPort = Number(process.env.MOTION_LAB_PORT || 4337);
const python =
  process.env.DEVICE_PYTHON || resolve(".pwc/motion-python/bin/python");
if (
  spawnSync(python, ["-c", "import aiohttp"], { stdio: "ignore" }).status !== 0
)
  throw Error(
    "Prepare Python first: python3 -m venv .pwc/motion-python && .pwc/motion-python/bin/pip install -r examples/device/requirements.txt",
  );
async function freePort(port = 0) {
  const listener = net.createServer();
  await new Promise((yes, no) => {
    listener.once("error", no);
    listener.listen(port, "127.0.0.1", yes);
  });
  const result = listener.address().port;
  await new Promise((resolve) => listener.close(resolve));
  return result;
}
await freePort(webPort); // Do not replace a server that is already using this port.
const inspectorPort = await freePort();
const relayPort = await freePort(),
  relay = `http://127.0.0.1:${relayPort}`;
const folder = resolve(
  webPort === 4337 ? ".pwc/motion-lab" : `.pwc/motion-lab-${webPort}`,
);
await mkdir(folder, { recursive: true, mode: 0o700 });
const secret = crypto.randomBytes(32).toString("hex");
const children = [];
const log = await open(join(folder, "session.log"), "w", 0o600);
let closing = false;
async function close(code = 0) {
  if (closing) return;
  closing = true;
  for (const child of children.reverse()) {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {}
  }
  await rm(join(folder, "browser-session.json"), { force: true });
  await rm(join(folder, ".dev.vars"), { force: true });
  await log.close();
  process.exit(code);
}
process.on("SIGINT", () => close());
process.on("SIGTERM", () => close());
function start(args, env = {}, command = process.execPath) {
  const child = spawn(command, args, {
    detached: true,
    env: { ...process.env, ...env },
    stdio: ["ignore", log.fd, log.fd],
  });
  children.push(child);
  child.on("error", () => {
    console.error("Local service failed. See .pwc/motion-lab/session.log");
    close(1);
  });
  child.on("exit", () => {
    if (!closing) {
      console.error("Local service stopped. See .pwc/motion-lab/session.log");
      close(1);
    }
  });
  return child;
}
async function ready(url) {
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(url, { signal: AbortSignal.timeout(500) })).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw Error("Local service did not become ready");
}
try {
  await writeFile(
    join(folder, "wrangler.json"),
    JSON.stringify({
      name: "cowcoming-motion-lab",
      main: resolve("server/worker.mjs"),
      compatibility_date: "2025-11-25",
      durable_objects: {
        bindings: [{ name: "ROOMS", class_name: "DeviceRoom" }],
      },
      migrations: [{ tag: "v1", new_sqlite_classes: ["DeviceRoom"] }],
      vars: { ALLOWED_ORIGINS: `http://127.0.0.1:${webPort}` },
    }),
  );
  await writeFile(join(folder, ".dev.vars"), `ADMIN_KEY=${secret}\n`, {
    mode: 0o600,
  });
  start(
    [
      resolve("node_modules/wrangler/bin/wrangler.js"),
      "dev",
      "--local",
      "--inspector-port",
      String(inspectorPort),
      "--config",
      join(folder, "wrangler.json"),
      "--port",
      String(relayPort),
      "--ip",
      "127.0.0.1",
      "--persist-to",
      join(folder, "state"),
    ],
    { WRANGLER_SEND_METRICS: "false" },
  );
  await ready(relay + "/health");
  const response = await fetch(relay + "/v1/rooms", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + secret,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ label: "Local motion tuning · simulation" }),
  });
  const keys = await response.json();
  if (!response.ok || !keys.browserKey || !keys.deviceKey)
    throw Error("Cannot create local simulation room");
  const sessionFile = join(folder, "browser-session.json");
  await writeFile(
    sessionFile,
    JSON.stringify({ relay, key: keys.browserKey }),
    { mode: 0o600 },
  );
  start(
    ["examples/device/run.py"],
    { COWCOMING_RELAY_URL: relay, COWCOMING_DEVICE_KEY: keys.deviceKey },
    python,
  );
  start(
    [
      resolve("node_modules/vite/bin/vite.js"),
      "--host",
      "127.0.0.1",
      "--port",
      String(webPort),
      "--strictPort",
    ],
    { COWCOMING_LAB_SESSION: sessionFile },
  );
  await ready(`http://127.0.0.1:${webPort}`);
  if (process.argv.includes("--open") && process.platform === "darwin")
    spawn("open", [`http://127.0.0.1:${webPort}/__motion-lab/start`], {
      stdio: "ignore",
    });
  console.log(
    `\n动作调试已启动（本地模拟设备，无真实硬件）\nhttp://127.0.0.1:${webPort}/__motion-lab/start\n保持此终端运行；Ctrl+C 只会停止本次调试进程。\n`,
  );
} catch (error) {
  console.error(error.message);
  await close(1);
}
