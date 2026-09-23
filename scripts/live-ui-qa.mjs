import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "playwright";
const base = process.env.QA_BASE_URL || "http://127.0.0.1:4317";
const relay = process.env.TEST_RELAY_URL || "http://127.0.0.1:8794";
const admin =
  process.env.TEST_RELAY_ADMIN ||
  JSON.parse(fs.readFileSync(".pwc/live-admin.json")).key;
const response = await fetch(relay + "/v1/rooms", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${admin}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ label: "QA desk cow" }),
});
assert.ok(response.ok);
const keys = await response.json();
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROME_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  args: ["--enable-unsafe-swiftshader"],
});
const errors = [];
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.stack || e.message));
  await page.goto(base + "/?section=work");
  await page
    .getByRole("button", { name: "Switch to English", exact: true })
    .click();
  assert.equal(await page.locator('.evolution-node, .evolution-footer, [role="tablist"]').count(), 0);
  await page.getByRole('heading', {name:'Bind your Niulai first',exact:true}).waitFor();
  await page.waitForFunction(() => window.__replica?.controller.ready);
  await page.screenshot({path:'.pwc/binding-desktop.png'});
  const mobile = await browser.newPage({viewport:{width:390,height:844}});
  await mobile.goto(base + '/?section=work');
  await mobile.locator('.binding-card').waitFor();
  assert.ok((await mobile.locator('.live-connection').boundingBox()).y < 700);
  assert.equal(await mobile.locator('.evolution-node, [role="tablist"]').count(), 0);
  await mobile.screenshot({path:'.pwc/binding-mobile.png'});
  await mobile.close();
  await page.getByRole("button", { name: /CONNECT MY/ }).click();
  await page.getByLabel("Relay URL").fill(relay);
  await page.getByLabel("Browser connection key").fill("wrong-key");
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByText("Invalid connection key", { exact: true })
    .waitFor();
  await page.getByLabel("Browser connection key").fill(keys.deviceKey);
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByText(/Use the browser key/)
    .waitFor();
  await page.getByLabel("Browser connection key").fill(keys.browserKey);
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await page
    .getByRole("button", { name: "WAITING FOR DEVICE", exact: true })
    .waitFor();
  assert.equal(await page.evaluate(() => location.href.includes("cw1")), false);
  assert.equal(await page.locator('.evolution-node, .evolution-footer, [role="tablist"]').count(), 0);
  await page.getByRole('heading',{name:'Bound. Waiting for your computer.',exact:true}).waitFor();
  const devicePage = await context.newPage();
  await devicePage.goto(base + "/robots.txt");
  await devicePage.evaluate(
    async ({ relay, key }) => {
      const r = await fetch(relay + "/v1/connect", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}` },
      });
      const ticket = await r.json();
      const ws = new WebSocket(
        relay.replace(/^http/, "ws") +
          "/v1/socket/" +
          ticket.roomId +
          "?ticket=" +
          ticket.ticket,
      );
      window.device = {
        ws,
        profile: null,
        commands: [],
        peers: new Map(),
        ice: new Map(),
      };
      const send = (data) => ws.send(JSON.stringify(data));
      const emit = (type, data) =>
        send({ type, eventId: crypto.randomUUID(), ...data });
      await new Promise((resolve, reject) => {
        ws.onopen = resolve;
        ws.onerror = reject;
      });
      send({
        type: "device.status",
        eventId: crypto.randomUUID(),
        name: "Browser test adapter",
        hardware: "ready",
        actionContractVersion: 2, supportedActions: ["NOD","SHAKE","NOD_DOUBLE","TILT_LEFT","TILT_RIGHT","WAIT"],
        camera: "ready",
        jev: "ready",
        language: "ready",
        simulation: true,
      });
      setInterval(() => {
        if (ws.readyState === 1) send({ type: "ping" });
      }, 10000);
      ws.onmessage = async (event) => {
        const m = JSON.parse(event.data),
          d = window.device;
        if (m.type === "profile") {
          d.profile = m.profile;
          emit("profile.applied", { revision: m.profile.revision });
        }
        if (m.type === "command") {
          d.commands.push(m);
          if (m.command === "stop") {
            emit("command.result", {
              commandId: m.commandId,
              status: "stopped",
              detail: "Simulation stop confirmed",
            });
            return;
          }
          const id = crypto.randomUUID();
          emit("decision", {
            decisionId: id,
            profileRevision: d.profile.revision,
            actionId: m.actionId || "NOD",
            summary: "Synthetic QA decision",
          });
          emit("action", {
            decisionId: id,
            status: "completed",
            detail: "Simulation; no physical movement",
          });
          if (m.input) {
            emit("language.start", {
              messageId: id,
              role: "assistant",
              text: "",
            });
            emit("language.delta", {
              messageId: id,
              text: "Local streamed response: ",
            });
            setTimeout(() => {
              emit("language.delta", { messageId: id, text: m.input });
              emit("language.end", { messageId: id });
            }, 200);
          }
          emit("command.result", {
            commandId: m.commandId,
            status: "completed",
            detail: "Simulation finished",
          });
        }
        if (m.type === "signal" && m.kind === "offer") {
          const pc = new RTCPeerConnection({ iceServers: [] });
          d.peers.set(m.peerId, pc);
          const canvas = document.createElement("canvas");
          canvas.width = 640;
          canvas.height = 360;
          const ctx = canvas.getContext("2d");
          const timer = setInterval(() => {
            ctx.fillStyle = "#233b39";
            ctx.fillRect(0, 0, 640, 360);
            ctx.fillStyle = "#729e90";
            ctx.fillRect(230, 80, 110, 220);
            ctx.fillStyle = "#b8e4d3";
            ctx.font = "20px sans-serif";
            ctx.fillText("SYNTHETIC QA VIDEO", 20, 35);
          }, 50);
          pc.ondatachannel = (e) => {
            const ch = e.channel;
            ch.onopen = () => {
              const interval = setInterval(() => {
                if (ch.readyState === "open")
                  ch.send(
                    JSON.stringify({
                      type: "detections",
                      source: "synthetic QA",
                      boxes: [
                        {
                          id: "1",
                          label: "test target",
                          bbox: [230 / 640, 80 / 360, 110 / 640, 220 / 360],
                        },
                      ],
                    }),
                  );
                else clearInterval(interval);
              }, 100);
            };
          };
          pc.onicecandidate = (e) => {
            if (e.candidate)
              send({
                type: "signal",
                kind: "ice",
                peerId: m.peerId,
                candidate: e.candidate.toJSON(),
              });
          };
          pc.onconnectionstatechange = () => {
            if (["closed", "failed"].includes(pc.connectionState))
              clearInterval(timer);
          };
          await pc.setRemoteDescription({ type: "offer", sdp: m.sdp });
          for (const c of d.ice.get(m.peerId) || [])
            await pc.addIceCandidate(c);
          d.ice.delete(m.peerId);
          const stream = canvas.captureStream(15);
          for (const t of stream.getTracks()) pc.addTrack(t, stream);
          await pc.setLocalDescription(await pc.createAnswer());
          send({
            type: "signal",
            kind: "answer",
            peerId: m.peerId,
            sdp: pc.localDescription.sdp,
          });
        } else if (m.type === "signal" && m.kind === "ice") {
          const pc = d.peers.get(m.peerId);
          if (pc?.remoteDescription) await pc.addIceCandidate(m.candidate);
          else
            d.ice.set(m.peerId, [...(d.ice.get(m.peerId) || []), m.candidate]);
        } else if (m.type === "signal" && m.kind === "close") {
          d.peers.get(m.peerId)?.close();
          d.peers.delete(m.peerId);
        }
      };
    },
    { relay, key: keys.deviceKey },
  );
  await page.getByText("DEVICE ONLINE", { exact: true }).waitFor();
  await page.getByText("PROMPT v1", { exact: true }).waitFor();
  await page.getByRole("button", { name: "DEVICE LAB" }).click();
  await page.getByLabel("Debug form").selectOption("normal");
  await page
    .getByLabel("Form prompt for local JEV")
    .fill("Use a small nod when greeting.");
  await page.getByRole("button", { name: "Save & sync" }).click();
  await page
    .getByText("Applied by the local process.", { exact: true })
    .waitFor();
  assert.equal(
    await devicePage.evaluate(() => window.device.profile.prompt),
    "Use a small nod when greeting.",
  );
  await page.getByRole("button", { name: "Confirm nod", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Close", exact: true })
    .click();
  await page.waitForFunction(() =>
    ["normal_nod_confirm"].includes(
      window.__replica?.controller.rig?.animation,
    ),
  );
  await page.getByRole("button", { name: "Edit camera window" }).click();
  await page.getByLabel("Source type").selectOption("peer");
  await page.getByRole("button", { name: "Save settings", exact: true }).click();
  await page.getByRole("button", { name: "Start video" }).click();
  await page.locator(".live-camera.is-live").waitFor({ timeout: 25000 });
  await page.locator(".live-cv-box").waitFor();
  assert.equal(
    await page.locator(".live-camera video").evaluate((el) => el.videoWidth),
    640,
  );
  await page.screenshot({ path: ".pwc/live-connected-desktop.png" });
  await page.getByRole("tab", { name: "Large Language Model" }).click();
  await page
    .getByLabel("Message to local process")
    .fill("Hello from the website");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await page
    .getByText("Local streamed response: Hello from the website", {
      exact: true,
    })
    .waitFor();
  await page.getByRole("tab", { name: "Vision / Action" }).click();
  assert.equal(await page.locator(".live-cv-box").count(), 1);
  const commandsBefore = await devicePage.evaluate(
    () => window.device.commands.length,
  );
  await page.reload();
  await page.getByText("DEVICE ONLINE", { exact: true }).waitFor();
  assert.equal(
    await devicePage.evaluate(() => window.device.commands.length),
    commandsBefore,
  );
  assert.equal(await page.locator(".live-camera.is-live").count(), 0);
  await page.getByRole("tab", { name: "Large Language Model" }).click();
  await page
    .getByText("Local streamed response: Hello from the website", {
      exact: true,
    })
    .waitFor();
  await page.getByRole('button',{name:'Evolution settings',exact:true}).click();
  await devicePage.evaluate(() => window.device.ws.close());
  await page
    .getByRole("button", { name: "WAITING FOR DEVICE", exact: true })
    .waitFor();
  assert.equal(await page.locator('.evolution-node, .evolution-footer, [role="tablist"], .evolution-settings').count(), 0);
  assert.equal(await page.locator('video').count(), 0);
  for (const width of [900, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      `overflow at ${width}`,
    );
  }
  await page.getByRole("button", { name: "切换为中文", exact: true }).click();
  await page.getByText("等待电脑接入", { exact: true }).waitFor();
  await page.screenshot({ path: ".pwc/live-mobile.png" });
  assert.deepEqual(errors, []);
  console.log(
    "PASS: binding gate on desktop/mobile, invalid keys, bound-but-offline lock, offline dialog/video cleanup, connection, prompt sync, mapped animation, direct video/CV, LLM streaming, refresh without replay, offline controls, EN/ZH and 3 responsive widths.",
  );
} finally {
  await browser.close();
}
