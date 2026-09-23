import assert from "node:assert/strict";
import fs from "node:fs";
const base = process.env.TEST_RELAY_URL || "http://127.0.0.1:8794";
const admin =
  process.env.TEST_RELAY_ADMIN ||
  JSON.parse(fs.readFileSync(".pwc/live-admin.json")).key;
async function request(path, key, data) {
  return fetch(base + path, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: data ? JSON.stringify(data) : undefined,
  });
}
async function open(key) {
  const r = await request("/v1/connect", key);
  assert.equal(r.status, 200);
  const ticket = await r.json();
  const ws = new WebSocket(
    `${base.replace(/^http/, "ws")}/v1/socket/${ticket.roomId}?ticket=${ticket.ticket}`,
  );
  const messages = [],
    waiters = new Set();
  ws.addEventListener("message", (event) => {
    const m = JSON.parse(event.data);
    messages.push(m);
    for (const check of waiters) check();
  });
  const wait = (predicate, timeout = 5000) =>
    new Promise((resolve, reject) => {
      const check = () => {
        const index = messages.findIndex(predicate);
        if (index >= 0) {
          clearTimeout(timer);
          waiters.delete(check);
          resolve(messages.splice(index, 1)[0]);
        }
      };
      const timer = setTimeout(() => {
        waiters.delete(check);
        reject(new Error("Timed out waiting for relay message"));
      }, timeout);
      waiters.add(check);
      check();
    });
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  const welcome = await wait((m) => m.type === "welcome");
  return {
    ws,
    wait,
    welcome,
    send: (m) => ws.send(JSON.stringify(m)),
    messages,
    ticket,
  };
}
const clients = [];
try {
  assert.equal(
    (await request("/v1/rooms", "bad", { label: "No" })).status,
    401,
  );
  assert.equal(
    (
      await fetch(base + "/v1/connect", {
        method: "POST",
        headers: { Origin: "https://evil.invalid" },
      })
    ).status,
    403,
  );
  const roomResponse = await request("/v1/rooms", admin, {
    label: "Relay integration",
  });
  assert.equal(roomResponse.status, 200);
  const room = await roomResponse.json();
  assert.equal(
    (
      await request(
        "/v1/connect",
        room.browserKey.slice(0, -1) +
          (room.browserKey.endsWith("a") ? "b" : "a"),
      )
    ).status,
    401,
  );
  const browser = await open(room.browserKey);
  clients.push(browser);
  const device = await open(room.deviceKey);
  clients.push(device);
  await browser.wait((m) => m.type === "snapshot" && m.deviceOnline);
  const first = await device.wait((m) => m.type === "profile");
  assert.equal(first.profile.revision, 1);
  browser.send({ type: "command", command: "action", actionId: "NOD" });
  await browser.wait((m) => m.type === "error" && /profile/.test(m.error));
  device.send({ type: "profile.applied", eventId: "applied-1", revision: 1 });
  await browser.wait((m) => m.type === "snapshot" && m.appliedRevision === 1);
  browser.send({
    type: "profile.update",
    expectedRevision: 1,
    formId: "normal",
    prompt: "A quieter response",
  });
  const profile = await device.wait((m) => m.type === "profile");
  assert.equal(profile.profile.revision, 2);
  device.send({ type: "profile.applied", eventId: "applied-2", revision: 2 });
  await browser.wait((m) => m.type === "snapshot" && m.appliedRevision === 2);
  browser.send({
    type: "command",
    commandId: "test-command",
    command: "action",
    actionId: "NOD",
  });
  const command = await device.wait((m) => m.type === "command");
  assert.equal(command.profileRevision, 2);
  assert.ok(command.expiresAt > Date.now());
  device.send({
    type: "decision",
    eventId: "decision1",
    decisionId: "decision1",
    profileRevision: 2,
    actionId: "NOD",
    summary: "Integration decision",
  });
  await browser.wait((m) => m.type === "live.decision");
  device.send({
    type: "action",
    eventId: "action1",
    decisionId: "decision1",
    status: "completed",
    detail: "Test adapter result",
  });
  await browser.wait(
    (m) =>
      m.type === "snapshot" && m.events.some((e) => e.eventId === "action1"),
  );
  device.send({
    type: "language.start",
    eventId: "start1",
    messageId: "message1",
    role: "assistant",
    text: "",
  });
  device.send({
    type: "language.delta",
    eventId: "delta1",
    messageId: "message1",
    text: "streamed text",
  });
  device.send({ type: "language.end", eventId: "end1", messageId: "message1" });
  await browser.wait(
    (m) =>
      m.type === "snapshot" &&
      m.messages[0]?.status === "complete" &&
      m.messages[0].text === "streamed text",
  );
  browser.send({
    type: "signal",
    kind: "offer",
    peerId: browser.welcome.clientId,
    sdp: "v=0\r\n",
  });
  await device.wait((m) => m.type === "signal" && m.kind === "offer");
  device.send({
    type: "signal",
    kind: "answer",
    peerId: browser.welcome.clientId,
    sdp: "v=0\r\n",
  });
  await browser.wait((m) => m.type === "signal" && m.kind === "answer");
  device.send({
    type: "profile.update",
    expectedRevision: 2,
    prompt: "must reject",
  });
  await device.wait((m) => m.type === "error");
  browser.send({ type: "decision", eventId: "forged", actionId: "WAVE" });
  await browser.wait((m) => m.type === "error");
  device.ws.close();
  await browser.wait((m) => m.type === "snapshot" && !m.deviceOnline);
  browser.send({ type: "command", command: "action", actionId: "NOD" });
  await browser.wait((m) => m.type === "error" && /offline/.test(m.error));
  const newDevice = await open(room.deviceKey);
  clients.push(newDevice);
  assert.equal(
    (await newDevice.wait((m) => m.type === "profile")).profile.revision,
    2,
  );
  const snap = await browser.wait(
    (m) =>
      m.type === "snapshot" &&
      m.deviceOnline &&
      m.appliedRevision === null &&
      m.messages.some((message) => message.text === "streamed text"),
  );
  assert.equal(snap.messages[0].text, "streamed text");
  const rotate = await request(`/v1/rooms/${room.roomId}/rotate`, admin);
  assert.equal(rotate.status, 200);
  assert.equal((await request("/v1/connect", room.browserKey)).status, 401);
  console.log(
    "PASS: real Worker authentication, origin isolation, prompt acknowledgement, action/LLM sync, WebRTC signaling, role isolation, reconnect and key revocation.",
  );
} finally {
  for (const c of clients) c.ws.close();
}
