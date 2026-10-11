# CLAUDE.md — working on yoKi

## Authority and attitude
- **The creator's latest message is the truth.** `docs/` is the working plan; rewrite it freely as decisions change. Rules in docs are recommendations.
- Don't flag every deviation or ask permission for creative calls. Decide, build, report in one line. Ask (AskUserQuestion) only when genuinely unsure.
- Content is intentionally **graphic and mature** (gore, horror, psychosis, death at maximum intensity; sensuality yes). The cast is **fictional, all adults 19+**. No explicit sex acts are depicted.
- The creator is on a limited plan: **document and plan before big work**, commit often, keep `docs/phases/p1-polish.md` progress ticked so any session can resume.
- Never touch `yoki-mythobiography-v2.0-final-vision-pack.zip` (the creator's backup).

## Tooling
- **Yarn only** (never npm/pnpm commands in instructions). Free/open-source only.
- `yarn dev` (:5173), `yarn build`, `yarn typecheck`, `yarn shots [times]` (needs dev server running).
- Visual QA must use the GPU: `tools/qa/shots.mjs` launches Chromium with `--use-gl=angle --use-angle=gl` + NVIDIA PRIME env. Always look at the PNGs after visual changes.
- Images: `tools/imagegen/run.sh tools/imagegen/prompts/<file>.json` (local RealVisXL, ~40 s/img on the RTX 5050). Blender 5.2 headless: `blender -b -P tools/blender/<script>.py`.

## Architecture in one breath
`content/film.ts` lists every scene (length in units) → `engine/director.ts` keeps one film clock `t` from Lenis scroll → each scene in `scenes/pN/*.tsx` exports a `SceneSpec`. A spec has the component, camera keys (world space, scene-local `u`) and look keys. `scenes/index.ts` stitches them into one camera track, look track and fog track. Scenes are always mounted; `SceneRoot` toggles visibility; `useSceneFrame` runs only near the scene. The light count is fixed (`engine/fx.ts` sceneLights pool + hemi + one sun), so shaders never recompile mid-film. `Stage` compiles everything during the loader. DOM overlays read `film.onAfterFrame`.

## Shader rules
No `pow()` of possibly negative bases; clamp `1 - dot()` before `pow`; guard `atan(0,0)`. A single NaN pixel blacks the frame through bloom. Debug with `tools/qa/nan*.mjs`.

## Where things are
- **Resume here:** `docs/phases/p1-polish.md` (Phase 01 punch list + progress), then `docs/00-action-plan.md`.
- How everything works (for the creator to learn): `docs/guides/05-how-it-was-built.md`. Update it when adding techniques.
- Status and next steps: `docs/00-action-plan.md`. Scene-level direction: `docs/phases/`. Creator identity markers: `docs/02-sigil-and-identity.md`.
