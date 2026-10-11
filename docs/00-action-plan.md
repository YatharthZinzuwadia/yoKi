# 00 — Action Plan

The single source for **what's done, what's next, and what (optionally) needs the creator**. It is updated at every milestone.

## Status at a glance

| Milestone | What | Status |
|---|---|---|
| **M0** | Doc pack v3 (this folder) · engine · loader/sigil/nav/cursor/text/sound systems · **Phase 01 playable** · Phases 02–05 as traversable blockouts · local image generator · QA tooling | ✅ done (2026-10-11) |
| **M1** | Phase 01 polish: anatomically better POV hands (CC0 MakeHuman/MPFB mesh), crowd silhouettes in the gallery, frame-to-doorway growth beat, sound pass, Firefox/Chrome perf check on the RTX and on the iGPU | ⏭ next |
| **M2** | **Phase 02 · The Many**: pop-up paper world, the three drawings (generated), guitar landscape + harmonium + Casio keys with playable plucks, the court with ball physics and dribble, the stage with Dharmesh and the Nataraja freeze, the first machine (beige PC, CRT globe zoom, code), the convergence vista, the thread sigil | planned |
| **M3** | **Phase 03 · The Law of Force**: night street with the Hanuman shrine, Ballers Club strobe time-slices, the wall of phones and three crisis doors, the graphic fight (blood physics), the ward (wall text, faces through membranes, the detaching shadow) | planned |
| **M4** | **Phase 04 · Love, Loyalty & the Cost of Staying**: cast figures (Noor, Mishti, Laali, Kshitij, the group, Her) generated as CC0 MakeHuman bodies with the creator's proportions; Noor's room and the send-off; **the Hunter 350 crash**; Mishti's long parallel; the terrace and Kshitij's decay; Laali and the bite; the Midsommar clearing; **the push and the fall** | planned |
| **M5** | **Phase 05 · The Quiet Throne**: the madness pit; the landing; what to carry; the cut (Gita 2.47, Krishna-blue light); **the corpse mountain** (Blender rigid-body pile of posed CC0 bodies → instanced GLB with LODs); the summit reveal with the out-of-body camera; the full sigil finale | planned |
| **M6** | Sound pass: per-scene beds and one-shots for 02–05, the generative score with the Phase 02 motif returning, the laugh | planned |
| **M7** | Hardening: compatibility matrix (Chrome/Edge/Firefox/Safari; Win/macOS/Linux; DPR 1–3; 720p–5K), reduced-motion variant, no-WebGL fallback page with phase posters, a performance budget pass | planned |
| **M8** | Mobile: portrait recompositions of key shots, a lighter paint pass, touch reactions | planned |
| **M9** | Deploy to a free static host + custom domain (optional) | planned |

The order is built for momentum. Each milestone ends with screenshots (`yarn shots`) the creator can look at, and a playable build.

## What exists right now (M0)

- **The whole take is traversable** from the loader to the summit. Built scenes render; unbuilt scenes are blockout stages that name themselves, so the pacing of the full film can already be felt.
- **Phase 01 (5 scenes)** is fully built:

  | Scene | What's in it |
  |---|---|
  | Cave | Filament, drips with sound, dust, three found objects with annotations |
  | Giant frame | Generated child portrait revealed by a light scan, the reflection, the flash white-out |
  | Gallery of the gaze | Flash-revealed generated photographs, 260 eyes opening in the walls, the photo counter |
  | House of frosted glass | Silhouette fight, the thrown plate shattering, the mother sliding down the wall, the height marks, the brother's hand |
  | The name | The kada hand writes `yoKi` in light; the kada sigil threshold |
- **Systems:**
  - film clock and scroll;
  - continuous camera track with hidden cuts;
  - look track;
  - painted-cinema post (sanitize → FXAA → Kuwahara paint + bloom → ink → grade with paper/grain/veils/CA);
  - fixed scene-light pool (no shader recompiles);
  - adaptive resolution;
  - shader warm-up during the loader;
  - procedural audio engine;
  - DOM statements and 3D-pinned annotations with counters;
  - sigil thresholds (all six states coded);
  - kada cursor;
  - collapsing nav pill;
  - debug HUD (`?debug`);
  - deep links (`?scene=p1.gallery`, `?t=12.5`).
- **Tooling:**
  - `yarn shots` (Playwright on the RTX 5050);
  - `tools/imagegen` (SDXL / RealVisXL V5.0, local);
  - `tools/qa/sigil-preview.mjs`.

## What the creator can give (all optional, none blocking)

Nothing is needed to keep building. These make it *more his* whenever he has 10 minutes (exact steps in `guides/03-edit-content.md`):

1. **Signature:** write `yoKi` 10 times on white paper and photograph it. It becomes the wordmark.
2. **His laugh:** 5–10 phone voice-memo takes in a quiet room, for the summit.
3. **Instrument notes:** one guitar pluck, one harmonium breath, one Casio note, as phone recordings for Phase 02.
4. **Takiya-kalaams:** one per phase, any language, shown under each phase sigil.
5. **Silhouette photos:** front and side, full body, in his usual dark clothes. The summit figure gets matched to his real build.
6. **Corrections to the cast or story:** edit `docs/03-cast.md` or `docs/phases/*`, or just tell Claude.

## What Claude gathers or generates without asking

- **Photographs and drawings:** local SDXL. The prompts live in `tools/imagegen/prompts/*.json`.
- **Human figures (cast, crowds, the dead):** MakeHuman/MPFB2 (CC0) via scripted Blender, plus posed rigid-body piles.
- **Environments, props and particles:** procedural in code.
- **Textures/HDRIs (if needed):** Poly Haven / ambientCG (CC0).
- **Sound:** procedural synthesis, plus Freesound CC0 where a real recording is irreplaceable.
- **Licences:** everything is logged in `public/CREDITS.md`.

## Definition of done (the bar)

- The creator watches it end to end and feels it's *his*.
- No visible hitch anywhere in the take at 60 fps on the RTX 5050. The iGPU is degraded but smooth.
- Each phase holds at least one frame that would stand next to The Monolith Project or Artisans d'Idées.
- Every scene still reads with sound off.
