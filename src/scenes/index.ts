// Scene registry: stitches every scene's camera keys, looks and fog into
// single continuous tracks for the whole take.

import { Color } from 'three'
import { RANGES, type SceneRange } from '../content/film'
import { DEFAULT_LOOK, flattenLook, type Look } from '../content/looks'
import { LinearTrack, Track, type Key } from '../engine/track'
import { makePlaceholder } from './Placeholder'
import type { SceneSpec } from './types'
import { P1_SPECS } from './p1'

const BUILT: SceneSpec[] = [...P1_SPECS]

const byId = new Map(BUILT.map((s) => [s.id, s]))

export const SPECS: { spec: SceneSpec; range: SceneRange }[] = RANGES.map((range, i) => ({
  range,
  spec: byId.get(range.id) ?? makePlaceholder(range, i),
}))

// ── camera track: [px,py,pz, ax,ay,az, fov, roll] ─────────────────────────
export const cameraTrack = (() => {
  const keys: Key<number[]>[] = []
  for (const { spec, range } of SPECS) {
    spec.camera.forEach((k, idx) => {
      const t = range.start + k.u
      const v = [...k.pos, ...k.at, k.fov ?? 55, k.roll ?? 0]
      const prev = keys[keys.length - 1]
      // a key at exactly the same time as the previous scene's last key replaces it
      if (prev && Math.abs(prev.t - t) < 1e-6 && !(idx === 0 && k.cut)) keys.pop()
      keys.push({ t, v, tension: k.tension, cut: k.cut })
    })
  }
  return new Track<number[]>(keys)
})()

// ── look track ────────────────────────────────────────────────────────────
export const lookTrack = (() => {
  const keys: { t: number; v: number[] }[] = []
  let state: Look = { ...DEFAULT_LOOK }
  for (const { spec, range } of SPECS) {
    const ls = spec.look ?? [{ u: 0 }]
    for (const { u, ...partial } of ls) {
      state = { ...state, ...partial } as Look
      keys.push({ t: range.start + u, v: flattenLook(state) })
    }
  }
  return new LinearTrack(keys)
})()

// ── fog track: [r,g,b, near, far] (blends across scene boundaries) ────────
export const fogTrack = (() => {
  const keys: { t: number; v: number[] }[] = []
  const c = new Color()
  for (const { spec, range } of SPECS) {
    const f = spec.fog ?? { color: '#08080a', near: 6, far: 40 }
    c.set(f.color)
    const v = [c.r, c.g, c.b, f.near, f.far]
    const edge = Math.min(0.35, (range.end - range.start) * 0.1)
    keys.push({ t: range.start + edge, v }, { t: range.end - edge, v })
  }
  return new LinearTrack(keys)
})()
