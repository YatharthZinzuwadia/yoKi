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

/** How many candidate lights scenes may push per frame (more than the shader uses). */
const MAX_CANDIDATES = 40

export const sceneLights = {
  /** The lights the shader sees: world-space position (xyz) + radius (w). */
  pos: Array.from({ length: MAX_SCENE_LIGHTS }, () => new Vector4(0, -9999, 0, 1)),
  /** Linear colour (rgb) + intensity (w). */
  col: Array.from({ length: MAX_SCENE_LIGHTS }, () => new Vector4(0, 0, 0, 0)),
  /** View-space positions, filled by the camera rig each frame. */
  view: Array.from({ length: MAX_SCENE_LIGHTS }, () => new Vector4(0, -9999, 0, 1)),
  count: 0,

  // candidates pushed by every scene this frame (overlapping scenes can push more than
  // MAX_SCENE_LIGHTS); `select()` keeps the ones that matter most to the current view
  cPos: Array.from({ length: MAX_CANDIDATES }, () => new Vector4()),
  cCol: Array.from({ length: MAX_CANDIDATES }, () => new Vector4()),
  cScore: new Float32Array(MAX_CANDIDATES),
  cCount: 0,
  order: Array.from({ length: MAX_CANDIDATES }, (_, i) => i),

  reset() {
    for (let i = 0; i < MAX_SCENE_LIGHTS; i++) this.col[i].w = 0
    this.count = 0
    this.cCount = 0
  },

  /** Add a light for this frame. Returns false if even the candidate list is full. */
  push(x: number, y: number, z: number, radius: number, r: number, g: number, b: number, intensity: number) {
    if (this.cCount >= MAX_CANDIDATES || intensity <= 0.0001) return false
    const i = this.cCount++
    this.cPos[i].set(x, y, z, radius)
    this.cCol[i].set(r, g, b, intensity)
    return true
  },

  /**
   * Choose up to MAX_SCENE_LIGHTS of this frame's candidates (called once per frame, after
   * every scene has pushed). Score = intensity × reach, discounted by how far the light's
   * sphere is from the camera, so a bright light around you always beats a dim one far away.
   */
  select(cx: number, cy: number, cz: number) {
    const n = this.cCount
    for (let i = 0; i < n; i++) {
      const p = this.cPos[i]
      const d = Math.max(0, Math.hypot(p.x - cx, p.y - cy, p.z - cz) - p.w)
      this.cScore[i] = this.cCol[i].w * Math.sqrt(p.w) / (1 + d * 0.35)
      this.order[i] = i
    }
    // in-place insertion sort (n ≤ 40; no allocation inside the frame loop)
    const ord = this.order, sc = this.cScore
    for (let i = 1; i < n; i++) {
      const v = ord[i]
      let j = i - 1
      while (j >= 0 && sc[ord[j]] < sc[v]) {
        ord[j + 1] = ord[j]
        j--
      }
      ord[j + 1] = v
    }
    const k = Math.min(n, MAX_SCENE_LIGHTS)
    for (let j = 0; j < k; j++) {
      this.pos[j].copy(this.cPos[ord[j]])
      this.col[j].copy(this.cCol[ord[j]])
    }
    for (let j = k; j < MAX_SCENE_LIGHTS; j++) this.col[j].w = 0
    this.count = k
  },
}
