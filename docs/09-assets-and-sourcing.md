# 09 — Assets & Sourcing

**Principle:** never block on media. Everything is generated or sourced (free/open) first, so the film is complete. The creator replaces anything later, whenever he wants.

## The four sources, in order of preference

| # | Source | Used for | Who does it |
|---|---|---|---|
| 1 | **Procedural, in code** (shaders, generated geometry, Web Audio synthesis) | Caves, paper worlds, courts, streets, wards, meadows, particles (dust, drips, blood, ash, flies), the light line, all sound | Claude, in the repo |
| 2 | **Blender, headless + Python** (`tools/blender/`) on the creator's RTX 5050 | Rigged human figures (the cast), posed and piled bodies (the corpse mountain via rigid-body physics), props (frame, PC, Hunter 350, guitar), baked lighting | Claude runs the scripts; the creator never has to open Blender (optional guide in `guides/02`) |
| 3 | **Local AI image generation** (`tools/imagegen/`, SDXL / RealVisXL V5.0 via diffusers, fully offline) | Photographs and drawings inside the film: the smile portrait, modelling shots, the family portrait drawing, the after-Ganev drawing, the commission, report cards, the Hanuman print, messages, the Gita page textures | Claude writes prompt batches and runs them |
| 4 | **CC0 / open libraries** | Human base meshes (MakeHuman/MPFB2, CC0), HDRIs and textures (Poly Haven, ambientCG, CC0), optional field recordings (Freesound CC0), fonts (OFL) | Claude downloads and records licences |

## What the creator *can* give later (optional, never blocking)

| Item | Why it's better | How (guide) |
|---|---|---|
| **Signature** (`yoKi` written by hand, 10 tries on white paper) | The wordmark becomes literally his hand | Photo → `guides/03` (scan → vectorise → drop in) |
| **His laugh** (phone voice memo, quiet room, 5–10 takes) | The most important sound in the film | `guides/03` (put the file in `public/audio/laugh.*`) |
| **His guitar / harmonium / Casio** (one note or phrase each) | The Phase 02 motif in his own playing | `guides/03` |
| **Takiya-kalaams** (one per phase, any language) | They appear under each phase sigil | Edit `src/content/copy.ts` → `quotes` |
| **Silhouette photos** (full body front/side, in his usual clothes) | A summit figure that matches his real build | Drop in `source/reference/`; Claude adjusts the figure |
| **Real drawings** (family portrait, commission, Ganev recreation) | Real artifacts instead of generated ones | Photo → `public/images/` with the same filename |

## What Claude gathers or generates without asking

Everything in the phase docs' "Assets" sections. Every generated or downloaded file is logged in `public/CREDITS.md` with: path, source (generated / CC0 URL), licence, tool, prompt or script, and date.

## Licences in use

| Item | Licence |
|---|---|
| Code | creator's own (private) |
| Fonts | SIL OFL 1.1 |
| RealVisXL V5.0 outputs | CreativeML OpenRAIL++-M (commercial use allowed, with use restrictions) |
| MakeHuman / MPFB assets | CC0 |
| Poly Haven / ambientCG | CC0 |
| Three.js example assets (if used) | as stated in the three.js repo (logged per file) |

## Content note on generated media

- Generated images may depict the cast. They are stylised stand-ins, never real photos of real people.
- No real person's photo is used for training, conditioning or likeness.
