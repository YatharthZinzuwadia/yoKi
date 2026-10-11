# Guide 03 — Change words, timing, images, sounds, the sigil

You don't need to touch rendering code for any of this.

## Words (statements, annotations, counters, takiya-kalaams)

File: `src/content/copy.ts`

- **`STATEMENTS`:** the first-person lines.
  - `scene` is the scene id; `from`/`to` are scene-local times.
  - `at` sets the position: `'low' | 'mid' | 'high' | 'left' | 'right'`.
  - Add `quote: true` for spoken lines; they get quotation marks.
- **`ANNOTATIONS`:** the small mono labels pinned to objects. `{n}` plus `counter` makes an animated number.
- **`QUOTES`:** your takiya-kalaams, one per phase:

  ```ts
  export const QUOTES: Record<number, string> = {
    1: 'your line for The Name',
    2: '…',
  }
  ```

  Any language works; Gujarati and Devanagari are supported.

Save the file and the browser updates instantly while `yarn dev` runs.

## Pacing (how long each scene lasts)

File: `src/content/film.ts`

Change a scene's `length`. One unit is about one screen of scrolling. `UNIT_VH` scales the whole film's scroll length: smaller is faster.

## Photographs and drawings inside the film

Every image has a fixed name in `public/images/`:

| Scene | Files |
|---|---|
| The giant frame | `p1/smile.webp` |
| The gallery | `p1/modelling.webp`, `p1/spellbee.webp`, `p1/stage.webp`, `p1/olympiad.webp`, `p1/debate.webp`, `p1/modelling2.webp` |

**To use your own photo instead:**
1. Convert it to WebP with the same name, replacing the file:

   ```bash
   magick your-photo.jpg -resize 1216x1216\> -quality 88 public/images/p1/smile.webp
   ```
2. Reload the page.

**To regenerate with a different prompt:**
1. Edit `tools/imagegen/prompts/p1.json`.
2. Run:

   ```bash
   tools/imagegen/run.sh tools/imagegen/prompts/p1.json --only p1/smile --force
   ```

## Your signature as the wordmark

1. Write `yoKi` about 10 times with a black pen on white paper and photograph the best one, flat and well lit.
2. Send it to Claude: "vectorise my signature into the wordmark". Claude traces it (`potrace`, already installed) into single-line stroke paths in pen order and replaces `WORDMARK` in `src/ui/sigil/paths.ts`.

Or do it yourself:

```bash
magick signature.jpg -colorspace gray -threshold 55% -negate sig.pbm
potrace sig.pbm -s -o sig.svg
```

`sig.svg` contains the outline paths. Paste them into `WORDMARK` (outlines will fill instead of drawing as a single line; Claude can convert them to centre-lines).

## The sigil (the portrait emblem)

File: `src/ui/sigil/paths.ts`. There is one SVG path list per part: `contour`, `kada`, `thread`, `capsule`, `scar`, `bite`, `moustache`, `beard` and `moon`.

To preview your edits as PNGs:

```bash
node tools/qa/sigil-preview.mjs
```

The output goes to `tools/qa/out/sigil.png` and `wordmark.png`.

## Your laugh (and other real sounds)

1. Record on your phone in a quiet room: several takes, close to the mic.
2. Copy the file to the laptop and convert it:

   ```bash
   ffmpeg -i laugh.m4a -ac 1 -ar 44100 -af "highpass=f=80,loudnorm" public/audio/laugh.ogg
   ```
3. Tell Claude "use public/audio/laugh.ogg for the summit laugh" and it gets wired into `src/audio/cues.ts`. The same goes for guitar, harmonium and Casio.

## Colours and grading of a scene

Each scene file (for example `src/scenes/p1/Cave.tsx`) ends with a `look:` list: exposure, saturation, tint, paint, ink, bloom, vignette, grain and paper, keyed along the scene. Change the numbers and see it live.
