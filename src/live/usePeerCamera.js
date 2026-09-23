import { useCallback, useEffect, useRef, useState } from "react";

// Media and detections never use the relay. Default ICE has no TURN relay.
export default function usePeerCamera(live) {
  const [stream, setStream] = useState(null),
    [status, setStatus] = useState("idle"),
    [error, setError] = useState("");
  const [detections, setDetections] = useState(null);
  const peer = useRef(null),
    timeout = useRef(null),
    pendingIce = useRef([]),
    generation = useRef(0);
  const latest = useRef(live);
  latest.current = live;
  const stop = useCallback((notify = true) => {
    generation.current++;
    clearTimeout(timeout.current);
    if (peer.current && notify && latest.current.clientId)
      latest.current.send({
        type: "signal",
        kind: "close",
        peerId: latest.current.clientId,
      });
    peer.current?.close();
    peer.current = null;
    pendingIce.current = [];
    setStream((previous) => {
      previous?.getTracks().forEach((t) => t.stop());
      return null;
    });
    setDetections(null);
    setStatus("idle");
  }, []);
  const start = useCallback(async () => {
    stop();
    setError("");
    if (!latest.current.online || !latest.current.clientId) {
      setError("Connect the local device first.");
      return;
    }
    if (!window.RTCPeerConnection) {
      setError("WebRTC is unavailable in this browser.");
      return;
    }
    const gen = generation.current;
    const pc = new RTCPeerConnection({ iceServers: [] });
    peer.current = pc;
    setStatus("connecting");
    pc.addTransceiver("video", { direction: "recvonly" });
    const channel = pc.createDataChannel("perception", {
      ordered: false,
      maxRetransmits: 0,
    });
    channel.onmessage = (event) => {
      if (
        generation.current !== gen ||
        typeof event.data !== "string" ||
        event.data.length > 20000
      )
        return;
      try {
        const d = JSON.parse(event.data);
        if (d.type !== "detections" || !Array.isArray(d.boxes)) return;
        const boxes = d.boxes
          .slice(0, 30)
          .filter(
            (b) =>
              Array.isArray(b.bbox) &&
              b.bbox.length === 4 &&
              b.bbox.every((n) => Number.isFinite(n) && n >= 0 && n <= 1),
          );
        setDetections({
          boxes,
          receivedAt: Date.now(),
          frameId: d.frameId,
          source:
            typeof d.source === "string" ? d.source.slice(0, 80) : "local CV",
        });
      } catch {
        /* malformed CV packet is discarded */
      }
    };
    pc.ontrack = (event) => {
      if (generation.current === gen)
        setStream(event.streams[0] || new MediaStream([event.track]));
    };
    pc.onconnectionstatechange = () => {
      if (generation.current !== gen) return;
      if (pc.connectionState === "connected") {
        clearTimeout(timeout.current);
        setStatus("live");
      }
      if (["failed", "disconnected"].includes(pc.connectionState)) {
        stop(false);
        setStatus("failed");
        setError(
          "Direct camera connection interrupted. Retry on the same network.",
        );
      }
    };
    pc.onicecandidate = (event) => {
      if (event.candidate && generation.current === gen)
        latest.current.send({
          type: "signal",
          kind: "ice",
          peerId: latest.current.clientId,
          candidate: event.candidate.toJSON(),
        });
    };
    timeout.current = setTimeout(() => {
      if (generation.current === gen) {
        stop();
        setStatus("failed");
        setError(
          "Direct camera connection timed out. Check the local camera process and use the same network. Video was not uploaded to the relay.",
        );
      }
    }, 20000);
    try {
      await pc.setLocalDescription(await pc.createOffer());
      if (generation.current === gen)
        latest.current.send({
          type: "signal",
          kind: "offer",
          peerId: latest.current.clientId,
          sdp: pc.localDescription.sdp,
        });
    } catch (e) {
      if (generation.current === gen) {
        stop();
        setError(e.message);
        setStatus("failed");
      }
    }
  }, [stop]);
  useEffect(
    () =>
      live.subscribeSignal(async (m) => {
        const pc = peer.current;
        if (!pc || m.peerId !== latest.current.clientId) return;
        try {
          if (m.kind === "answer") {
            await pc.setRemoteDescription({ type: "answer", sdp: m.sdp });
            for (const c of pendingIce.current) await pc.addIceCandidate(c);
            pendingIce.current = [];
          }
          if (m.kind === "ice") {
            if (pc.remoteDescription) await pc.addIceCandidate(m.candidate);
            else pendingIce.current.push(m.candidate);
          }
          if (m.kind === "close") {
            stop(false);
            setError("The local camera session ended.");
          }
        } catch (e) {
          stop();
          setError(e.message);
          setStatus("failed");
        }
      }),
    [live.subscribeSignal, stop],
  );
  useEffect(() => {
    if (!live.online || !live.clientId) stop(false);
  }, [live.online, live.clientId, stop]);
  useEffect(() => () => stop(), [stop]);
  return { stream, status, error, detections, start, stop };
}
