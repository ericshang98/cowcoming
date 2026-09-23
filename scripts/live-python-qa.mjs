import { chromium } from "playwright";
import { spawn } from "node:child_process";
import fs from "node:fs";
import assert from "node:assert/strict";
const base = process.env.QA_BASE_URL || "http://127.0.0.1:4317";
const relay = process.env.TEST_RELAY_URL || "http://127.0.0.1:8794";
const admin =
  process.env.TEST_RELAY_ADMIN ||
  JSON.parse(fs.readFileSync(".pwc/live-admin.json")).key;
const r = await fetch(relay + "/v1/rooms", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${admin}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ label: "Python WebRTC test" }),
});
const keys = await r.json();
assert.ok(keys.browserKey);
const child = spawn(
  process.env.DEVICE_PYTHON || ".pwc/device311/bin/python",
  ["examples/device/run.py", "--test-video"],
  {
    env: {
      ...process.env,
      COWCOMING_RELAY_URL: relay,
      COWCOMING_DEVICE_KEY: keys.deviceKey,
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let logs = "";
child.stdout.on("data", (s) => (logs += s));
child.stderr.on("data", (s) => (logs += s));
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROME_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  args: ["--enable-unsafe-swiftshader"],
});
try {
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await p.addInitScript(
    ({ relay, key }) =>
      sessionStorage.setItem("cowcoming-live", JSON.stringify({ relay, key })),
    { relay, key: keys.browserKey },
  );
  await p.goto(base + "/?section=work");
  await p
    .getByRole("button", { name: "Switch to English", exact: true })
    .click();
  await p.getByText("PROMPT v1", { exact: true }).waitFor({ timeout: 60000 });
  await p.getByRole("button", { name: "Start video" }).click();
  await p.locator(".live-camera.is-live").waitFor({ timeout: 25000 });
  await p.locator(".live-cv-box").waitFor();
  assert.equal(await p.locator("video").evaluate((v) => v.videoWidth), 640);
  await p.screenshot({ path: ".pwc/live-python-video.png" });
  await p.getByRole("tab", { name: "Large Language Model" }).click();
  await p.getByLabel("Message to local process").fill("Python integration");
  await p.getByRole("button", { name: "Send", exact: true }).click();
  await p
    .getByText(
      "[Local example] Received: Python integration. Replace reply() with your LLM stream.",
      { exact: true },
    )
    .waitFor();
  await p.getByRole("button", { name: "Stop", exact: true }).click();
  await p.getByText(/stopped · Simulation stopped/).waitFor();
  await p.getByRole("tab", { name: "Vision / Action" }).click();
  await p.getByRole("button", { name: "Stop video" }).click();
  await p.getByRole("button", { name: "Start video" }).click();
  await p.locator(".live-camera.is-live").waitFor({ timeout: 25000 });
  await p.locator(".live-cv-box").waitFor();
  console.log(
    "PASS: shipped Python adapter → real Worker → browser; aiortc direct synthetic video, CV channel, restart, JEV simulation, LLM stream and stop receipts.",
  );
} catch (e) {
  console.error(logs.replaceAll(keys.deviceKey, "[redacted]"));
  throw e;
} finally {
  child.kill("SIGTERM");
  await browser.close();
}
