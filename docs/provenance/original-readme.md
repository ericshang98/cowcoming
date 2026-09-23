# FUCH interactive reproduction

Local reproduction of [fuch.ai](https://www.fuch.ai/), captured on 2026-09-22. The interface and scene controller are implemented in React + Three.js; the original public models, textures, HDR, portfolio illustrations and résumé PDF are served locally. Original application bundles are research inputs, not the implementation shipped here.

## Run

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:4178/ . For the production artifact:

```sh
npm run build
npm run preview
```

## Verification

```sh
npm test
npm run qa
```

Browser verification uses Playwright and an installed Google Chrome (`channel: 'chrome'`). Start the preview before running `qa`. Results and screenshots are in `.pwc/`.

## Implemented

- Staged loading screen, asset readiness, entrance animation, skip after interaction.
- Skinned robot and human models, retained source animation clips, material response and HDR lighting.
- Pointer gaze relative to the head’s screen position; separate damped head/neck/body rotation; horizontal dragging and release/cancel cleanup.
- Animation reactions, local likes, pause, tracking and sound toggles; device tilt/shake support where permitted.
- Home, work, about, contact, full project pages, image viewer, search and awards.
- Terminal with portfolio-grounded local answers and slash navigation; draggable, resizable, minimizable windows; living résumé and downloadable PDF.
- Branching contact questionnaire, validation, editable review and honest delivery failure when no backend is configured.
- IDEA52 landscape, animated instanced grass, WASD/arrows/Shift, camera drag, map fast travel, discovery persistence and 52 idea records (27 available).
- Desktop and 390px mobile layouts; history-backed routes and keyboard controls.

## Service boundary

Without `.env`, terminal answers come from the local portfolio archive. Contact messages are **not sent**; the user can copy a draft or open their email client. `.env.example` documents optional endpoints. No original private service is proxied. Likes and discoveries are stored locally and do not alter the source site.

## Fidelity status

See [REVIEW.md](original-review.md) for evidence and remaining differences. This is a working reproduction for review, not a claim of pixel-perfect or backend equivalence. The original IDEA52 WebGPU grass/postprocessing, live AI/service behavior, exact mobile sensor calibration and every randomized animation state are not identical.
