# IP motion and compact avatar picker implementation

> Execute inline with executing-plans; user directly requests the changes and has authorized the existing feature's merge and website release. Do not contact other tasks.

**Goal:** Make left-click / L visibly distinct full-body skeletal reactions, and replace the large IP dialog with a small anchored row of actual round character portraits.
**Architecture:** Author normalized-time clips against each supplied skeleton's bind pose in a separate motion module. Sample from the existing audio clock, blend interrupted poses back to idle, and retain the source GLBs. Render portraits from the actual models. A nonmodal anchored dialog preserves loading/error/cancel/focus behavior without dimming the page.
**Tech Stack:** React, Three.js AnimationClip / quaternion tracks, native dialog, Playwright.

- [x] Inspect each skeleton and existing motion amplitude; document the small preset motion as root cause.
- [x] `src/scene/ip-motion.mjs`: author tap/signature tracks for Spine, Chest, head and appropriate arms/wings/tail. All tracks start/end at bind pose, use smooth ease and character-specific timing. Spider tap adds a brief web strand from wrist; signature prepares, lifts and lands the crouched body. Nailong uses head/body counter-motion and two-handed celebration. Fengge nods with chest, then opens both hands. Dragon probes and unfolds/flaps wings with tail follow-through.
- [x] `src/scene/Character.jsx`: use authored clips only for new IPs, preserve Niulai actions, synchronize with voice, fade to rest on stop. Verify actual projected skeleton and rendered pose movement, not just an animation name.
- [x] Render actual GLBs into head portraits under `public/characters/avatars/`, including Niulai; point catalog thumbnails to portraits.
- [x] `IpSwitcher.jsx` / CSS: small horizontal row of circular portraits below triggering icon, compact names, selected ring, spinner, concise error/retry, keyboard/Escape/outside click; viewport-safe on 320px mobile. No large heading, body descriptions, backdrop blur.
- [x] Update `scripts/ip-switcher-qa.cjs` for compact dialog, real image loading, anchoring, interactions and interruption; add useful motion validation for endpoint continuity and actual skeletal displacement. Visually inspect beginning/peak/settle for all eight actions on desktop and mobile.
- [ ] Run Node tests, production build and browser checks; update docs, commit, PR/merge and deploy via existing Pages flow; verify live commit, assets and browser behavior.
