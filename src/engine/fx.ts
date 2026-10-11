// Per-frame effect overrides that scenes write (flashes, shake, pulses).
// Reset by the director every frame, read by the camera rig and post stack.

import { Vector4 } from 'three'

export const fx = {
  /** Added to the look's white veil (camera flashes, white-outs). */
  flash: 0,
  /** Added to the look's black veil. */
  black: 0,
  /** Extra exposure in EV (eye adaptation in the clearing). */
  exposure: 0,
  /** Extra chromatic aberration. */
  ca: 0,
  /** Camera shake amplitude (metres / radians, small). */
  shake: 0,
  /** Extra blood veil on the left of frame. */
  blood: 0,

  reset() {
    this.flash = 0
    this.black = 0
    this.exposure = 0
    this.ca = 0
    this.shake = 0
    this.blood = 0
  },
}

// ── Global environment (one hemisphere + one shadow-casting sun, always) ─────
// The light count never changes; the current scene sets these each frame.

export const env = {
  hemiSky: [0.05, 0.05, 0.06] as [number, number, number],
  hemiGround: [0.01, 0.01, 0.012] as [number, number, number],
  hemiIntensity: 1,
  sunDir: [0.3, 1, 0.2] as [number, number, number],
  sunColor: [1, 0.95, 0.85] as [number, number, number],
  sunIntensity: 0,
  /** Point the sun's shadow camera is centred on (usually near the camera). */
  sunTarget: [0, 0, 0] as [number, number, number],

  reset() {
    this.hemiSky[0] = 0.05; this.hemiSky[1] = 0.05; this.hemiSky[2] = 0.06
    this.hemiGround[0] = 0.01; this.hemiGround[1] = 0.01; this.hemiGround[2] = 0.012
    this.hemiIntensity = 1
    this.sunIntensity = 0
  },
}

// ── Scene lights ────────────────────────────────────────────────────────────
// A fixed pool of point lights implemented in our own shader chunk, so the
// number of lights never changes and no shader ever recompiles mid-film.

export const MAX_SCENE_LIGHTS = 12

export const sceneLights = {
  /** World-space position (xyz) + radius (w). */
  pos: Array.from({ length: MAX_SCENE_LIGHTS }, () => new Vector4(0, -9999, 0, 1)),
  /** Linear colour (rgb) + intensity (w). */
  col: Array.from({ length: MAX_SCENE_LIGHTS }, () => new Vector4(0, 0, 0, 0)),
  /** View-space positions, filled by the camera rig each frame. */
  view: Array.from({ length: MAX_SCENE_LIGHTS }, () => new Vector4(0, -9999, 0, 1)),
  count: 0,

  reset() {
    for (let i = 0; i < MAX_SCENE_LIGHTS; i++) this.col[i].w = 0
    this.count = 0
  },

  /** Add a light for this frame. Returns false if the pool is full. */
  push(x: number, y: number, z: number, radius: number, r: number, g: number, b: number, intensity: number) {
    if (this.count >= MAX_SCENE_LIGHTS || intensity <= 0.0001) return false
    const i = this.count++
    this.pos[i].set(x, y, z, radius)
    this.col[i].set(r, g, b, intensity)
    return true
  },
}
