# 05 — Art Direction

## 1. The look: painted cinema

Real-time 3D rendered as **illustration**. Every frame should read like a hand-painted keyframe from an animated feature that moves like a single take:
- **Light:** physically motivated, with volume, bloom, wet reflections and real shadows.
- **Paint:** shapes simplified into strokes (a Kuwahara-style paint filter), ink lines on silhouettes and creases, paper/canvas grain over everything, and slight colour bleeding.
- **Design:** bold shape language, big skies, tiny figures in vast space (Moebius), clean silhouettes, and saturated colour where the life was saturated.

It is not photoreal and not cel-shaded anime. It sits between Moebius, Arcane, Jibaro and Spider-Verse, with each phase leaning differently (see the colour script).

### Rendering pipeline (art view; tech in `08`)

1. Scene lit with physical light, fog, emissives and volumetric beams.
2. **Bloom** for flashes, neon, sun and the line.
3. **Paint pass:** Kuwahara-style smoothing into brush patches. Strength varies by phase (strong in 05, subtle in 02).
4. **Ink pass:** dark outlines from depth and colour edges. Width and colour vary by phase (graphite grey in 02, black in 03, none in the clearing).
5. **Grade:** per-scene exposure, lift/gamma/gain, saturation, tint and contrast, interpolated continuously along the take.
6. **Paper and grain:** procedural paper fibre multiply plus film grain.
7. **Phase FX:** chromatic aberration and stutter (madness), the left-eye blood veil (after the crash), exposure adaptation (the clearing), strobe slicing (club), vignette.

## 2. Colour script

The film is **not uniformly dark**. It breathes between ink and daylight.

| Moment | Dominant | Accent | Key / brightness | Paint | Ink |
|---|---|---|---|---|---|
| Entry | ink `#0A0A0C` | bone `#EDE6D6`, ember | 5% | — | — |
| 01 cave | velvet black, charcoal | warm filament `#FFCF8A` | 10% | medium | thin black |
| 01 gallery | black | flash white, sepia, brass | flashes to 100%, falls to 5% | medium | thin |
| 01 house | frosted grey-blue | brass lamp | 25% | low | soft |
| 01 name | black | bone light | 8% | low | none |
| 02 paper world | paper `#F2E8CF`, teal sky | graphite, sun yellow | **80% daylight** | low | graphite, medium |
| 02 guitar/keys | wood amber | brass strings, teal | 60% | low | graphite |
| 02 court | court orange, gloss | white lines | 75% | low | clean |
| 02 stage | black | warm magenta gel | 30% | medium | thin |
| 02 machine | night blue | CRT green-white, circuit cyan | 20% | low | thin |
| 02 convergence | golden hour | every phase-02 colour | 70% | low | graphite |
| 03 street | night blue, indigo | **sodium orange**, sindoor | 25% | medium | heavy black |
| 03 club | black | magenta, white strobe | strobed | low | heavy |
| 03 calls | black | phone blue-white | 10% | low | thin |
| 03 fight | sodium | **blood red** | 30% | medium | heavy |
| 03 ward | ward green-white | text black | 50% flat, sick | high | none |
| 04 corridor | plum | four door colours | 15% | medium | thin |
| 04 Noor | tungsten, dawn blue/gold | gold hoops | 35 → 60% | medium | soft |
| 04 crash | asphalt, headlight white | blood | 40% | high + motion blur | — |
| 04 Mishti | peach → grey | tungsten pink | 40 → 25% | medium | soft |
| 04 group | sick green, smoke | fluorescent | 30% | high | thin |
| 04 Laali | crimson, black | neon red | 20% | medium | soft |
| 04 clearing | **white-gold, meadow green** | peacock blue-green | **blown out → 90%** | low | none |
| 04 fall | sky → black | — | 90 → 0% | — | — |
| 05 madness | inverted, bruise, flesh | sick yellow | strobing ≤3 Hz | high | jittering |
| 05 landing | ash grey | bone | 35% | high | soft |
| 05 cut | Gita cream | **Krishna blue** (once) | 40% | medium | thin |
| 05 climb | rust, dried blood, bone | gold glints | 25 → 15% | **high (oil)** | black |
| 05 summit | night indigo | **moon cyan rim**, one gold ember | 12% | high | rim only |

## 3. Typography

All typefaces are open source (OFL) and self-hosted, so nothing breaks offline.

| Use | Typeface | Notes |
|---|---|---|
| Statements (first-person lines) | **Fraunces** (variable) | Italic, opsz 72–144, `SOFT` 50, `WONK` 1. Large, quiet, lowercase-led. |
| Annotations, infographics, nav | **IBM Plex Mono** | 11–13 px, letter-spacing 0.08em, lowercase. Leader lines are 1 px. |
| Devanagari (Gita, Hindi voices) | **Tiro Devanagari Sanskrit** | Never translated on screen. |
| Gujarati (voices, signs) | **Noto Serif Gujarati** | Later; the takiya-kalaams may be Gujarati. |

**Rules:**
- Text never sits on a high-motion moment.
- Statements fade in after the image lands and hold 2–4 s of scroll.
- At most one statement on screen.

## 4. The annotation system (infographics)

The film carries a quiet **archival annotation layer**, like a forensic or museum catalogue written by the man himself:
- **Callouts** pinned to 3D points: a 1 px leader line, a dot, and a mono label. They appear when the object is in focus and fade when it isn't.
- **Counters** that tick with scroll: distance dragged, calls tonight, times photographed, ₹350.
- **Diagrams** drawn in SVG strokes that animate on scroll: court plays, the timeline overlap, the friend network snapping, the pressure diagram, the packing ledger.
- **Tone:** deadpan, clinical, lowercase. The colder the label, the harder the image hits.

## 5. Light language

- **The line** is the protagonist's light: warm filament → graphite gleam → string glint → court paint → black thread with orange rim → relationship colours → snapped → the cold horizon.
- Each world gets one **motivated key light**: a lamp, sun, flash, neon or moon.
- **Volumetric beams** only where dust or haze exists.
- **Flashes** (camera bulbs, strobes, the madness) are capped at **≤3 per second** with a softened attack. Photosensitivity safety is non-negotiable.

## 6. Materials

| Material | Look |
|---|---|
| Stone | wet charcoal with ink cracks |
| Paper | fibres, crease shadows, slight translucency in backlight |
| Graphite | dark grey with metallic sheen at grazing angles |
| Wood | amber grain and lacquer |
| Brushed metal | strings, kada |
| Court gloss | reflects the skylights |
| Glass | real refraction on hero panes; cheap fresnel elsewhere |
| Asphalt | wet, sodium reflections |
| Skin | warm subsurface on the living; grey-green, bruise-purple and mottled on the dead |
| Blood | fresh: deep saturated red with a specular highlight. Drying: brown-black and matte, cracking. |
| Ash | pale grey flakes, rough, catching moonlight. |

## 7. Gore, horror and sensuality: how to render it

- **Commit.** Wounds are wounds, blood is wet, the dead are dead. The painted style makes it art; it doesn't make it timid.
- **Hold on detail just long enough.** One beat on the split knuckles, the dragged skin, Kshitij's vomit, a face in the pile, then move. Repetition dulls; specificity cuts.
- **Bodies of the dead** are rendered like classical painting: Géricault's *Raft of the Medusa*, Doré, Rodin, Bosch. Entangled, heavy, a mix of nude and clothed, every one a person.
- **Sensuality:** the women are shot the way he looked at them. Skin, curves, styling, nails, fishnet shadows, sweat, laughter, light on a hip, intimacy in silhouette and close fragments. Desire is part of the story. It's framed with craft, not shown as explicit sex.
- **Horror:** body and perception horror (faces through membranes, crawling text, wrong shadows, missing frames, skin tearing to paper). No jump-scare screamers. The dread is in the persistence.

## 8. References

Principles are borrowed, never assets or layouts.

### Web

| Reference | What to take |
|---|---|
| **The Monolith Project** (themonolithproject.net; Three.js/R3F/GSAP; illustration by 林遭遇; Moebius and *2001* inspired) | Illustration-into-3D shaders, 13 scenes with wipes, zoom blurs and 2D↔3D object matches, mouse-reactive particles, 60 fps. |
| **Artisans d'Idées** (Immersive Garden, sound by Mooders) | "Click to illuminate", forms rising out of shadow, sound driven by camera state, a short film with chapters. |
| **mithilamakhana.com** (the creator's own) | Logo-only preloader that rises, holds, then scales into the site; a header that collapses into a pill. |
| **Igloo Inc** (Abeto), **Lusion**, **Active Theory**, **Bruno Simon** | Polish, interaction feel, performance discipline. |
| **The Boat** (SBS) | Scroll-driven graphic storytelling with words in the image. |

### Film and animation

| Reference | What to take |
|---|---|
| **1917**, **Birdman** | The hidden-cut one-shot. |
| ***Enter the Void*** (Gaspar Noé) | POV, out-of-body ascent, strobing, death. |
| **Perfect Blue**, **Paprika** (Satoshi Kon) | Madness via editing and identity flicker. |
| **Jibaro** (*Love, Death + Robots*) | Graphic, sensual, horrific beauty in one frame. |
| **Arcane**, **Into the Spider-Verse** | Painted 3D. |
| **Midsommar** | Horror in overexposed daylight: the clearing. |
| **Mandy** | Saturated red horror. |
| **Akira**, **Berserk** (the Eclipse) | Mass of bodies, ascent. |
| **The Fall**, **The Cell** (Tarsem) | Visual splendour, grotesque art. |

### Games

| Reference | What to take |
|---|---|
| **INSIDE**, **Limbo** (Playdead) | A continuous take with no UI, deaths, light, the huddle of bodies. |
| **Gris** | Colour as chapters. |
| **Journey** | The ascent. |
| **Hellblade: Senua's Sacrifice** | Psychosis voices as texture. |
| **Death Stranding** | Strands, the dead, cold annotation UI. |
| **Blasphemous** | Grotesque devotion. |

### Painting and illustration

| Reference | What to take |
|---|---|
| **Moebius**, **Zdzisław Beksiński**, **Gustave Doré**, **Rodin's *Gates of Hell***, **Goya's Black Paintings**, **Francis Bacon**, **Géricault** | Shape, dread, the piled dead. |
| **Junji Ito** | Body horror. |
| **Rajput miniature portraiture** | Royal profiles, upturned moustaches: grandeur without a crown. |
| **Raja Ravi Varma** | Indian figure painting. |

### Music (thematic only)

Kendrick Lamar (*good kid, m.A.A.d city*), Complete ("Jordan"), Marino & Alexandria ("Lust").
