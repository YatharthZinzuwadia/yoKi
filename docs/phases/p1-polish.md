# Phase 01 — Polish plan (v2) · the punch list to "locked"

> **Read this first when resuming.** This is the definitive Phase 01 design and task list after the creator's first playthrough (2026-10-12). Where it conflicts with `p1-the-name.md`, **this file wins**.
> **Order of work:** Phase 01 gets polished until the creator says it's locked. Reusable systems built here (hands, figures, eyes, infographics, room kit, physics) are what Phases 02–05 will be built from. Other phases only get parallel work when a shared system needs it.

## 0. Creator feedback (2026-10-12), condensed

| Area | Verdict |
|---|---|
| Loader | Subtle and good. The sigil **doesn't look like him** yet, but the direction is right. Wants subtle life: fingers curling the moustache, a professional idle movement. |
| Entry | **Abrupt.** One click and you're in the cave. Needs a smooth transition. |
| Cave | **Illumination loved.** Drips and their sounds loved. Rock looks **bland, over-textured, unpolished, shiny**; needs refinement and more elements. The sandal, crayon and tooth feel **random and don't resonate**. |
| Cave → frame | Frame **pops up suddenly** while the scroll still rolls. |
| First frame | The anchor should be the **modelling** photo, not Colgate (Colgate moves to the wall showcase). The surroundings are **too blank and black**: show something. |
| Frame → gallery | The flash white-out feels **forced, a novice transition**. Concept fine, execution lacking. |
| Gallery room | Wall, floor and ceiling look **disconnected**, "what a base model thinks a wall is, not a room". Needs definition. |
| Gallery photos | The snap and progression need refining and smoothing. **Add a cabinet holding medals, certificates and trophies** ("maegiri"), with movement and physics. "Smile. Again. Bigger." is good. |
| Eyes | **Loved**: they match what he has felt ("Somebody's Watching Me" vibe). But **buggy and identical**, one eye copy-pasted. Wants variety: different animated eyes, anime eyes, etc. |
| House | **Didn't understand what it's trying to say.** Sounds and visuals don't make sense; morbid but not conveying anything. |
| "Be the elder" | Needs refinement. **Remove "doctor?"**: he's an engineer, and his brother studies commerce / CA. |
| The name | **Most buggy**: camera all over the place, unclear what's happening. The chapter end is okay-ish: smooth but unpolished. |
| Everywhere | **Text and infographics are too scarce.** Add them wherever feasible. |
| Hands | Procedural hands must be replaced. **The kada is on the right hand everywhere, at every age.** |

## 1. Task list (in order)

Priority: **A** = blocks "locked", **B** = big quality jump, **C** = finish.

### P1-01 · Real hands with the kada (A, shared system)
- **Problem:** procedural capsule hands look like a mannequin.
- **Solution:** a rigged, anatomically correct hand mesh, posed per beat (child scale and adult scale), with the kada attached to the wrist bone. Skin: fair Gujju tone, subsurface-ish wrap lighting, knuckle creases and nails via the painted material's detail term.
- **Source:**
  - first choice: the **WebXR generic hand** GLB from `@webxr-input-profiles/assets` (MIT, 25-joint rig matching the WebXR spec, so finger poses are just joint rotations);
  - fallback: an **MPFB2/MakeHuman** (CC0) hand exported via Blender headless.
- **Files:** replace `src/gl/parts/hand.ts` with `src/gl/parts/hand/` (`loadHand.ts`, `poses.ts` for named poses: relaxed, point, write, grip, fist, pinch, twirl).
- **Done when:** a close-up hand screenshot reads as a real hand, and the kada is visible in every Phase 01 hand shot.

### P1-02 · Entry transition: through the sigil's eye (A)
- **Problem:** click → instantly in the cave.
- **Solution:** a 2.8 s auto sequence on click, with scroll locked during it.
  1. **0–0.6 s:** the wordmark and prompt fade. The sigil's moustache-twirl idle completes one last curl. Sound swells.
  2. **0.4–1.6 s:** the sigil scales toward the viewer around its **left eye** (CSS transform-origin at the eye). Its strokes thin and brighten.
  3. **1.2–2.2 s:** the contour **unravels into one filament** (stroke-dash shrink plus a morph to a vertical line) that drops down the screen.
  4. **1.6–2.8 s:** the canvas fades in from black, and the camera pre-rolls from 2 m above and behind the cave mouth, settling into the first cave key. The DOM filament hands over to the 3D filament at the same screen position.
- **Files:** `src/ui/Loader.tsx` (intro timeline), `src/gl/CameraRig.tsx` (an `intro` offset blended into the track), `src/engine/director.ts` (`film.intro` 0..1).
- **Done when:** recorded at 60 fps there is no jump, and the filament looks like one object across DOM → WebGL.

### P1-03 · Sigil likeness and idle life (A)
- **Problem:** it doesn't look like him.
- **Solution:**
  1. Generate 4–6 reference portraits with `tools/imagegen`: a fair Gujarati man, 29, akhaada medium build, upright posture, slight belly, Rajwadi upturned moustache, full beard, three-quarter view, right hand twirling the moustache, kada on the right wrist, black thread with a capsule tabeez, plain background.
  2. Trace the best one: `potrace` / edge detection → simplify → hand-clean into the same monoline part structure (`contour`, `kada`, `thread`, `capsule`, `scar`, `bite`, `moustache`, `beard`, `moon`).
  3. **Idle:** a 4 s loop where the index finger and thumb roll the moustache tip (two path keyframes with identical command structure, number-interpolated), a 0.5% breathing scale and an occasional slow blink.
  4. Also show the creator 2–3 candidates and let him pick.
- **Files:** `src/ui/sigil/paths.ts` (+ `paths.idle.ts` keyframe B), `src/ui/sigil/Sigil.tsx` (morph), `tools/sigil/trace.sh` (documented pipeline).

### P1-04 · Cave v2: cave art and refined stone (A)
- **Keep:** the filament, the illumination, the drips and their sounds.
- **Stone:**
  - Replace the noisy shiny look with CC0 PBR rock (ambientCG / Poly Haven), **triplanar-mapped** in the painted material, roughness 0.85–0.95.
  - Wetness only in streaks under drip points (a vertex-colour mask).
  - Lower the bump frequency and add **strata bands**.
  - Add stalagmites and flowstone, a shallow **puddle** with a mirror reflection (reflector plane), and fine roots in the ceiling cracks.
- **Replace the random objects with cave paintings.** Ochre and charcoal pictographs on the walls (Lascaux / Bhimbetka style; Bhimbetka is Indian, a fitting ancestor for a mythobiography), revealed by the filament as you pass. Each one tells the earliest myth of him:

  | # | Pictograph | Catalogue label |
  |---|---|---|
  | I | A mother holding an infant inside a ring of rays | `pictograph I — born` |
  | II | A small figure ringed by many eyes | `pictograph II — the gaze` |
  | III | A figure with an enormous smile and a box-camera with rays | `pictograph III — the smile` |
  | IV | Four figures (two tall, two small), a jagged line between the tall ones | `pictograph IV — home` |
  | V | A child's right-hand stencil in red ochre, with a **ring gap at the wrist** (the kada) | `pictograph V — mark` (the signature) |

  - **Annotation style:** archaeological catalogue (`pictograph II — the gaze · ochre on limestone · est. age: 1990s`).
  - **Build:** SVG pictographs → canvas textures → `DecalGeometry` (three/examples) projected onto the tunnel, revealed by distance to the filament head (shader mask), with a slight paint bleed into the stone.
- **More text:** the age ruler starts here (`age 0`), and a first statement before the paintings.
- **Files:** `src/scenes/p1/Cave.tsx`, `src/gl/parts/caveArt.ts` (new), `src/gl/materials/painted.ts` (triplanar map support).

### P1-05 · Cave → chamber with no pop (A)
- **Cause:** the frame scene's lights and photo snap on at its `useSceneFrame` margin (−1.25 u) while its geometry is already visible from −3.5 u; the cold key light jumps from 0 to 1.2.
- **Fix:**
  - Fade every frame-scene light in over `u ∈ [−3.5, 0]`, and match the `useSceneFrame` margin to the `SceneRoot` margin.
  - Start the frame as a **back-lit silhouette** far down the tunnel, so it's visible early.
  - Smooth the camera tilt (no roll). The last cave keys should look along the filament, not up.
- **Rule for every scene from now on:** nothing may change state at a visibility margin. Everything fades on `u`.

### P1-06 · The first frame: the modelling portrait, plus a studio (A)
- **Anchor image:** the **child modelling portfolio** photo (studio, navy blazer). The Colgate "best smile" print ad moves to the gallery wall.
- **Chamber dressing:**
  - film **contact sheets and negative strips** hanging from the dark like laundry, back-lit;
  - a **studio light stand with softbox**, a seamless **backdrop paper roll** sweeping down behind the frame, an apple box and an empty director's chair;
  - Polaroids scattered on the floor;
  - a "model release" form on a clipboard (annotation `signed by: guardian`).
- **More text:**
  - `fig. 1 — portfolio · age 9`
  - `f/8 · 1/125 · flash`
  - `retakes: 14`
  - A contact-sheet grease-pencil circle around the chosen frame.

### P1-07 · Frame → gallery: walk through the photograph (A)
- **Replace the white-out cut with a continuous move.** The gallery is moved **physically behind the frame**.
- **The move:**
  1. The portrait is printed on a **back-lit scrim**.
  2. A flash fires behind it, and the scrim turns translucent: we see the gallery through the child.
  3. The scrim lifts like a theatre curtain, rolling up into the top bar.
  4. The camera walks through the frame opening into the gallery without a cut.
- **World change:** re-base `GALLERY`/`HOUSE`/`GLASS` to start at z ≈ −66. All later scene keys become relative to a phase origin (`P1_ORIGIN` in `world.ts`), so layout changes never break cameras again.

### P1-08 · The gallery as a real room (A)
- **Architecture** (a hybrid of a museum hall and a school assembly hall):
  - polished **parquet** floor with soft reflections;
  - **wainscot** panelling to 1.2 m, a picture rail, plaster walls with a **cornice**;
  - a coffered ceiling with beams and **skylight strips**, plus baseboards;
  - pilasters every 6 m.
  - All corners get **ambient occlusion** (`n8ao`, MIT, works with `postprocessing`) and a contact shadow at every wall/floor joint.
- **Kit:** `src/gl/parts/roomKit.ts` (reusable for the house, the ward, the corridor of doors).
- **Done when:** a still reads instantly as a room.

### P1-09 · The gallery choreography, the cabinet and physics (B)
- **Photographers:** silhouettes step out of the dark between pilasters and **fire flashes** (flash heads, a pop, smoke wisps).
- **Photos develop** when flashed, from darkroom white to the image over 0.6 s, so the progression reads as being photographed over and over. They are ordered by **age plaques** (4, 6, 8, 9, 11, 13) and include the **Colgate "best smile" print ad** (magazine page, torn edge, annotation `featured · colgate · "best smile"`).
- **The cabinet ("maegiri", interpreted as the medal/trophy display cabinet):**
  - a tall glass-fronted wooden almirah mid-gallery;
  - **medals on ribbons** swing (verlet), **trophies** wobble, **certificates** curl and flutter, **shields** lean;
  - flashes and the camera's footsteps send impulses through it, and the glass panes rattle.
  - **Annotations:** `medals: 23`, `certificates: 41`, `trophies: 9` (authored counts, tagged `FICTION` until the creator gives real ones), `spelling bee · olympiad · debate · mun · elocution · basketball`.
- **Physics:** a tiny custom verlet solver (`src/engine/verlet.ts`) for ribbons, cords, paper corners and pendulums. Rapier (Apache-2.0) only if we need rigid piles (Phase 05).

### P1-10 · Eyes v2 (B)
- **Variety:** five styles in one instanced shader via `aStyle`:
  1. **realistic** (wet, veined, lashes, tear line);
  2. **anime** (oversized iris, double highlight, flat cel shading);
  3. **ink / sketch** (graphite hatching, from Phase 02's line);
  4. **camera lens** (glass with aperture blades as the pupil; it focuses when you approach);
  5. **CCTV dome** (with a red dot).

  Sizes vary from 3 cm to 60 cm. Some are bloodshot, some weeping, some half-lidded.
- **Behaviour:**
  - independent **saccades** and smooth pursuit of the camera;
  - blinks with variable timing;
  - eyes open in **waves** on beats of an original paranoid synth-funk motif. It's in the spirit of "Somebody's Watching Me", but we **cannot use the actual song** (copyright). The creator can license it later if he wants it.
- **Fix the "floating" look:** every eye gets a **socket** (an eyelid ring mesh, plus a skin patch decal blending into the plaster), so eyes sit *in* the wall instead of floating in black.
- **Text:**
  - `eyes: 1 … 260 … ∞`
  - Whispered wall text: `look at him`, `smile`, `again`.

### P1-11 · The house, made legible (A)
**Intent, stated plainly:** home, ages 7–12. His parents fought; he was the eldest; he became his mother's support and his brother's shield; and the expectations were written on the walls.

- **Make it read:**
  - **Context card** at entry: `home · age 7–12 · the eldest` (annotation style).
  - **Real silhouettes:** 3D figures (MPFB2/MakeHuman CC0, or the summit-figure pipeline) behind frosted glass, lit from inside, so the shadows look like people rather than SDF stick-figures. Body language: father pointing, mother's hands up, the child stepping between them.
  - **Words through the glass:** argument fragments appear as condensation-text on the frosted panes in Gujarati / Hindi / English (authored, `FICTION`): `paisa kya thi lavsu?` · `tame kai j nathi karta` · `bas karo` · `chhokra sambhde chhe` (*the kids can hear*). The audio is filtered voices (formant synthesis now; local Piper TTS later) that are briefly intelligible.
- **Infographics:**
  - a pencil **line graph on the hallway wall**: `family money` swinging between `comfortable` and `debt` (the source's "large swings");
  - a **role diagram**: a small figure in the centre with arrows labelled `mother's support`, `brother's shield`, `the elder`, `the example`.
- **The child:** his small **right hand with its kada** on the mother's shoulder (the brother's moment moves later).

### P1-12 · "Be the elder. Don't cry." refined (A)
- **New height marks:**

  | Height | Mark |
  |---|---|
  | 4'1" | `top 3` |
  | 4'6" | `engineer.` |
  | 5'0" | `be the elder` |
  | 5'4" | `don't cry` |
  | 5'8" | `set the example` |

  A second, lower column in a different pencil shows the **brother's** marks: `commerce`, `CA` (expectation handed down). Annotation: `brother · 8 yrs younger · commerce → CA`.
- **The brother's hand:** his tiny hand grips our finger. Our child hand wears the kada. Real hand meshes (P1-01). A warm bulb overhead, the only warm light in the house.

### P1-13 · The name, rebuilt: the steamed mirror (A)
- **New staging** (replaces the black glass): a dim **bathroom at night**, age 14–15. A **mirror fogged with steam**. The camera is **locked** (tripod-steady, one slow 10 cm push, no orbit).
- **The writing:** the right hand (kada, real mesh) rises and **writes `yoKi` with a fingertip in the condensation**, stroke by stroke with scroll. The cleared strokes **reveal the reflection behind the fog**: a fair Gujju teenager with the first shadow of a moustache, looking at himself.
- **After the writing:** droplets run down from the letters (verlet drips). The statement *"They gave me a frame. I gave myself a name."*, then the kada sigil threshold.
- **Build:**
  - a fog shader on the mirror with a **mask render-target** painted by the fingertip path (wordmark strokes in pen order);
  - the reflection is a generated teen portrait on a plane behind the mirror, with parallax;
  - drips run down the cleared strokes.
- **Files:** `src/scenes/p1/Name.tsx` (rewrite), `src/gl/parts/fogMirror.ts`.

### P1-14 · Text and infographics layer (A, shared system)
- **Components** (DOM/SVG, all scroll-driven, in `src/ui/info/`):

  | Component | What it is |
  |---|---|
  | `AgeRuler` | A persistent hairline ruler bottom-left during a phase (`age 0 ━━●━━ 15`) that advances with the take |
  | `CatalogueTag` | Archive catalogue numbers (`YK-01-007`) on objects |
  | `MiniChart` | SVG bar/line drawn on scroll |
  | `DrawnDiagram` | Stroke-animated diagram from authored paths |
  | `Marginalia` | Handwritten-style notes in Fraunces italic, slightly rotated |
  | `Redaction` | Black bars that wipe |
- **Density target:** at least one piece of text or infographic on screen in every ~1 unit of scroll, never on the highest-motion moment. Copy lives in `src/content/copy.ts`.

### P1-15 · The kada sigil threshold, polished (B)
- Tighter timing, real glow, the kada's steel sheen sweeping across.
- The dissolve hands over to Phase 02's graphite line (currently a placeholder fade).

### P1-16 · Sound pass for Phase 01 (B)
- Cave tone variations.
- A paper rustle near the cave art.
- Shutter and flash sets per photographer.
- The cabinet's rattle and medal clinks.
- The paranoid eye motif.
- House voices.
- Mirror squeak (finger on glass) and steam hiss.
- Threshold chime.
- All procedural for now (see the placeholder register in `09-assets-and-sourcing.md`).

### P1-17 · Phase 01 lock check (A)
- Full scroll-through recording at 1080p/60 on the RTX and on the iGPU.
- No pops, no NaN frames, no camera jumps.
- Every beat reads muted.
- Text present throughout.
- **Creator sign-off.**

## 2. Shared systems this unlocks for Phases 02–05

| System | Reused by |
|---|---|
| Real hands | Every phase |
| Figures pipeline | Cast, crowds, the dead |
| Room kit plus AO | Ward, corridor, rooms |
| Verlet | Ribbons, threads (the Phase 05 cut), hair |
| Infographics | Every phase |
| Eye shader | Phase 05 madness |
| Fog mirror | Phase 03 ward window |
| Decals | Blood, graffiti, scars |

## 3. Session handoff checklist

1. `yarn dev`, then open `http://localhost:5173/?debug&scene=p1.cave`.
2. Read §1 and pick the first unchecked **A** task.
3. After each task:
   - `yarn typecheck`;
   - `yarn shots <times>` and **look at the PNGs**;
   - commit;
   - tick the task in this file.
4. Keep `docs/guides/05-how-it-was-built.md` updated with *how* each new technique works (the creator is learning from it).

## 3b. Session log

| Date | What happened |
|---|---|
| **2026-10-12 00:07–00:18** | First polish session: this plan written; P1-02, P1-05, P1-06 (anchor), P1-12 (marks), P1-13 done. The session ended (plan limit). |
| **2026-10-12 (resume)** | The creator rewound the conversation, which reset the working tree to v0.1 while git kept the commits. Restored with `git restore --source=HEAD --staged --worktree .` (v0.1 stays reachable at `1581284`). The creator re-sent the same playthrough feedback with: "document first, then plan, then work"; mithilamantra.com (not mithilamakhana) is his site, and its loader confirms the approach (small gold monoline lotus on cream, about 1 s hold, dissolve); recordings, photos and quotes come later, so placeholders are fine but flagged. **Next:** verify the restored items with screenshots, then P1-01 (hands), P1-04 (cave v2), P1-07 (walk through the photo), P1-08 (room), P1-14 (infographics), P1-10 (eyes), P1-11 (house), P1-09 (cabinet), P1-03 (sigil). |

- **2026-10-18 (resume #2)** — second rewind: the working tree had been reset to an old snapshot (all modified files shared one mtime, Noor/Mishti/Laali names back, P1-01 files missing). Restored with `git restore --source=HEAD --staged --worktree .` (the rewound diff is kept in the session scratchpad). Survivors from the lost, uncommitted P1-04 attempt: `src/scenes/p1/caveLayout.ts` and the `rock060`/`rock061` textures. The creator re-sent the same feedback, which this plan already covers. **This session:** P1-04 → P1-07 → P1-08 → P1-14 → P1-10 → P1-11 → P1-09 → P1-03 → P1-06 → P1-12, **committing after every task** (commits survive rewinds; uncommitted edits to tracked files do not).

- **2026-10-18 (resume #3)** — third rewind, same symptoms: the working tree equalled v0.1 (`1581284`) in every modified file. Restored with `git restore .` (nothing lost: v0.1 is in history). Survivors from the lost P1-04 attempt are still untracked: `src/scenes/p1/caveLayout.ts` (raycast wall placement for the cave paintings) and the `rock060`/`rock061` CC0 textures. The creator re-sent the identical playthrough feedback; it is fully covered by §0–§1 (renames Sukki/Panditaein/Shivi ✓, mithilamantra.com ✓, 5'9"–5'10" akhaada build ✓, graphic crash ✓, placeholders flagged ✓). **This session:** P1-04 (rebuild on `caveLayout.ts`) → P1-07 → P1-08 → P1-14 → P1-10 → P1-11 → P1-09 → P1-03 → P1-06 → P1-12, **commit after every task, push docs first**.

**Resume rule:** if `git status` shows many modified files right after a session starts, a rewind probably happened. Compare against `HEAD` before doing anything.

## 4. Progress

- [x] P1-01 hands (MPFB2 bodies → POV arms adult/teen/child/baby via headless Blender, 2-bone IK, kada on wrist — commit b75e5ac)
- [x] P1-02 entry transition (sigil zooms through its left eye; `film.intro` 0→1 over 3 s lifts the black and glides the camera in; scroll unlocks on arrival)
- [ ] P1-03 sigil likeness + idle
- [x] P1-04 cave v2 (sandstone strata + triplanar Rock061; five canvas-drawn Bhimbetka pictographs as decals — born / the gaze / the pose / home / the hand stencil with the kada ring; drips from real stalactite tips; filament-mirroring puddle; walking light; flat floor; 'site I' context card + catalogue labels with ages; cave 7→8 units)
- [x] P1-05 no-pop cave→chamber (dome mouth carved; lights fade on u; fog extended)
- [ ] P1-06 modelling frame + studio (**anchor swapped to modelling ✓**, Colgate on the gallery wall ✓; studio dressing TODO)
- [x] P1-07 walk through the photograph (world re-based: gallery/house/mirror +129.6 m so the gallery sits behind the frame; quarried STUDIO_WALL with the frame's opening; dome backCut; scrim print: back-lit flash → rolls up; continuous camera, no white-out)
- [x] P1-08 gallery room (roomKit: wainscot/rails/baseboard/cornice/pilasters/coffers/skylights/door casing, triplanar plaster/wood/parquet; moonlight sun with beam shadows; warm picture lights with brass hoods; photos centred in 6 m bays; hall height 10.5 m)
- [ ] P1-09 choreography, cabinet, physics
- [ ] P1-10 eyes v2
- [ ] P1-11 house legible
- [ ] P1-12 height marks (**marks + brother column ✓**; real child hand waits on P1-01)
- [x] P1-13 steamed mirror (bathroom, locked camera with zero-velocity arrival, canvas wipe-mask fog shader, generated teen reflection, drips; hand mesh upgrade comes with P1-01)
- [ ] P1-14 infographics layer
- [ ] P1-15 threshold polish
- [ ] P1-16 sound pass
- [ ] P1-17 lock check
