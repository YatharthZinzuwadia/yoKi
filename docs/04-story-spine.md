# 04 — Story Spine: the one-shot

One camera, one unbroken take, five phases. This is the master overview; each phase has its own detailed file in `docs/phases/`.

## The rule of the take

- **No hard cuts.** Each transition is a physical move: through a frame, a door, a pane of glass, along a line, over an edge, out of a body.
- **Hidden cuts are allowed**, like *1917* and *Birdman*. The camera passes behind a pillar, into total darkness, through a flash white-out, or into a blink, and a different space can be on the other side. Every phase has at most two.
- The camera is **his eyes** until the summit. At the summit it leaves his body (*Enter the Void*), rises, turns, and shows him. That is the only time we see him from outside.
- The scroll moves time along the take. Stopping scrolling **settles** the camera into a composed frame, so every stop is a good frame.

## The spine at a glance

| # | Phase | Ages | World | Colour | Core image | Sigil mark |
|---|---|---|---|---|---|---|
| 0 | **Entry** | — | Ink void | Ink, bone, one ember line | The sigil traced in light while the world loads; `yoKi` signs itself | contour |
| 01 | **THE NAME** — *born into the gaze* | 0 → 15 | Cave → gallery of frames → house of glass | Velvet black, paper cream, flash white, sepia, brass | A child's smile in a giant frame, lit by flashes; eyes in the walls | (name claimed) → **kada** |
| 02 | **THE MANY** — *every extreme, the same man* | 8 → 22 | A paper world that unfolds into instruments, a court, a stage and a machine | **Moebius brights:** paper, graphite, court orange, teal, cobalt, sun yellow | One line becoming graphite, string, court line, dance arc, circuit | **thread** |
| 03 | **THE LAW OF FORCE** — *the centre of the room* | 17 → 24 | Night street → Ballers Club → doors of people who call → a fight → the treatment ward | Sodium orange, deep blue, club magenta, blood red | A shadow bigger than the man; blood on sodium-lit asphalt; faces in the ward walls | — |
| 04 | **LOVE, LOYALTY & THE COST OF STAYING** — *the ones who left* | 18 → now | Corridor of doors → Sukki → the crash → Panditaein → the group → Shivi → the clearing → the cliff | Per thread: dawn blue/gold, peach/tungsten, sick green, crimson; the clearing overexposed gold-green | Shoes at the airport glass; asphalt dragging skin; two lines diverging; empty seats; a bite; a woman's two hands on his chest | **eye scar**, **bite** |
| 05 | **THE QUIET THRONE** — *the man who chooses what remains* | now | Madness pit → landing → fragments → the cut → the climb over the dead → the summit | Negative/inverted → ash grey → Gita cream with Krishna-blue → rust and bone → moon cyan | Mountain of corpses, him at ease on top, crescent moon, ash falling | shattered → **moustache + beard + all** |

## Transitions (the take never breaks)

| From → To | Move |
|---|---|
| Entry → 01 | The sigil contour unravels into one filament of light; the camera falls through the sigil's eye into the cave, and the filament is now on the cave floor. |
| 01.1 → 01.2 | The filament climbs a wall and runs into the corner of a giant frame. |
| 01.2 → 01.3 | A flashbulb white-out (hidden cut), and the camera is in a long gallery of frames. |
| 01.3 → 01.4 | The last frame is empty. It grows taller and becomes a doorway into the house of frosted glass. |
| 01.4 → 01.5 | Darkness behind the shouting; a pane of glass where his hand writes `yoKi`. |
| 01 → 02 | The final stroke of the `K` drops to the ground as graphite. The **kada sigil** ignites. The glass dissolves and the paper world unfolds. |
| 02.1 → 02.2 | A graphite contour is pulled taut into a guitar string; the paper becomes wood grain. |
| 02.2 → 02.3 | The string drops to the floor and widens into a court line. A ball bounces in. |
| 02.3 → 02.4 | The court's centre circle rises into a spotlight on a stage. |
| 02.4 → 02.5 | The dancer's arc becomes a cable; the cable plugs into a beige PC. |
| 02.5 → 02.6 | Code climbs the walls; every material connects. |
| 02 → 03 | The line thickens into a black thread. The **thread sigil** ignites. The thread becomes the edge of a shadow on a street wall at night. |
| 03.x → 03.y | Doors, crowds, a strobe blackout (hidden cut), a shutter slamming down (hidden cut). |
| 03 → 04 | In the ward, a single thread of light hangs between the walls. The camera follows it into a corridor of coloured doors. The **eye-scar sigil** ignites. |
| Inside 04 | Each door is entered and exited through its own frame; the crash ends in a white-out, and the camera wakes in Panditaein's corridor (the "after"). |
| 04 → 05 | She pushes; the camera tumbles over the cliff; the line snaps; there is a fall through dark. The **shattered sigil** flickers mid-fall. Impact. |
| 05.x | Madness ends in a single breath (the camera's own blink). The landing is a slow settle. The climb is continuous. |
| 05 → finale | The camera rises out of his eyes, orbits and reveals him. Pull back. The **full sigil** forms in the sky beside the moon. |

## Pacing

- **Target:** roughly **10–14 minutes** of attentive scrolling. Every second of it is controlled by the visitor.
- **Weight by phase** (share of total scroll length, editable in `src/content/film.ts`):

  | Phase | Share |
  |---|---|
  | Entry | 2% |
  | 01 | 15% |
  | 02 | 18% |
  | 03 | 18% |
  | 04 | 27% |
  | 05 | 20% |

- **Rhythm inside a phase:** establish → one strong action → residue (a hold) → motivated transition.
- **One climax per phase:**

  | Phase | Climax |
  |---|---|
  | 01 | the flash gallery |
  | 02 | the convergence |
  | 03 | the fight |
  | 04 | the push |
  | 05 | the reveal |

## The line (the motif that carries the take)

1. **Entry:** the sigil's contour.
2. **01:** the cave floor filament, then a frame edge, then the stroke of `yoKi`.
3. **02:** graphite, then a guitar string, then a court line, then a dance arc, then a cable and circuit, then the black thread.
4. **03:** the edge of a giant shadow, then a phone cord, then a line of blood, then a seam of light in the ward.
5. **04:** coloured relationship threads, then skid marks, then two parallel lines, then the clearing's sunlit path.
6. **The push:** it snaps.
7. **05:** loose threads tied to his body. He cuts them. One survives and runs uphill. At the summit it becomes the cold horizon.

## Truth and invention

The creator has given full licence to invent. Internally, every scene in `src/content/film.ts` carries a `source` tag (`MEMORY`, `PATTERN`, `RECONSTRUCTION`, `COMPOSITE`, `FICTION`, `SYMBOLIC`) so the creator always knows what is his memory and what was authored. Visitors never see the tags.
