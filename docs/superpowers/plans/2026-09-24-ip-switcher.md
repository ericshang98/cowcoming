# Header IP Switcher Implementation Plan

**Goal:** Replace the second header CV icon with an IP chooser that switches the Home character and its interactions.

**Architecture:** All five IPs are available after Eric supplied the remaining three model archives during implementation. Actual existing animation clips are mapped per character; no walking, mouth shapes, flight or web effects are invented. A shared asset catalog and suspended resource probe load the target GLB and decode its audio before committing a switch. Failed or cancelled loads preserve the current character. Selection navigates to Home; Work evolution, World and About retain their own Niulai-specific behavior. Selection persists separately from evolution state. All four supplied rigs use audio-clock-driven interactions; Fengge reuses its tested nod/reflect pairing.

**Scope:** User explicitly requested this replacement and role selection. Continue directly in this task's isolated branch, updated from origin/main a1895f3. Use the repo's current product snapshot revision 204 and current user instruction. No other agent communication, device installation or production deployment.

- [x] Catalog + versioned runtime files + manifest/provenance; thumbnails and eight existing recordings.
- [x] Accessible header dialog, matching existing pale glass UI; active/loading/error/unavailable states, Escape/outside dismissal and focus restoration; both desktop and mobile.
- [x] Transactional model selection and Home labels, character-specific audio and animation, interruption/stop/mute/pause; preserve Niulai evolution state.
- [x] Unit checks for catalog and input rules, existing project test suite and production build.
- [x] Real browser checks: icon replacement, pending keeps old model, successful switch and click/L, failure/retry, all five options, reload persistence, mobile and bilingual UI, returning to Niulai and existing Work controls.
- [x] Inspect screenshots, write verification and remaining deployment state, commit and prepare reviewable branch.
