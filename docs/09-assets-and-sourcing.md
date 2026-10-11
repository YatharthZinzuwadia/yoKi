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

## Placeholder register

Things that stand in for the creator's real material. The creator said (2026-10-12) recordings and photos come later, so every placeholder is generated or sampled and **marked in code with `// PLACEHOLDER(creator):`** (search for it).

| Placeholder | Current stand-in | Where | Replace with |
|---|---|---|---|
| The summit laugh | Procedural breath/formant bursts | `src/audio/synth.ts` (planned `laugh()`) | His recorded laugh → `public/audio/laugh.*` |
| Guitar / harmonium / Casio | Karplus-Strong plucks, synthesised reed and square tones | `src/audio/synth.ts` | His recordings → `public/audio/` |
| Takiya-kalaams | Empty (nothing shown) | `src/content/copy.ts` → `QUOTES` | His phrases, any language |
| Body / silhouette | Assumed from his description: 5'9"–5'10", akhaada medium build, slight belly, fair, classic Gujju look | figures and sigil | Silhouette photos (front/side) |
| Sigil likeness | Drawn monoline, being re-traced from generated references (P1-03) | `src/ui/sigil/paths.ts` | His approval / his own drawing |
| Wordmark `yoKi` | Drawn monoline, capital K | `src/ui/sigil/paths.ts` → `WORDMARK` | Optional: his handwriting |
| All photographs | RealVisXL generations | `public/images/**` | Real photos if he ever wants them (same filenames) |
| Medal / certificate counts | Authored (23 / 41 / 9) | `src/content/copy.ts` | Real counts |
