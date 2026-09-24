import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import { spawn } from "node:child_process";
import { chromium } from "playwright";
const base = process.env.QA_BASE_URL || "http://127.0.0.1:4352";
fs.mkdirSync(".pwc", { recursive: true });
// Keep the public harness out of .pwc, which Vite correctly blocks for secrets.
const harness = fs.mkdtempSync("tests/camera-qa-");
fs.writeFileSync(
  `${harness}/camera-harness.html`,
  `<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/${harness}/camera-harness.jsx"></script></body></html>`,
);
// Vite injects the React refresh preamble when serving this HTML.
fs.writeFileSync(
  `${harness}/camera-harness.jsx`,
  `import React,{useState} from 'react';import{createRoot}from'react-dom/client';import{LanguageProvider,useLanguage}from'/src/i18n/Language';import useLocalCamera from'/src/live/useLocalCamera';import CameraView from'/src/live/CameraView';import'/src/live/live.css';import'/src/live/camera.css';
const subscribeSignal=()=>()=>{};const send=()=>{window.signalCount=(window.signalCount||0)+1};
function App(){const[online,onlineSet]=useState(true),[room,roomSet]=useState('qa');const{setLanguage}=useLanguage();window.qaOnline=onlineSet;window.qaRoom=roomSet;window.qaLanguage=setLanguage;const camera=useLocalCamera({online,snapshot:{roomId:room},subscribeSignal,send,clientId:'qa'});window.camera=camera;return <main style={{maxWidth:520,margin:'20px auto',padding:12,fontFamily:'Arial',background:'#eef5f7'}}><CameraView camera={camera} online={online}/></main>};createRoot(document.getElementById('root')).render(<LanguageProvider><App/></LanguageProvider>);`,
);
let image = "",
  sequence = 0,
  mode = "live",
  received = 0;
const local = http.createServer((req, res) => {
  const headers = {
    "Access-Control-Allow-Origin": base,
    "Access-Control-Allow-Headers": "Authorization",
    "Content-Type": "application/json",
  };
  if (req.method === "OPTIONS") {
    res.writeHead(204, headers);
    res.end();
    return;
  }
  received++;
  res.writeHead(200, headers);
  if (mode === "malformed") {
    res.end('{"ageMs":0,"frameId":1,"image":{"base64":"bad"}}');
    return;
  }
  if (mode === "live") sequence++;
  res.end(
    JSON.stringify({
      version: 1,
      frameId: sequence,
      ageMs: 0,
      image: { mime: "image/jpeg", base64: image },
      boxes: [{ id: "test", label: "synthetic", bbox: [0.25, 0.2, 0.3, 0.5] }],
      fps: 20,
    }),
  );
});
await new Promise((r) => local.listen(0, "127.0.0.1", r));
const upstream = `http://127.0.0.1:${local.address().port}/snapshot`;
const key = "a".repeat(48);
fs.writeFileSync(".pwc/camera-qa.key", key, { mode: 0o600 });
const bridge = spawn("python3", [
  "examples/device/local_preview.py",
  "--upstream",
  upstream,
  "--port",
  "0",
  "--origin",
  base,
  "--token-file",
  ".pwc/camera-qa.key",
]);
const endpoint = await new Promise((resolve, reject) => {
  let log = "";
  const timeout = setTimeout(
    () => reject(new Error("Preview bridge startup timed out")),
    10000,
  );
  bridge.stdout.on("data", (b) => {
    log += b;
    const match = log.match(/http:\/\/127\.0\.0\.1:\d+\/snapshot/);
    if (match) {
      clearTimeout(timeout);
      resolve(match[0]);
    }
  });
  bridge.on("exit", (code) => {
    clearTimeout(timeout);
    reject(new Error(`Bridge exited: ${code}`));
  });
});
const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: [
    "--use-fake-device-for-media-stream",
    "--use-fake-ui-for-media-stream",
  ],
});
const errors = [];
try {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    permissions: ["camera"],
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.stack));
  await page.goto(base + `/${harness}/camera-harness.html`);
  await page.waitForFunction(() => window.camera);
  await page.evaluate(() => window.qaLanguage("en"));
  assert.equal(await page.evaluate(() => window.camera.config.source), "local");
  assert.equal(received, 0);
  const edit = () =>
    page
      .getByRole("button", { name: "Edit camera window", exact: true })
      .click();
  const save = () =>
    page.getByRole("button", { name: "Save settings", exact: true }).click();
  const start = () =>
    page.getByRole("button", { name: "Start video", exact: true }).click();
  await edit();
  await page.getByLabel("Source type").selectOption("browser");
  await save();
  await start();
  await page.waitForFunction(
    () => window.camera.stream?.getVideoTracks()[0]?.readyState === "live",
  );
  await page.locator(".camera-stage.is-live").waitFor();
  assert.ok(await page.evaluate(() => window.camera.actual.width > 0));
  assert.ok(await page.evaluate(() => window.camera.devices.length > 0));
  assert.match(
    await page.locator(".live-video-badge").innerText(),
    /NO DETECTOR/,
  );
  await page.evaluate(() => (window.firstStream = window.camera.stream));
  await edit();
  await page.getByLabel("Window title").fill("Desk camera");
  await page.getByLabel("Window ratio").selectOption("1:1");
  await page.getByLabel("Rotation", { exact: true }).selectOption("90");
  await page.getByLabel("Mirror image and annotations").check();
  await page.getByLabel("Composition grid").check();
  await save();
  assert.equal(
    await page.evaluate(() => window.firstStream === window.camera.stream),
    true,
  );
  assert.match(
    await page.locator(".camera-content").getAttribute("style"),
    /rotate\(90deg\).*scaleX\(-1\)/,
  );
  await edit();
  await page.getByLabel("Window title").fill("CANCELLED");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  assert.equal(
    await page.locator(".camera-toolbar strong").innerText(),
    "Desk camera",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await edit();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.screenshot({ path: ".pwc/local-camera-settings-mobile.png" });
  await save();
  await page.getByRole("button", { name: "Stop video", exact: true }).click();
  assert.equal(
    await page.evaluate(() =>
      window.firstStream.getTracks().every((t) => t.readyState === "ended"),
    ),
    true,
  );
  await page.reload();
  await page.waitForFunction(() => window.camera);
  assert.equal(
    await page.evaluate(() => window.camera.config.title),
    "Desk camera",
  );
  assert.equal(await page.evaluate(() => window.camera.status), "idle");
  await page.evaluate(() => {
    window.realGetUserMedia = navigator.mediaDevices.getUserMedia.bind(
      navigator.mediaDevices,
    );
    navigator.mediaDevices.getUserMedia = () =>
      Promise.reject(
        Object.assign(new Error("denied"), { name: "NotAllowedError" }),
      );
  });
  await start();
  await page
    .getByRole("alert")
    .filter({ hasText: "permission denied" })
    .waitFor();
  await page.evaluate(() => {
    navigator.mediaDevices.getUserMedia = () =>
      new Promise((r) => (window.resolveCapture = r));
  });
  await start();
  await page.getByRole("button", { name: "Stop video", exact: true }).click();
  await page.evaluate(async () => {
    const stream = await window.realGetUserMedia({ video: true });
    window.lateStream = stream;
    window.resolveCapture(stream);
  });
  await page.waitForFunction(() =>
    window.lateStream.getTracks().every((t) => t.readyState === "ended"),
  );
  await start();
  await page
    .getByRole("alert")
    .filter({ hasText: "permission timed out" })
    .waitFor({ timeout: 20000 });
  await page.evaluate(async () => {
    const stream = await window.realGetUserMedia({ video: true });
    window.timedOutStream = stream;
    window.resolveCapture(stream);
  });
  await page.waitForFunction(() =>
    window.timedOutStream.getTracks().every((t) => t.readyState === "ended"),
  );
  image = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 640;
    c.height = 480;
    const x = c.getContext("2d");
    x.fillStyle = "#254a55";
    x.fillRect(0, 0, 640, 480);
    x.fillStyle = "#86bfb3";
    x.fillRect(160, 96, 192, 240);
    x.fillStyle = "white";
    x.font = "22px Arial";
    x.fillText("SYNTHETIC LOCAL VIDEO", 20, 38);
    return c.toDataURL("image/jpeg").split(",")[1];
  });
  await edit();
  await page.getByLabel("Source type").selectOption("local");
  await page.getByLabel("Local snapshot URL").fill(endpoint);
  await page.getByLabel("Local preview access key").fill("");
  await save();
  const beforeMissing = received;
  await start();
  await page.getByRole("alert").filter({ hasText: "key is missing" }).waitFor();
  assert.equal(received, beforeMissing);
  await edit();
  await page.getByLabel("Local preview access key").fill("wrong");
  await page.getByLabel("Remember key in this tab").check();
  await save();
  await start();
  await page
    .getByRole("alert")
    .filter({ hasText: "key is incorrect" })
    .waitFor();
  assert.equal(
    await page.evaluate(() =>
      sessionStorage.getItem("cowcoming.camera.session.v1"),
    ),
    null,
  );
  await edit();
  await page.getByLabel("Local preview access key").fill(key);
  await page.getByLabel("Remember key in this tab").check();
  await save();
  await start();
  await page.locator(".camera-stage.is-live .live-cv-box").waitFor();
  assert.equal(
    await page.evaluate(
      (secret) => JSON.stringify(localStorage).includes(secret),
      key,
    ),
    false,
  );
  assert.equal(await page.evaluate(() => window.signalCount || 0), 0);
  await page.reload();
  await page.waitForFunction(() => window.camera?.token);
  assert.equal(await page.evaluate(() => window.camera.token), key);
  assert.equal(await page.evaluate(() => window.camera.status), "idle");
  const afterReload = received;
  await page.waitForTimeout(350);
  assert.equal(received, afterReload, "refresh must not start capture");
  await page.evaluate(() => window.qaLanguage("en"));
  await start();
  await page.locator(".camera-stage.is-live .live-cv-box").waitFor();
  await edit();
  await page.getByLabel("Remember key in this tab").uncheck();
  await save();
  assert.equal(
    await page.evaluate(() =>
      sessionStorage.getItem("cowcoming.camera.session.v1"),
    ),
    null,
  );
  // Opt in again to exercise room isolation with an actually saved credential.
  await edit();
  await page.getByLabel("Remember key in this tab").check();
  await save();
  await page.screenshot({ path: ".pwc/local-camera-mobile.png" });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({ path: ".pwc/local-camera-desktop.png" });
  mode = "frozen";
  await page
    .getByRole("alert")
    .filter({ hasText: "No fresh frames" })
    .waitFor({ timeout: 8000 });
  assert.equal(await page.locator(".camera-content img").count(), 0);
  mode = "malformed";
  await start();
  await page
    .getByRole("alert")
    .filter({ hasText: "unsupported snapshot" })
    .waitFor();
  mode = "live";
  await start();
  await page.locator(".camera-stage.is-live").waitFor();
  await page.evaluate(() => window.qaOnline(false));
  await page.waitForFunction(() => window.camera.status === "idle");
  assert.equal(await page.locator(".camera-content img").count(), 0);
  const stoppedCount = received;
  await page.waitForTimeout(500);
  assert.equal(received, stoppedCount);
  await page.evaluate(() => {
    window.qaOnline(true);
    window.qaRoom("second-room");
  });
  await page.waitForFunction(() => window.camera.config.title === "");
  assert.equal(await page.evaluate(() => window.camera.token), "");
  assert.equal(await page.evaluate(() => window.camera.rememberToken), false);
  await page.evaluate(() => window.qaRoom("qa"));
  await page.waitForFunction(() => window.camera.token !== "");
  await edit();
  await page
    .getByLabel("Local snapshot URL")
    .fill("http://127.0.0.1:9999/snapshot");
  // A different endpoint cannot read the credential saved for the old endpoint.
  assert.equal(
    await page.evaluate(async () => {
      const { readCameraSession } =
        await import("/src/live/camera-session.mjs");
      return readCameraSession("qa", "http://127.0.0.1:9999/snapshot");
    }),
    "",
  );
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await edit();
  await page.getByLabel("Remember key in this tab").uncheck();
  await save();
  await page.reload();
  await page.waitForFunction(() => window.camera);
  assert.equal(await page.evaluate(() => window.camera.token), "");
  await page.evaluate(() => window.qaLanguage("zh"));
  await page.getByRole("button", { name: "编辑视觉窗口", exact: true }).click();
  await page.getByRole("heading", { name: "编辑视觉窗口" }).waitFor();
  await page.keyboard.press("Escape");
  assert.deepEqual(errors, []);
  console.log(
    "PASS: local/browser sources, real synthetic capture, settings save/cancel, actual specs, mobile, permissions, late capture cleanup, auth, CV transforms, no relay frames, stale/malformed frames, offline cleanup, opt-in key persistence across reload, missing-key detection, forget, auth invalidation and room/endpoint isolation",
  );
} finally {
  await browser.close();
  fs.rmSync(harness, { recursive: true, force: true });
  bridge.kill("SIGTERM");
  await new Promise((r) => local.close(r));
}
