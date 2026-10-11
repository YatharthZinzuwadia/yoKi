# 02 — The Sigil & the Body

These are the marks and objects of utmost significance to yoKi. Wherever his body appears (POV hands, reflections, shadows, and the final reveal), they must be correct. They are also the basis of the emblem system that opens every chapter.

## 1. The identity markers (always correct, everywhere)

| Marker | Where | Description | Meaning in the work |
|---|---|---|---|
| **Kada** | Right wrist | A plain steel/iron kada (bangle), worn for years. Slightly scuffed, with a dull grey sheen and one bright specular line. It sits loose and slides when the hand moves. | The oldest thing he wears. A ring that holds. The hand that draws, plays, dribbles, codes, fights and signs `yoKi` wears it. |
| **Hanumanji's thread** | Neck | A **black thread** necklace with a small trinket: a **cylinder with oval/dome ends** (a capsule-shaped tabeez). Matte black thread; the capsule is dull metal with a faint sindoor-orange trace in its seam. | Protection and strength. Hanuman is Sankat Mochan, the one called when there's a crisis: Phase 03's "the one people call". |
| **Eye scar** | Below the **left** eye | A short pale scar under the left eye from the Hunter 350 accident: headlight glass passed close to the eye. | The road took a piece of him on the day he sent Noor off. |
| **Bite mark** | **Left** shoulder / tricep | A faint crescent of tooth marks from his current girlfriend (Laali), a playful bite. In the present it is a fresh-looking mark; in the sigil it is two small dotted arcs. | Love that marks. Play with teeth in it. |
| **Rajwadi moustache** | Face | A full moustache with **upward-curled tips**, Rajput style, worn since his late teens. Pride, literally worn. | The crown that isn't a crown. The only "regalia" in the final image. |
| **Beard** | Face | A dense, well-kept full beard that "always stays on". | Constancy. Adulthood. Him. |

**Faith:** Mahadev bhakt, with a strong pull toward **Krishna** and **Hanuman**. These are expressed *subtly* and only where they carry meaning:
- **Hanuman:**
  - The black thread itself.
  - Phase 03's Sankat Mochan parallel: a weathered roadside Hanuman shrine with fresh sindoor, glimpsed at the moment people start calling him.
  - The sodium-orange of Phase 03 rhymes with sindoor.
- **Krishna:**
  - The worn Bhagavad Gita he chooses to carry after the fall.
  - The cut in Phase 05, which is Kurukshetra logic: act, and cut attachment.
  - A single peacock feather lying in the grass of the Phase 04 clearing, which he later finds among the fragments.
- **Mahadev:**
  - The summit is a smashan, a cremation ground on a mountain: ash falling like snow, distant pyre smoke, and a thin **crescent moon** above him.
  - His low laugh at the summit carries Rudra's register.
  - One beat in Phase 02's dance freezes into a Nataraja silhouette.
  - No deity figures, no glowing Om, no saffron filters. Hints only.

**Clothing (present day):** plain dark contemporary: black/charcoal tee or shirt, dark jeans or trousers, worn boots or sneakers. No costume, crown or cape. At the summit everything is dusted with ash, and the hems are dark with dried blood that isn't his.

**Build and height (assumed until the creator corrects it):** ~5'11", athletic and solid: ex-national basketball, two years of gym, broad shoulders. Short dark hair, often pushed back.

## 2. The Sigil: an emblem that becomes him

The sigil is a **minimal monoline portrait of yoKi**. It is used as the logo and loader, and it is the *only* thing shown at each chapter threshold. No chapter names or quotes appear at openers; the takiya-kalaam slots exist in the content file but stay empty and hidden until the creator supplies them.

### Drawing

- **Pose:** a three-quarter bust facing slightly toward screen-left. The **right hand is raised to the moustache, twirling its tip** (*moonch pe taav*, the classic gesture of pride). This one pose shows every marker at once:
  - the kada on the raised right wrist;
  - the thread and capsule on the chest;
  - the scar under the near (left) eye;
  - the bite on the near (left) upper arm;
  - the moustache and beard.
- **Line:** one continuous stroke weight, slightly calligraphic. Drawn as if by the same pencil as Phase 02. Closed contours are allowed, but the outline should read in one glance at 32 px.
- **Construction:** SVG paths, one group per marker (`contour`, `kada`, `thread`, `capsule`, `scar`, `bite`, `moustache`, `beard`, `moon`), so each part animates and lights independently. File: `src/ui/sigil/sigil.svg.ts`.

### States (the progression)

The sigil accumulates his marks across the film. Each chapter threshold shows the sigil with **its new mark igniting**, while earlier marks hold a dimmer ember. The final state lights everything.

| Moment | State | Ignites | Colour of the new mark |
|---|---|---|---|
| **Loader / Entry** | Bare contour drawn by a moving point of light as assets load (real progress). The `yoKi` wordmark signs itself underneath. | contour | bone white |
| **Phase 01 → 02 threshold** | The name has been claimed. The kada ignites as the right hand finishes signing. | **kada** | steel-white with a warm core |
| **Phase 02 → 03 threshold** | The line through every medium ties at the neck. | **thread + capsule** | black thread rim-lit sindoor orange |
| **Phase 04 opener** | Before Noor's door. | **eye scar** | cold dawn blue → blood red |
| **Inside Phase 04, before Laali's room** | An inline mini-sigil in the corner of frame, about 2 s. | **bite** | crimson |
| **Phase 05 opener (after the fall)** | **Shattered:** the contour breaks into jittering segments, the marks flicker out of order, and chromatic tearing runs through it. This is madness. | everything, wrongly | negative/inverted |
| **Finale** | Whole again. **Moustache and beard** ignite last, then every mark burns together. A thin crescent moon appears above the head. Hold, then the wordmark. | **moustache + beard + all** | ash white, bone, moon-cyan rim, one ember of the clearing's gold |

**Threshold animation (each chapter):**
1. The current frame darkens or veils toward the phase colour (≈0.4 s).
2. The sigil traces in light (stroke-dashoffset), about 1.2 s total.
3. The new mark ignites: a bloom pulse, then it settles.
4. A hold (scroll-driven).
5. The sigil dissolves *into* the next scene's first element. The contour unravels into the path line, the kada becomes a ring of light on a court, the thread becomes the corridor thread, and so on.

The threshold is **scroll-scrubbed** (it plays forward and back with scroll), never a blocking timed intro.

## 3. The wordmark: `yoKi`

- A **hand-signed monoline** signature in a continuous single-line hand: lowercase `y` and `o`, a tall **capital `K`** whose upper arm flicks up like a moustache tip, and an `i` whose dot is a small solid point. It is the creator's signature reimagined. When he writes his own signature later, it gets scanned, vectorised and swapped in (see `docs/guides/03-edit-content.md`).
- It is animated as the stroke being written (dashoffset along the path in pen order), always by "his" hand.
- It appears in the loader, at the end of Phase 01 written on glass, in the nav (tiny), and in the finale.
- Colour: it follows the scene, default bone `#EDE6D6` on ink `#0A0A0C`.

## 4. Where the markers appear in the film

- **Phase 01:** child hands (no kada yet; it arrives later in the same wrist position). The teen's hand writing `yoKi` wears the kada.
- **Phase 02:** POV right hand with the kada on every action: pencil, strings, ball, keyboard, screwdriver.
- **Phase 03:** the thread swings into frame when he leans in, and catches sodium light. The kada works as a knuckle weight in the fight.
- **Phase 04:**
  - The eye scar is *made* in the Hunter 350 crash: a blood veil on the left of frame, then the scar is present in every later reflection.
  - The bite happens in Laali's room.
- **Phase 05:** at the summit reveal, all markers are visible in rim light. The moustache tips are the brightest edges on the figure after the moon.
