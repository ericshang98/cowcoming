# Fengge Model and Audio Preview Implementation Plan

> Execute inline in the existing isolated worktree. No cross-task communication, production deployment or device installation.

**Goal:** Load Eric's supplied Fengge GLB in the existing audition page, with real model clicking and L triggering animation plus existing audio.

**Architecture:** A separate Three.js stage loads the supplied self-contained GLB. Audio remains the playback clock; map tap to nod and signature to reflect, preserving original speech speed. Other character tabs retain their audio previews. Loading and failed states disable Fengge actions; retry reloads the asset. Stop, switching, page hide and audio failure cancel the animation. Idle returns after each interaction. This implements the already accepted model + action + voice composition, with a local preview before cloud deployment.

**Tech Stack:** Existing Three.js 0.183.0, native browser audio, Python asset preparation, Chrome / Playwright.

- [x] Inspect ZIP without executing supplied scripts. Read actual GLB JSON; verify embedded assets, bones, animations and archive hashes.
- [x] Add `prepare_fengge.py`: accept the user ZIP path, verify known GLB hash and copy runtime GLB plus installed Three.js browser modules and license to ignored local asset directories.
- [x] Add `model-stage.mjs`: load, frame and light model; raycast true model taps; use AnimationMixer with audio-clock-driven clip position; expose load/failure/retry states and diagnostics for browser verification.
- [x] Update `index.html`, `style.css`, `preview.mjs`: integrate Fengge stage and selection, keep other voice drafts working, gate inputs while loading, distinguish real preview from original audio-only state.
- [x] Verify in actual Chrome: mesh and texture rendering, head pose changes, audio and animation times agree, tap/L replacement, stop/mute/switch/pagehide, finished → idle, load failure/retry, mobile layout. Inspect captured model image.
- [x] Package a self-contained local preview, update model receipt and remaining limitations in documentation; commit own source changes only. Do not upload or announce a cloud URL before cloud storage has been configured and verified.

The source README refers to a separate growth console workflow; it is asset documentation, not an instruction to modify that console. Its validation reports are supporting evidence; current integration will receive independent browser verification. No mouth shapes, walking or finger articulation are claimed.
