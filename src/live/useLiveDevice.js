import { useCallback, useEffect, useRef, useState } from "react";
import { completedEvolutionTurn } from "./evolution-turn.mjs";
import { parseKey, chooseAnimation } from "../../shared/live-protocol.mjs";

export function normalizeRelay(value) {
  const u = new URL(value);
  if (
    u.username ||
    u.password ||
    u.search ||
    u.hash ||
    (u.protocol !== "https:" &&
      !(
        u.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(u.hostname)
      ))
  )
    throw new Error("Use an HTTPS relay URL (HTTP is allowed on localhost).");
  return u.origin;
}
export default function useLiveDevice(controller, active) {
  const [status, setStatus] = useState("disconnected");
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState("");
  const [clientId, setClientId] = useState(null);
  const [lastAnimation, setLastAnimation] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const socket = useRef(null),
    generation = useRef(0),
    retry = useRef(null),
    heartbeat = useRef(null);
  const credentials = useRef(null),
    snapshotRef = useRef(null),
    signalListeners = useRef(new Set()),
    conversationCommands = useRef(new Map());
  const current = useRef({ controller, active });
  current.current = { controller, active };
  const stop = useCallback(() => {
    generation.current++;
    conversationCommands.current.clear();
    clearTimeout(retry.current);
    clearInterval(heartbeat.current);
    socket.current?.close();
    socket.current = null;
    setClientId(null);
  }, []);
  const disconnect = useCallback(() => {
    stop();
    credentials.current = null;
    setStatus("disconnected");
    setSnapshot(null);
    snapshotRef.current = null;
    setError("");
    setLastAnimation(null);
    setReceipt(null);
    try {
      sessionStorage.removeItem("cowcoming-live");
    } catch {
      /* storage may be disabled */
    }
    current.current.controller.queue.clear();
  }, [stop]);
  const send = useCallback((message) => {
    if (socket.current?.readyState !== WebSocket.OPEN) {
      setError("Connection unavailable. Reconnect before sending.");
      return false;
    }
    socket.current.send(JSON.stringify(message));
    return true;
  }, []);
  const connect = useCallback(
    async (relay, key, remember = true) => {
      stop();
      setError("");
      setSnapshot(null);
      snapshotRef.current = null;
      setReceipt(null);
      setLastAnimation(null);
      let base;
      try {
        base = normalizeRelay(relay);
        if (parseKey(key).role !== "browser")
          throw new Error(
            "Use the browser key here. The device key belongs in the local script.",
          );
      } catch (e) {
        setError(e.message);
        setStatus("disconnected");
        return;
      }
      credentials.current = { relay: base, key };
      try {
        if (remember)
          sessionStorage.setItem(
            "cowcoming-live",
            JSON.stringify(credentials.current),
          );
        else sessionStorage.removeItem("cowcoming-live");
      } catch {
        /* optional */
      }
      const gen = generation.current;
      let attempt = 0;
      async function open() {
        if (generation.current !== gen) return;
        setStatus(attempt ? "reconnecting" : "connecting");
        try {
          const response = await fetch(`${base}/v1/connect`, {
            method: "POST",
            headers: { Authorization: `Bearer ${key}` },
            signal: AbortSignal.timeout(10000),
          });
          if (generation.current !== gen) return;
          if (!response.ok) {
            if ([400, 401, 403].includes(response.status)) {
              setError(
                "Connection key rejected or this website is not allowed by the relay.",
              );
              setStatus("disconnected");
              return;
            }
            throw new Error(`Relay unavailable (${response.status})`);
          }
          const ticket = await response.json();
          if (generation.current !== gen) return;
          const url = new URL(`/v1/socket/${ticket.roomId}`, base);
          url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
          url.searchParams.set("ticket", ticket.ticket);
          const ws = new WebSocket(url);
          socket.current = ws;
          let lastMessage = Date.now();
          ws.onopen = () => {
            if (generation.current !== gen) return ws.close();
            attempt = 0;
            setStatus("connected");
            setError("");
            heartbeat.current = setInterval(() => {
              if (Date.now() - lastMessage > 30000) ws.close();
              else if (ws.readyState === WebSocket.OPEN)
                ws.send(JSON.stringify({ type: "ping" }));
            }, 10000);
          };
          ws.onmessage = (event) => {
            if (generation.current !== gen) return;
            lastMessage = Date.now();
            let m;
            try {
              m = JSON.parse(event.data);
            } catch {
              return;
            }
            if (m.type === "welcome") setClientId(m.clientId);
            if (m.type === "snapshot") {
              snapshotRef.current = m;
              setSnapshot(m);
              for (const [commandId, context] of conversationCommands.current) {
                const completion = completedEvolutionTurn(m, commandId, context);
                if (completion.terminal) conversationCommands.current.delete(commandId);
                if (completion.turn) current.current.controller.evolution?.recordTurn(completion.turn);
              }
            }
            if (m.type === "signal")
              for (const fn of signalListeners.current) fn(m);
            if (m.type === "error") setError(m.error);
            if (m.type === "command.sent")
              setReceipt({ commandId: m.commandId, status: "sent" });
            if (m.type === "live.decision" && current.current.active) {
              const profile = snapshotRef.current?.profile;
              if (profile?.revision === m.decision.profileRevision && (!current.current.controller.evolution || current.current.controller.evolution.deviceFormReady?.(profile.revision, profile.formId))) {
                const clip = chooseAnimation(
                  m.decision.actionId,
                  profile.animationMap,
                );
                if (clip) {
                  current.current.controller.gesture(clip);
                  setLastAnimation({
                    clip,
                    actionId: m.decision.actionId,
                    decisionId: m.decision.decisionId,
                  });
                }
              }
            }
          };
          ws.onerror = () => {
            /* close handles retry */
          };
          ws.onclose = (event) => {
            if (generation.current !== gen) return;
            clearInterval(heartbeat.current);
            setClientId(null);
            current.current.controller.queue.clear();
            if (event.code === 4003) {
              setError("Keys were revoked. Enter a new browser key.");
              setStatus("disconnected");
              return;
            }
            setStatus("reconnecting");
            setError(
              "Connection lost. Reconnecting; previous commands will not be replayed.",
            );
            retry.current = setTimeout(
              open,
              Math.min(10000, 1000 * 2 ** attempt++),
            );
          };
        } catch (e) {
          if (generation.current !== gen) return;
          setError(e.message);
          setStatus("reconnecting");
          retry.current = setTimeout(
            open,
            Math.min(10000, 1000 * 2 ** attempt++),
          );
        }
      }
      open();
    },
    [stop],
  );
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem("cowcoming-live"));
      if (saved?.relay && saved?.key) connect(saved.relay, saved.key);
    } catch {
      /* no saved connection */
    }
    return stop;
  }, [connect, stop]);
  const subscribeSignal = useCallback((fn) => {
    signalListeners.current.add(fn);
    return () => signalListeners.current.delete(fn);
  }, []);
  const command = useCallback(
    (data) => {
      setError("");
      const commandId = crypto.randomUUID();
      const profile = snapshotRef.current?.profile;
      const context = current.current.controller.evolution?.context();
      if (data.command === 'interact' && context?.formId === profile?.formId) {
        conversationCommands.current.set(commandId, { ...context, userText: data.input, profileRevision: profile.revision });
      }
      if (send({ type: "command", commandId, ...data }))
        setReceipt({ commandId, status: "sending" });
      else conversationCommands.current.delete(commandId);
    },
    [send],
  );
  const updateProfile = useCallback(
    (patch) => {
      setError("");
      return send({
        type: "profile.update",
        expectedRevision: snapshotRef.current?.profile.revision,
        ...patch,
      });
    },
    [send],
  );
  return {
    status,
    snapshot,
    error,
    clearError: () => setError(""),
    connect,
    disconnect,
    send,
    subscribeSignal,
    clientId,
    command,
    updateProfile,
    lastAnimation,
    receipt,
    online: status === "connected" && Boolean(snapshot?.deviceOnline),
    relay: credentials.current?.relay || "",
  };
}
