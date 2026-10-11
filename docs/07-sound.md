# 07 — Sound

**On by default.** Sound is half the film. Every visual beat still reads muted.

## Approach: procedural first, recordings later

v1 ships with a **procedural audio engine**: all sound is synthesised in the browser with the Web Audio API. That means zero licensing, zero downloads, every cue tunable in code, and sound that is perfectly tied to scroll. Any cue can later be swapped for a real recording (the creator's guitar, his laugh, CC0 field recordings) without touching scene code: drop the file into `public/audio/` and map it in `src/audio/cues.ts`.

## Engine

| Part | Implementation |
|---|---|
| Master chain | master gain → compressor → limiter → destination. Mute fades master over 0.3 s. |
| Reverb | Convolver with **generated impulse responses** (cave, gallery, court, club, ward, valley), crossfaded per scene. |
| Ambience beds | Looping procedural layers (room tone, wind, rain hiss, crowd murmur, fluorescent hum, flies), each with a gain curve over film time. Crossfades follow scroll, so scrubbing back reverses them. |
| One-shots | Pre-rendered **into AudioBuffers at load time** (drips, shutters, plucks, ball, punches, glass, impacts, thread cuts), so playback costs nothing and never hitches. Fired when film time crosses a trigger point; there is a separate reverse trigger when scrubbing backward. |
| Score | A **generative score**: slow pads and drones in the film's key, with the Phase 02 guitar motif returning altered (detuned in 04, reversed in 05's madness, a single sustained tone at the summit). Volume and filter follow intensity curves per scene. |
| Spatialisation | PannerNodes on positional sources (flashes, phones, the harmonium, flies). |
| Synthesis | Karplus-Strong strings, FM bells, filtered-noise wind, granular crowds, sine/noise impacts, formant-filtered "voices" (unintelligible whispers), breath (shaped pink noise). |

## Cue sheet (by phase)

| Phase | Beds | Key one-shots | Score |
|---|---|---|---|
| Entry | near-silence, ember crackle | stroke whisper while tracing, breath on enter | single low tone |
| 01 | cave tone, drips, gallery hush, house fan | shutters, flash whine, applause swell, slow clap, plate shatter, glass squeak (writing) | low pads, no melody |
| 02 | wind, lark, court echo, CRT whine | pencil, paper folds, guitar plucks, harmonium breath, Casio notes, ball thunks, squeak, swish, dance hits, floppy seek, dial-up, keys | **the motif** appears; light rhythm in the stage beat |
| 03 | night street, club bass (filtered), parking hum, ward fluorescence | temple bell, phone vibrations, punches, shutter crash, tinnitus, whispers, heartbeat | harmonic instability, bass pulses |
| 04 | tungsten room, airport hall, terrace party, neon buzz, meadow wind | phone shatter, bike thump, horn, crash, 40 m scrape, glass, wheel ticks, flies, nails on skin, line-snap | detuning duet (Mishti), **the warm major chord** in the clearing, cut mid-note |
| 05 | madness whispers, valley wind, flies, crows | impact crack, reversed chord, breath, thread creaks and cuts, distant thuds, the laugh | silence → a single sustained tone at the summit |

## The laugh

The summit laugh is the most important sound in the film. v1 uses a **procedural placeholder** (shaped breath bursts through formant filters) so the beat exists. **Best version: the creator records his own laugh** on his phone (see `docs/guides/03-edit-content.md`). If he doesn't, keep the placeholder very quiet or drop it; never use a stock evil laugh.

## Mix rules

- Statements on screen duck the beds by 3 dB.
- Nothing is louder than the crash and the push.
- Silence is a cue: it gets scheduled like a sound.
