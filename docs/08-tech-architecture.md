# 08 — Technical Architecture

## Stack (all free and open source; Yarn only)

| Layer | Choice | Why |
|---|---|---|
| Build | **Vite 8** + **TypeScript 7** | Instant dev server, static output, no SSR needed for a single cinematic page. |
| UI | **React 19** | The creator's home turf. The UI layer is tiny; React mostly hosts the canvas and overlays. |
| 3D | **three.js r186** via **React Three Fiber 9** + **drei 10** | The same stack as The Monolith Project. **WebGL2** for maximum compatibility (WebGPU is not yet universal on Linux/Firefox). |
| Post | **postprocessing 6** (pmndrs) | Merged effect passes, HDR half-float buffers, custom effects. |
| Scroll | **Lenis** | Normalises wheel, trackpad and touch across browsers. Driven from the R3F frame loop: one rAF for everything. |
| State | **zustand** | Tiny store; per-frame values travel through refs and subscriptions, never React re-renders. |
| Audio | **Web Audio API** (no library) | Procedural synthesis and buffers rendered at load. |
| Fonts | `@fontsource` (Fraunces variable, IBM Plex Mono, Tiro Devanagari Sanskrit) | Self-hosted, OFL. |
| QA | **Playwright** (Chromium headless) | Automated screenshots along the take for visual review. |
| Offline art tools | **Blender 5.2** (headless, Python), **local SDXL** (diffusers, RealVisXL V5.0) | Scripted asset generation on the creator's RTX 5050. See `09`. |

## Folder layout

```
src/
  main.tsx                 entry; fonts; mounts <App/>
  App.tsx                  loader → film; canvas + overlays
  content/                 ALL editable story data (no rendering code)
    film.ts                scenes, lengths, phase ids, source tags
    copy.ts                statements, annotations, counters, diagram data
    looks.ts               colour-grade/paint/ink keyframes along the take
  engine/
    director.ts            film time, phases, scene ranges, subscriptions
    scroll.ts              Lenis ↔ film time, jumps (fade-cut), keyboard
    track.ts               keyframe tracks (Catmull-Rom/Hermite, hidden cuts)
    math.ts                remap, smoothstep, damp, easing
    quality.ts             adaptive DPR and effect tiers
    preload.ts             asset manifest, progress, shader warm-up
  gl/
    Stage.tsx              <Canvas>, renderer config, camera rig, scenes, post
    CameraRig.tsx          camera from the track + pointer look + breathing
    post/                  PaintEffect, InkEffect, GradeEffect, FinishEffect
    materials/             shared shader chunks (paper, line glow, flesh…)
    parts/                 reusable 3D pieces (LightLine, Dust, Drips, Frame…)
  scenes/
    SceneRoot.tsx          visibility + local-progress wiring per scene
    p1/ … p5/              one component per scene (or group of scenes)
  ui/
    Loader.tsx             sigil draws with real progress; enter gesture
    sigil/                 sigil + wordmark SVG paths and state logic
    NavPill.tsx            collapsing nav
    Cursor.tsx             kada cursor
    Statements.tsx         first-person lines layer
    Annotations.tsx        3D-anchored callouts, counters, diagrams
    Threshold.tsx          phase emblem overlay (sigil states)
  audio/
    engine.ts              context, master chain, reverb, beds, one-shots
    synth.ts               offline buffer synthesis (KS pluck, noise, impacts…)
    cues.ts                cue sheet mapped to film time
  styles/                  tokens.css, base.css, ui.css
public/                    models/, textures/, images/, audio/ (generated or CC0)
tools/
  blender/                 Python scripts → GLB (figures, corpse pile, props)
  imagegen/                SDXL setup + prompt batches → public/images
  qa/                      Playwright screenshot runner
docs/                      the plan (this folder)
```

## Core model: one film, one clock

- **Film time `t`** is measured in *units*; one unit ≈ one viewport of scroll at default speed. `film.ts` lists every scene with a `length`, and the director computes `[start, end]` for each and the total.
- **Scroll → time:** Lenis smooths raw input. `t = (scrollY / maxScroll) × total`. The page is a tall empty track (`total × 100vh × speed`).
- **Per frame (single rAF via R3F):**
  1. `lenis.raf(time)`;
  2. the director computes `t`, velocity, phase and active scenes;
  3. the camera rig samples the track;
  4. scenes update (only active ones do work);
  5. post renders;
  6. overlays read the same `t` through a subscription and mutate DOM styles directly.
- **Scenes** are always mounted after loading and toggled with `visible`. Their `useFrame` returns early when inactive. This removes all mid-film mount, compile or upload hitches.
- **The camera track** is the concatenation of every scene's keyframes in world space: one continuous spline. A keyframe flagged `cut` makes a discontinuity (a hidden cut) that the scene must mask with a white-out, darkness or an occluder.
- **Look track** (`looks.ts`): grading, paint and ink parameters are keyframed the same way and interpolated continuously.

## No-hitch rules (the one-shot must be perfect)

1. **Everything loads before entry.** The loader's progress is real. During the loader:
   - textures are pre-uploaded (`initTexture`);
   - every material is compiled with `renderer.compileAsync` while all scenes are temporarily visible;
   - audio buffers are synthesised.
2. **No allocations in frame loops:** pre-allocated vectors and matrices only. No per-frame React state.
3. **Instancing everywhere** for repeats (eyes, crowds, grass, flies, bodies).
4. **Adaptive quality:**
   - Frame time is measured over rolling 1 s windows. Resolution scale steps down or up (0.5–1.0 × device pixel ratio capped at 2) with hysteresis.
   - The lowest tier drops the paint pass.
   - Never more than one quality change per 2 s.
5. **Fixed light count per scene**; shadow maps only for hero lights; shadow-map resolution follows the tier.
6. **Phase jumps from the nav** are editorial cuts (fade → jump → fade), so the camera never whips through unloaded or uncompiled space.
7. **Visibility hidden → pause** audio and render loop.

## The post chain (in order)

| Pass | Effects |
|---|---|
| 1 | `RenderPass` (half-float, **no MSAA**: MSAA + half-float + bloom produced black frames on the NVIDIA/ANGLE path) |
| 2 | `FXAA` + `Sanitize` (zeroes any NaN/Inf pixel with a bit-exact test, clamps HDR to 16) |
| 3 | `Paint` (rotated Kuwahara) + `Bloom` (mipmap blur) |
| 4 | `Ink` (depth + luminance edges, wobble) |
| 5 | `Grade` (exposure, ACES, contrast, saturation, lift, paper, vignette, veils, invert, CA, grain) |

## Shader safety rules (learned the hard way)

One NaN pixel, smeared by bloom, blacks out the entire frame. In every custom shader:
- Never `pow(x, y)` where x can be negative. Clamp first (`pow(clamp(1.0 - dot(n, v), 0.0, 1.0), k)`) or multiply it out (`x * x`).
- Guard `atan(y, x)` at (0,0) and `normalize()` of possibly-zero vectors.
- Never `smoothstep(a, b, x)` with `a == b`.
- Debug with `tools/qa/nan*.mjs` (bisects which mesh or pass breaks the frame).

## Performance budget (desktop, 1080p, mid-range laptop GPU)

| Item | Budget |
|---|---|
| Frame time | ≤ 12 ms GPU at tier 1 (headroom for 60 fps; 120 Hz where possible) |
| Draw calls | ≤ 250 per frame |
| Triangles visible | ≤ 1.5 M (corpse mountain uses instanced LODs + painted cards in the distance) |
| Textures | ≤ 350 MB GPU total; KTX2 / WebP |
| Initial payload | ~15–25 MB (models, images, fonts); audio is procedural (0 MB) |

## Compatibility

- WebGL2 + `EXT_color_buffer_half_float` (falls back to 8-bit buffers without it).
- Tested matrix:
  - Chrome/Edge, Firefox and Safari 17+;
  - Linux (creator's CachyOS + RTX 5050), Windows, macOS;
  - DPR 1/1.5/2; 720p → 5K; 60/120/144 Hz.
- Pointer: mouse, trackpad, touch. Keyboard scroll keys work natively.
- No WebGL2 → `<noscript>`-style fallback page with phase posters and text.

## QA

- `yarn shots`: Playwright opens the built site, enters, scrolls to each scene's key times and saves PNGs in `tools/qa/out/`. Every visual change is reviewed from these.
- The FPS overlay (`?debug`) shows frame time, tier, `t`, scene id and draw calls.
- `?t=12.5` deep-links to a film time; `?scene=p2.court` deep-links to a scene start. Both are for development.

## Deploy

A static build (`yarn build` → `dist/`) works on any free static host: Cloudflare Pages, Netlify or Vercel. See `docs/guides/04-deploy-free.md`.
