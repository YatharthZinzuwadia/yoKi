# Blender scripts (headless)

Everything here runs **without opening Blender's window**: `blender -b` (background) runs a Python script `-P` that builds, poses and exports assets into `public/models/`. You never have to learn the UI to rebuild an asset, though you can open any `.glb` in Blender (File → Import → glTF) to look at it.

## One-time setup (already done on this machine)

1. Blender 5.2 is installed system-wide (`/usr/bin/blender`).
2. **MPFB2** (MakeHuman for Blender, free) was installed as a Blender extension:
   Blender → Edit → Preferences → **Get Extensions** → search "MPFB" → Install.
   It lives in `~/.config/blender/5.2/extensions/user_default/mpfb/`. Its **assets** (bodies, skeletons, skins) are **CC0**, so anything we export is ours to use. The MPFB code is GPL, but we only *run* it; we never ship it.

## Scripts

| Script | What it does | Run |
|---|---|---|
| `make_body.py` | Builds a rigged human from a JSON preset. MakeHuman "macro" sliders (age, weight, muscle, height, ethnicity) plus extra shape targets (e.g. a little belly). Fits the 53-bone `game_engine` skeleton to that body, bakes it, and exports `.glb`. With `"part": "arm_r"` it keeps only the right arm (for POV shots) and subdivides it for close-ups. | `blender -b -P tools/blender/make_body.py -- tools/blender/presets/arm-adult.json` |
| `preview.py` | Renders front / three-quarter / side turnarounds of any `.glb` with Eevee, so proportions can be checked as PNGs. | `blender -b -P tools/blender/preview.py -- public/models/yoki-body.glb tools/qa/out/body` |

## Presets → outputs

| Preset | Who | Output |
|---|---|---|
| `presets/yoki.json` | yoKi today: 5'9"–5'10", akhaada desi medium build, upright, slight belly, fair | `public/models/yoki-body.glb` |
| `presets/arm-adult.json` | His right arm, present day (kada attached in code) | `public/models/arm-adult.glb` |
| `presets/arm-teen.json` | Age 14–15 (writes `yoKi` on the mirror) | `public/models/arm-teen.glb` |
| `presets/arm-child.json` | Age 7–12 (the house) | `public/models/arm-child.glb` |
| `presets/arm-baby.json` | His younger brother's hand | `public/models/arm-baby.glb` |

**To change a body:** edit the preset's numbers (e.g. `"weight": 0.72 → 0.8`), re-run the command, reload the page. Each preset's `comment` says who it is.

## How the arm gets into the film (three.js side)

- `src/gl/parts/arm.ts` loads the `.glb`, finds bones by name (`hand_r`, `index_01_r`, …) and poses fingers by rotating those bones.
- Every arm gets the **kada** (a steel torus) parented to the wrist bone.
- A **2-bone IK** solver (shoulder → elbow → wrist) puts the hand exactly where a scene asks, e.g. the fingertip on the mirror stroke.
- Try it on its own: `http://localhost:5173/?lab=arm`.

## Planned scripts

- `cast.py`: Sukki, Panditaein, Shivi, Kshitij, the group, from the descriptions in `docs/03-cast.md`.
- `pile.py`: a rigid-body physics pile of posed bodies → the Phase 05 mountain (instancing-ready GLB + LODs).
- `props.py`: Hunter 350, beige PC/CRT, guitar, harmonium.
