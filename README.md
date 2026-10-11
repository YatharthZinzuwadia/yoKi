<div align="center">

# yoKi

**A self made into a world.**

A single-take, first-person film you scroll through, across five phases of one life: the gaze he was born into, every extreme at once, the force he became, the people who marked him, and the mountain he climbed alone.

`18+ · violence · gore · sexuality · psychosis · death`

</div>

---

## Run it

```bash
yarn          # first time
yarn dev      # → http://localhost:5173   (Linux laptop: `prime-run firefox http://localhost:5173` for the NVIDIA GPU)
```

| Command | What |
|---|---|
| `yarn dev` | Dev server with hot reload |
| `yarn build` | Type-check + production build to `dist/` |
| `yarn preview` | Serve the production build on :4173 |
| `yarn typecheck` | TypeScript only |
| `yarn shots [t1,t2,…]` | Playwright screenshots along the take → `tools/qa/out/` |

**Debugging:**

| Add to the URL | Effect |
|---|---|
| `?debug` | FPS / film-time overlay |
| `?scene=p1.gallery` | Deep link to a scene |
| `?t=12.5` | Deep link to a film time |

**Keys:**

| Key | Action |
|---|---|
| `M` | Mute |
| `1`–`5` | Phases |
| `0` | Start |

## What's inside

| | |
|---|---|
| **Stack** | Vite 8 · React 19 · TypeScript 7 · three.js r186 · React Three Fiber 9 · drei · postprocessing · Lenis · zustand · Web Audio (procedural). All free/open source, Yarn only. |
| **Look** | "Painted cinema": real-time 3D through a Kuwahara paint pass, hand-drawn ink lines, paper and grain, per-scene grading along one continuous camera track. |
| **Sound** | On by default; fully procedural (no audio files); every beat still reads muted. |
| **Assets** | Procedural geometry, a local SDXL generator (`tools/imagegen`), scripted Blender (`tools/blender`), CC0 libraries. All logged in `public/CREDITS.md`. |

```
src/
  content/   film.ts (scenes + pacing) · copy.ts (all words) · looks.ts (grading schema)
  engine/    director (film clock) · scroll · tracks · quality · lights/fx · anchors
  gl/        Stage · CameraRig · PostFX + post/effects · materials/painted · parts/*
  scenes/    p1…p5 (one file per scene) · Placeholder · SceneRoot
  ui/        Loader · sigil/ · NavPill · Cursor · Overlays (statements, annotations, thresholds)
  audio/     engine · synth · cues
docs/        the plan: vision, sigil, cast, story spine, phases, art, UX, sound, tech, assets, guides
tools/       qa/ (screenshots, probes) · imagegen/ (local SDXL) · blender/
```

## Documentation

Start at **[`docs/README.md`](docs/README.md)**. Status and next steps are in **[`docs/00-action-plan.md`](docs/00-action-plan.md)**.

## Status

- **Built and playable:** Phase 01, *The Name*, with the loader, the sigil and every system. Phases 02–05 exist as traversable blockouts.
- **Next:** Phase 02, *The Many*.

---

<sub>© Yatharth Zinzuwadia (yoKi). All rights reserved. Third-party assets and their licences are listed in public/CREDITS.md.</sub>
