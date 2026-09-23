import { DurableObject } from "cloudflare:workers";
import {
  initialRoom,
  updateProfile,
  applyDeviceEvent,
  makeCommand,
  validateSignal,
  parseKey,
  check,
  text,
} from "../shared/live-protocol.mjs";

const json = (data, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
const randomSecret = () =>
  [...crypto.getRandomValues(new Uint8Array(32))]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
const hash = async (value) =>
  [
    ...new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    ),
  ]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
const bearer = (request) =>
  request.headers.get("Authorization")?.replace(/^Bearer /, "") || "";
async function body(request) {
  const s = await request.text();
  check(s.length <= 96000, "Request too large");
  return JSON.parse(s);
}
function allowedOrigin(request, env) {
  const origin = request.headers.get("Origin");
  return (
    !origin ||
    (env.ALLOWED_ORIGINS || "")
      .split(",")
      .map((s) => s.trim())
      .includes(origin)
  );
}
export default {
  async fetch(request, env) {
    if (!allowedOrigin(request, env))
      return json({ error: "Origin not allowed" }, 403);
    const origin = request.headers.get("Origin");
    let result;
    try {
      const url = new URL(request.url),
        path = url.pathname;
      if (request.method === "OPTIONS")
        result = new Response(null, { status: 204 });
      else if (path === "/health")
        result = json({ service: "cowcoming-live", protocol: 1 });
      else if (path === "/v1/rooms" && request.method === "POST") {
        check(
          env.ADMIN_KEY?.length >= 32 &&
            (await hash(bearer(request))) === (await hash(env.ADMIN_KEY)),
          "Unauthorized",
        );
        const input = await body(request),
          roomId = crypto.randomUUID();
        result = await env.ROOMS.get(env.ROOMS.idFromName(roomId)).fetch(
          new Request("https://room/init", {
            method: "POST",
            body: JSON.stringify({ roomId, label: text(input.label, 100) }),
          }),
        );
      } else if (
        /^\/v1\/rooms\/[a-zA-Z0-9_-]+\/rotate$/.test(path) &&
        request.method === "POST"
      ) {
        check(
          env.ADMIN_KEY?.length >= 32 &&
            (await hash(bearer(request))) === (await hash(env.ADMIN_KEY)),
          "Unauthorized",
        );
        result = await env.ROOMS.get(
          env.ROOMS.idFromName(path.split("/")[3]),
        ).fetch(new Request("https://room/rotate", { method: "POST" }));
      } else if (path === "/v1/connect" && request.method === "POST") {
        const key = bearer(request);
        const { roomId } = parseKey(key);
        result = await env.ROOMS.get(env.ROOMS.idFromName(roomId)).fetch(
          new Request("https://room/ticket", {
            method: "POST",
            headers: { Authorization: `Bearer ${key}` },
          }),
        );
      } else if (
        /^\/v1\/socket\/[a-zA-Z0-9_-]+$/.test(path) &&
        request.headers.get("Upgrade")?.toLowerCase() === "websocket"
      ) {
        const roomId = path.split("/")[3];
        return env.ROOMS.get(env.ROOMS.idFromName(roomId)).fetch(
          new Request(
            `https://room/socket?ticket=${encodeURIComponent(url.searchParams.get("ticket") || "")}`,
            request,
          ),
        );
      } else result = json({ error: "Not found" }, 404);
    } catch (error) {
      result = json(
        {
          error:
            error.message === "Unauthorized"
              ? "Unauthorized"
              : "Invalid request or connection key",
        },
        error.message === "Unauthorized" ? 401 : 400,
      );
    }
    const headers = new Headers(result.headers);
    if (origin) {
      headers.set("Access-Control-Allow-Origin", origin);
      headers.set("Vary", "Origin");
    }
    headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Authorization,Content-Type");
    return new Response(result.body, { status: result.status, headers });
  },
};

export class DeviceRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.ctx = ctx;
    this.env = env;
    ctx.blockConcurrencyWhile(async () => {
      ctx.storage.sql.exec(
        "CREATE TABLE IF NOT EXISTS room_state (id INTEGER PRIMARY KEY, payload TEXT NOT NULL)",
      );
      const row = ctx.storage.sql
        .exec("SELECT payload FROM room_state WHERE id = 1")
        .toArray()[0];
      this.state = row
        ? JSON.parse(row.payload)
        : await ctx.storage.get("state");
      this.auth = await ctx.storage.get("auth");
    });
  }
  peers(role) {
    return this.ctx.getWebSockets().filter((ws) => {
      const a = ws.deserializeAttachment();
      return !a.closed && (!role || a.role === role);
    });
  }
  device() {
    return this.peers("device").find(
      (ws) => Date.now() - ws.deserializeAttachment().lastSeen < 30000,
    );
  }
  send(ws, data) {
    try {
      ws.send(JSON.stringify(data));
    } catch {
      /* Close handler reconciles presence. */
    }
  }
  snapshot(role = "browser") {
    if (role === "device")
      return {
        type: "snapshot",
        roomId: this.state.roomId,
        version: this.state.version,
        profile: this.state.profile,
        deviceOnline: Boolean(this.device()),
      };
    const { seen, commands, ...state } = this.state;
    return { type: "snapshot", ...state, deviceOnline: Boolean(this.device()) };
  }
  broadcast() {
    for (const ws of this.peers("browser")) this.send(ws, this.snapshot());
  }
  async persist() {
    this.ctx.storage.sql.exec(
      "INSERT INTO room_state (id, payload) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload",
      JSON.stringify(this.state),
    );
  }
  async rotate() {
    const result = { roomId: this.state.roomId, label: this.state.label };
    const hashes = {};
    for (const role of ["browser", "device"]) {
      const key = `cw1.${role}.${this.state.roomId}.${randomSecret()}`;
      result[`${role}Key`] = key;
      hashes[role] = await hash(key);
    }
    this.auth = { hashes, tickets: {} };
    await this.ctx.storage.put("auth", this.auth);
    for (const ws of this.peers()) {
      const a = ws.deserializeAttachment();
      ws.serializeAttachment({ ...a, closed: true });
      ws.close(4003, "Keys rotated");
    }
    this.state = this.offlineState();
    await this.persist();
    return json(result);
  }
  offlineState() {
    return {
      ...this.state,
      appliedRevision: null,
      version: this.state.version + 1,
      messages: this.state.messages.map((m) =>
        m.status === "streaming" ? { ...m, status: "interrupted" } : m,
      ),
    };
  }
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/init") {
      if (this.state) return json({ error: "Room exists" }, 409);
      const { roomId, label } = await body(request);
      this.state = initialRoom(roomId, label);
      return this.rotate();
    }
    if (!this.state) return json({ error: "Invalid connection key" }, 401);
    if (url.pathname === "/rotate") return this.rotate();
    if (url.pathname === "/ticket") {
      const key = bearer(request),
        parsed = parseKey(key);
      if (
        parsed.roomId !== this.state.roomId ||
        this.auth.hashes[parsed.role] !== (await hash(key))
      )
        return json({ error: "Invalid connection key" }, 401);
      const now = Date.now();
      this.auth.tickets = Object.fromEntries(
        Object.entries(this.auth.tickets).filter(([, v]) => v.expires > now),
      );
      if (Object.keys(this.auth.tickets).length >= 50)
        return json({ error: "Too many pending connections" }, 429);
      const ticket = randomSecret();
      this.auth.tickets[await hash(ticket)] = {
        role: parsed.role,
        expires: now + 30000,
      };
      await this.ctx.storage.put("auth", this.auth);
      return json({ roomId: this.state.roomId, ticket, expiresIn: 30 });
    }
    if (url.pathname !== "/socket") return json({ error: "Not found" }, 404);
    const tokenHash = await hash(url.searchParams.get("ticket") || "");
    const ticket = this.auth.tickets[tokenHash];
    if (!ticket || ticket.expires < Date.now())
      return json({ error: "Expired connection ticket" }, 401);
    delete this.auth.tickets[tokenHash];
    await this.ctx.storage.put("auth", this.auth);
    if (ticket.role === "device" && this.device())
      return json({ error: "Another device is already connected" }, 409);
    if (this.peers().length >= 12) return json({ error: "Room is full" }, 429);
    if (ticket.role === "device") {
      for (const ws of this.peers("device")) {
        ws.serializeAttachment({ ...ws.deserializeAttachment(), closed: true });
        ws.close(4001, "Stale device connection");
      }
      this.state = {
        ...this.offlineState(),
        device: initialRoom("", "").device,
      };
      await this.persist();
    }
    const [client, server] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server);
    const clientId = crypto.randomUUID();
    server.serializeAttachment({
      role: ticket.role,
      clientId,
      lastSeen: Date.now(),
      rateAt: Date.now(),
      rateCount: 0,
    });
    this.send(server, {
      type: "welcome",
      role: ticket.role,
      clientId,
      protocol: 1,
      heartbeatMs: 10000,
    });
    this.send(server, this.snapshot(ticket.role));
    if (ticket.role === "device")
      this.send(server, { type: "profile", profile: this.state.profile });
    this.broadcast();
    await this.ctx.storage.setAlarm(Date.now() + 15000);
    return new Response(null, { status: 101, webSocket: client });
  }
  async webSocketMessage(ws, message) {
    const a = ws.deserializeAttachment();
    if (a.closed) return;
    try {
      check(
        typeof message === "string" && message.length <= 96000,
        "Message must be JSON under 96 KB",
      );
      const now = Date.now();
      if (now - a.rateAt >= 1000) {
        a.rateAt = now;
        a.rateCount = 0;
      }
      check(++a.rateCount <= 80, "Message rate exceeded");
      a.lastSeen = now;
      ws.serializeAttachment(a);
      const m = JSON.parse(message);
      if (m.type === "ping") {
        this.send(ws, { type: "pong", at: now });
        return;
      }
      if (m.type === "signal") {
        const signal = validateSignal(m);
        if (a.role === "browser") {
          check(signal.peerId === a.clientId, "Peer identity mismatch");
          check(
            ["offer", "ice", "close"].includes(signal.kind),
            "Browser must offer",
          );
          const device = this.device();
          check(device, "Device offline");
          this.send(device, signal);
        } else {
          check(
            ["answer", "ice", "close"].includes(signal.kind),
            "Device must answer",
          );
          const target = this.peers("browser").find(
            (p) => p.deserializeAttachment().clientId === signal.peerId,
          );
          check(target, "Viewer has disconnected");
          this.send(target, signal);
        }
        return;
      }
      if (a.role === "browser") {
        if (m.type === "profile.update") {
          this.state = updateProfile(this.state, m);
          await this.persist();
          this.broadcast();
          const device = this.device();
          if (device)
            this.send(device, { type: "profile", profile: this.state.profile });
        } else if (m.type === "command") {
          const command = makeCommand(this.state, m, Boolean(this.device()));
          if (
            this.state.commands.some((c) => c.commandId === command.commandId)
          ) {
            this.send(ws, {
              type: "command.sent",
              commandId: command.commandId,
              duplicate: true,
            });
            return;
          }
          this.state = {
            ...this.state,
            commands: [
              ...this.state.commands,
              { commandId: command.commandId, expiresAt: command.expiresAt },
            ].slice(-200),
          };
          await this.persist();
          const device = this.device();
          check(device, "Device went offline; retry explicitly");
          this.send(device, command);
          this.send(ws, { type: "command.sent", commandId: command.commandId });
        } else throw new Error("Browser message not allowed");
      } else {
        check(this.device() === ws, "Device session expired");
        const next = applyDeviceEvent(this.state, m);
        if (next !== this.state) {
          this.state = next;
          await this.persist();
          this.broadcast();
          if (m.type === "decision")
            for (const viewer of this.peers("browser"))
              this.send(viewer, {
                type: "live.decision",
                decision: this.state.events.find(
                  (e) => e.eventId === m.eventId,
                ),
              });
        }
        this.send(ws, { type: "event.ack", eventId: m.eventId });
      }
    } catch (error) {
      this.send(ws, { type: "error", error: error.message });
    }
  }
  async closed(ws) {
    const a = ws.deserializeAttachment();
    if (a.closed) return;
    ws.serializeAttachment({ ...a, closed: true });
    if (a.role === "device") {
      this.state = this.offlineState();
      await this.persist();
      this.broadcast();
    } else {
      const device = this.device();
      if (device)
        this.send(device, {
          type: "signal",
          kind: "close",
          peerId: a.clientId,
        });
    }
  }
  async webSocketClose(ws, code) {
    ws.close(code === 1005 ? 1000 : code);
    await this.closed(ws);
  }
  async webSocketError(ws) {
    await this.closed(ws);
  }
  async alarm() {
    for (const ws of this.peers())
      if (Date.now() - ws.deserializeAttachment().lastSeen >= 30000) {
        await this.closed(ws);
        ws.close(4001, "Heartbeat expired");
      }
    if (this.peers().length)
      await this.ctx.storage.setAlarm(Date.now() + 15000);
  }
}
