# Cowcoming live device implementation plan

**Goal:** Make the existing WORK page a keyed, live hardware development surface without a packaged desktop app.

**Architecture:** One Cloudflare Durable Object per device room owns desired form/prompt configuration and relays authenticated JSON. A local Python adapter owns JEV, physical execution, CV and language generation. WebRTC carries camera video and detection metadata directly between the adapter and browser; the relay only exchanges SDP/ICE signaling. Automatic evolution stays disabled until Eric defines its rules.

**Tech stack:** Existing React/Three.js, Workers/Durable Objects, WebSocket, browser WebRTC, Python aiohttp/aiortc/OpenCV.

Implementation is performed inline in this isolated worktree; no other agents or sessions are contacted.

- [x] Protocol and meaningful tests: scoped keys, bounded/validated messages, desired/applied profile revisions, event deduplication, decision-to-animation selection, command expiry and offline rejection.
- [x] Relay: admin room creation/key rotation, one-use socket tickets, origin enforcement, single device writer, persisted snapshots, heartbeat expiry and routed peer signaling.
- [x] Website: key entry, connection/retry/disconnect, synchronized form state, prompt/action debugging, CV video and overlay, streaming language panel, truthful state and mobile layout.
- [x] Local adapter: runnable simulation, real webcam/CV optional mode, extensible hardware/JEV/LLM hooks, profile acknowledgement, expiring commands, WebRTC answerer and text streaming.
- [x] Verification: Node protocol tests, real local Worker integration, browser-to-browser WebRTC and UI tests, Python syntax/adapter tests, existing tests and production build.
- [x] Delivery: complete protocol/deployment/partner guide, record evidence and unverified physical hardware boundary, commit and prepare PR. Production deployment depends on the existing account credentials and publication authorization; no app installation.

Acceptance: a created room supplies separate device/browser keys; valid clients see the same state, unauthorized clients cannot write; editing a prompt yields an acknowledged revision; a local decision animates only its mapping; camera frames/detections never enter relay messages; device text streams into the language tab; disconnect does not replay old decisions or commands.

Verification evidence: 44 Node checks; 4 Python checks; isolated Worker integration; browser synthetic WebRTC/CV; shipped Python aiortc synthetic video, text and stop end-to-end; Vite production build. Deployment credentials remain external and unconfigured. No physical hardware or real camera was activated.
