# Guide 01 — Run the project (copy-paste)

Everything below is for your machine: CachyOS, Node via nvm, Yarn 1.22, RTX 5050.

## First time only

```bash
cd "/home/yoki/Desktop/work shi/yoKi/yoki-mythobiography-v2.0-final-vision-pack"
yarn
```

## Every time: start the film

```bash
cd "/home/yoki/Desktop/work shi/yoKi/yoki-mythobiography-v2.0-final-vision-pack"
yarn dev
```

Then open **http://localhost:5173** in your browser.

### Use your RTX, not the Intel iGPU (important on the Victus)

Linux browsers often run on the Intel iGPU by default. Launch them on the NVIDIA GPU:

```bash
prime-run firefox http://localhost:5173
```

To check which GPU is in use, open http://localhost:5173/?debug and look at the fps counter top-left. In Firefox you can also go to `about:support` → "WebGL 2 Driver Renderer": it should say NVIDIA.

## Handy URLs while working

| URL | What it does |
|---|---|
| `http://localhost:5173/?debug` | FPS, quality tier, film time and scene id overlay |
| `http://localhost:5173/?scene=p1.gallery` | Jump straight to a scene (ids are in `src/content/film.ts`) |
| `http://localhost:5173/?t=28.5` | Jump to an exact film time |

**Keys inside the film:**

| Key | Action |
|---|---|
| Scroll, Space, PageUp/PageDown, arrows | Move through the film |
| `M` | Mute |
| `1`–`5` | Jump to a phase |
| `0` | Back to the start |

## See it on your phone (same Wi-Fi)

`yarn dev` prints a "Network" address, for example `http://192.168.1.29:5173`. Open that on the phone.

## Build the real, optimised site

```bash
yarn build
yarn preview
```

`yarn preview` serves the built site on http://localhost:4173. The `dist/` folder is what gets deployed (see Guide 04).

## Screenshots of the whole film (visual QA)

With `yarn dev` running, in a second terminal:

```bash
yarn shots                 # one shot every 3 units of film time
yarn shots 2,12.7,28.3     # specific film times
```

PNGs land in `tools/qa/out/`.

## Regenerate the in-film photographs (optional)

```bash
tools/imagegen/run.sh tools/imagegen/prompts/p1.json --force
```

Images are written to `public/images/`. The model runs offline on your GPU, at roughly 40 seconds per image.

## If something's wrong

| Problem | Fix |
|---|---|
| Black screen / "needs WebGL2" | Update the browser. Make sure hardware acceleration is on: Firefox → Settings → Performance. |
| Choppy | Launch with `prime-run` (above). Close other GPU-heavy apps. |
| No sound | Click the page (browsers need a click before sound). Check the waveform icon in the bottom pill. Press `M` to toggle. |
| `yarn: command not found` | `npm i -g yarn` once. This is the only npm command you'll ever need. |
