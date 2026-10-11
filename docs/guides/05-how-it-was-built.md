# Guide 05 — How yoKi is built (learn from it)

A walkthrough of every technique in the project, with the file to open for each. Read it top to bottom once, then use it as a map. The code itself is commented at the top of each file and wherever something non-obvious happens.

## 1. The big idea: a film clock instead of pages

A normal scroll site moves DOM sections. yoKi has **one number, `film.t`** (film time in "units"). Everything (camera, lights, colour grade, sound, text) is a function of `t`.

- `src/content/film.ts` lists every scene with a `length` in units. Their sum is the whole film (~194 units).
- `src/engine/scroll.ts` turns the page's scroll position (smoothed by **Lenis**) into `film.target`. The page is just a tall empty div (`#scroll-track`) so the browser's native scrollbar, keyboard and touch all work.
- `src/engine/director.ts` damps `film.t` toward `film.target` every frame and works out the current scene and phase.

**Why:** scrubbing backward plays the film in reverse for free, deep links (`?t=12.5`) are trivial, and nothing depends on wall-clock timing except idle life (drips, breathing).

## 2. One camera, one take

- Each scene file exports a `SceneSpec` with **camera keys**: `{ u, pos, at, fov, tension, cut }`, where `u` is time inside the scene.
- `src/scenes/index.ts` stitches all scenes' keys into **one global track**.
- `src/engine/track.ts` interpolates it with **cubic Hermite / Catmull-Rom** curves:
  - `tension: 1` makes the camera come to rest on a key (a "hold");
  - `cut: true` starts a new segment, which is a hidden cut the scene must mask (flash, darkness).
- `src/gl/CameraRig.tsx` samples the track every frame, then adds the "living" layer: a damped glance toward your mouse, sub-centimetre breathing, and shake from `fx.shake`. It also widens the FOV on narrow screens so the authored 16:9 framing survives.

## 3. Why nothing stutters

- **All scenes are mounted at load.** `SceneRoot` only toggles `.visible`. No mounting or loading mid-film.
- **Shaders compile during the loader.** `Warmup` in `src/gl/Stage.tsx` makes everything visible for one frame, uploads every texture (`gl.initTexture`) and calls `gl.compileAsync`.
- **The light count never changes.** three.js recompiles every shader when the number of lights changes. So there's a fixed **pool of 12 "scene lights"** (`src/engine/fx.ts`) that scenes fill each frame, plus one hemisphere and one sun. The pool is read by our own shader code in `src/gl/materials/painted.ts`.
- **Adaptive resolution.** `src/engine/quality.ts` watches frame time and lowers the pixel ratio before you'd feel a drop.

## 4. The "painted" look

1. **Materials** (`src/gl/materials/painted.ts`): three's `MeshStandardMaterial`, extended with `onBeforeCompile` to add:
   - our light pool;
   - soft toon banding (`bands`);
   - a rim light;
   - a procedural surface-detail term (noise bump, crevice darkening, colour variation, all in world space, so no UVs are needed).
2. **Post stack** (`src/gl/PostFX.tsx` + `src/gl/post/effects.ts`), in order:

   | Pass | What it does |
   |---|---|
   | **FXAA + Sanitize** | Anti-alias, then zero any NaN/Inf pixel. One bad pixel would otherwise turn the whole frame black through bloom; that was the gallery bug, see §8. |
   | **Paint** | A rotated 4-sector **Kuwahara filter**: each pixel takes the average of whichever neighbouring quadrant is least noisy, which turns detail into brush-like patches. The rotation follows a noise field so the "strokes" vary. |
   | **Bloom** | Mipmap bloom from `postprocessing`. |
   | **Ink** | Edge detection on **depth** (silhouettes) and **luminance** (painted edges), with noise wobble so lines look hand-drawn. |
   | **Grade** | Exposure, ACES tone-map, contrast, saturation, lift, paper texture, vignette, the left-eye blood veil, white/black veils, invert, chromatic aberration and film grain. |
3. **Looks per scene:** the same `SceneSpec` carries `look` keys (exposure, paint strength, ink colour…). They're stitched into one **look track** (`src/content/looks.ts`), so the grade glides between scenes like a colourist's grade across a single shot.

## 5. Phase 01 effects, one by one

| Effect | How | File |
|---|---|---|
| Cave tunnel | A tube swept along a Catmull-Rom curve, each ring's vertices pushed by 3D Perlin noise (fbm). The floor is flattened. Crevices darken via vertex colours. | `src/gl/parts/caveGeometry.ts` |
| The filament | A tube along a curve, with a shader that reveals it up to `uReveal` and puts a hot "head" at the tip. Scene lights follow the head, which is why the cave is lit by the line. | `src/gl/parts/Filament.tsx`, `src/scenes/p1/Cave.tsx` |
| Drips | Instanced spheres falling on a wall-clock loop, with ring ripples on landing and a spatialised drip sound when you're near. | `Cave.tsx` |
| Dust | Points that are only visible near scene lights (computed in the vertex shader), so dust exists only in beams. | `src/gl/parts/Dust.tsx` |
| Light-scan reveal of the portrait | A fragment shader shows the photo only left of `uScan`, with a bright bar at the scan line. | `src/scenes/p1/Frame.tsx` |
| Flash-lit gallery | Each flash is an exponential envelope `exp(-(u - at) * 7.5)` on a scene light. Because it's a function of `u` (not a timer), it plays the same backward. | `src/scenes/p1/Gallery.tsx` |
| The eyes | One instanced sphere mesh (260 instances). The fragment shader draws eyelid, sclera, veins, iris fibres, pupil and a wet highlight procedurally. A per-instance `aOpen` attribute opens the lids, and each instance `lookAt`s the camera. | `Gallery.tsx` |
| Shadow theatre on frosted glass | No 3D figures: the silhouettes are **signed-distance functions** (capsules) drawn in the pane's shader and blurred by distance, like shadows on frosted glass. The plate and shards are SDFs too. | `src/scenes/p1/House.tsx` |
| Height marks | Drawn into a 2D canvas (pencil lines and handwriting font), used as a texture. | `House.tsx` |
| Writing `yoKi` in light | The wordmark's SVG paths are sampled into 3D tubes. A draw-range reveals each stroke as the fingertip moves along it. | `src/scenes/p1/Name.tsx` |
| Text and annotations | DOM, not WebGL. Each annotation is pinned to a named 3D point (`setAnchor`) and projected to the screen every frame. | `src/ui/Overlays.tsx`, `src/engine/anchors.ts` |
| Entry transition | On click, CSS scales the sigil ×18 around its left eye (`transform-origin`) while `film.intro` runs 0→1 in 3 s. `CameraRig` offsets the camera back and up by `(1 − ease(intro))` and adds a black veil, so the 3D cave glides in behind the zoom. Scroll only unlocks at the end. | `src/ui/Loader.tsx`, `src/styles/app.css`, `src/gl/CameraRig.tsx` |
| Sigil | SVG paths with `pathLength=1`, so "draw 0→1" is just `stroke-dashoffset`. Glow is a duplicated, blurred layer. | `src/ui/sigil/` |
| Sound | Everything is synthesised once at entry into buffers (Karplus-Strong plucks, filtered noise winds, impulse-response reverb), then played by scroll position. | `src/audio/synth.ts`, `src/audio/engine.ts`, `src/audio/cues.ts` |

## 6. Making images locally (no money, no cloud)

- `tools/imagegen/` runs **RealVisXL V5.0** (a Stable Diffusion XL model) with Hugging Face `diffusers` on your RTX 5050.
- `setup.sh` creates a private Python 3.12 + CUDA PyTorch environment with `uv` and downloads the model (~13 GB, once).
- Prompts are JSON (`tools/imagegen/prompts/p1.json`). Run `tools/imagegen/run.sh tools/imagegen/prompts/p1.json`. Each image takes ~40 s and is written to `public/images/<name>.webp`, and `public/CREDITS.md` gets a line with the prompt, seed and licence.
- `enable_model_cpu_offload()` keeps the 8 GB card from running out of memory by moving model parts to the GPU only when needed.

## 7. Seeing what you built (visual QA)

- `yarn shots 2,9.5,17.6` uses **Playwright** to open the site in Chromium on your NVIDIA GPU (`--use-angle=gl` + PRIME env vars), click enter, seek to each film time, and save PNGs to `tools/qa/out/`. It prints the renderer and fps.
- `?debug` shows frame time, quality tier, film time and the scene id.
- `?scene=p1.gallery` or `?t=17.6` jumps anywhere.

## 8. A real bug, start to finish (learn the method)

- **Symptom:** the gallery rendered pure black, even at flash peaks.
- **Bisect:**
  1. Hiding all meshes made the frame white (veil), so the meshes were involved.
  2. Disabling the paint+bloom pass fixed it.
  3. Hiding mesh groups one at a time pointed to the eye shader.
- **Cause:** `atan(p.y, p.x)` at the exact centre of the eye sphere gave NaN on this driver. **Bloom blurs the NaN across the whole image**, so one pixel blacked the frame.
- **Fixes:**
  - guard the math (`atan(y, x + 1e-4)`);
  - add a **Sanitize** pass that zeroes NaN before bloom;
  - drop MSAA on half-float targets in favour of FXAA, which was flaky on this driver too.

The probe scripts are kept in `tools/qa/nan*.mjs`.

## 8b. Another real bug: the chamber that "popped"

- **Symptom:** walking out of the cave, the frame and chamber appeared all at once.
- **Cause:** the tunnel ends *inside* the chamber's dome, but the dome was a closed, double-sided shell. From inside the tunnel you were looking at the dome's outside, a black wall, until the camera crossed it.
- **Fix:** `domeGeometry({ mouth })` skips the triangles facing the tunnel (`src/gl/parts/caveGeometry.ts`). The frame's lights now also fade in on `u` instead of switching on at the scene's visibility margin.
- **Method:** `tools/qa/peek.mjs <t> <exposure>` screenshots a moment with forced exposure. If even +3 EV shows nothing, something is *occluding*, not under-lit.

## 9. Blender (coming with P1-01 / P1-11)

Blender will run **headless from scripts** (`blender -b -P tools/blender/<script>.py`): create figures (MakeHuman / MPFB2, CC0), pose them, and export `.glb` to `public/models/`. Each script will get a section here explaining it line by line. If you want to try Blender by hand, start with `docs/guides/02-blender-from-zero.md`.
