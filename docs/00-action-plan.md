# 00 — Action Plan

The single source for **what's done, what's next, and what (optionally) needs the creator**. It is updated at every milestone.

## Status at a glance

| Milestone | What | Status |
|---|---|---|
| **M0** | Doc pack v3 (this folder) · engine · loader/sigil/nav/cursor/text/sound systems · **Phase 01 playable** · Phases 02–05 as traversable blockouts · local image generator · QA tooling | ✅ done (2026-10-11) |
| **M1** | **Phase 01 polish to "locked"**: the 17-task punch list from the creator's first playthrough, in [`phases/p1-polish.md`](phases/p1-polish.md). Hands, entry transition, sigil likeness, cave art, gallery room, cabinet + physics, eyes v2, legible house, steamed mirror, infographics layer, sound, lock check. | ⏭ **in progress** |
| **M2** | **Phase 02 · The Many**: pop-up paper world, the three drawings (generated), guitar landscape + harmonium + Casio keys with playable plucks, the court with ball physics and dribble, the stage with Dharmesh and the Nataraja freeze, the first machine (beige PC, CRT globe zoom, code), the convergence vista, the thread sigil | planned |
| **M3** | **Phase 03 · The Law of Force**: night street with the Hanuman shrine, Ballers Club strobe time-slices, the wall of phones and three crisis doors, the graphic fight (blood physics), the ward (wall text, faces through membranes, the detaching shadow) | planned |
| **M4** | **Phase 04 · Love, Loyalty & the Cost of Staying**: cast figures (Sukki, Panditaein, Shivi, Kshitij, the group, Her) generated as CC0 MakeHuman bodies with the creator's proportions; Sukki's room and the send-off; **the Hunter 350 crash**; Panditaein's long parallel; the terrace and Kshitij's decay; Shivi and the bite; the Midsommar clearing; **the push and the fall** | planned |
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

The creator said (2026-10-12) recordings and photos come later. Until then everything is generated or sampled, and listed in the **placeholder register** (`09-assets-and-sourcing.md`, and `// PLACEHOLDER(creator):` comments in code). Already answered:
- **Wordmark:** keep `yoKi` with the capital K.
- **Body:** 5'9"–5'10", akhaada medium build, upright posture, slight belly, fair, classic Gujju look.
- **Names:** Sukki (Canada, Relationship A), Panditaein (2.5 years, Relationship B), Shivi (present).
- **The cast is fictional** and adult (19+).
- **Graphic content:** the crash and other violence and gore go to maximum intensity. The creator is willing to give more detail if asked.
- **His own site** for the loader/logo reference is **mithilamantra.com** (local source: `~/Desktop/work shi/mithilamakhana-frontend`).

## Decisions log
| Date | Decision |
|---|---|
| 2026-10-11 | v3 doc pack; one-shot POV film; graphic register; sound on; desktop first |
| 2026-10-12 | Renames; body description; kada on the right hand at every age; Phase 01 polished and locked before Phases 02–05 (shared systems may be built in parallel); mobile is Claude's call (after the Phase 01 lock); document-first workflow because of the creator's plan limits |

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
