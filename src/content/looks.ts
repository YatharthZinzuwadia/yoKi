// The look of every moment: grading, paint and ink, keyed along the take.
// Scenes declare partial `LookKey`s (see scene specs); values carry forward
// until changed, and are interpolated smoothly between keys.

export interface Look {
  exposure: number // EV stops
  contrast: number // 1 = neutral
  saturation: number // 1 = neutral
  tint: [number, number, number] // multiplier on the whole image
  lift: number // shadow lift 0..0.15
  liftTint: [number, number, number] // colour of lifted shadows
  paint: number // 0..1 painterly (Kuwahara) mix
  paintRadius: number // brush size in px (1..5)
  ink: number // 0..1 outline strength
  inkColor: [number, number, number]
  inkFar: number // world distance where ink fades out
  bloom: number // bloom intensity
  vignette: number // 0..1
  grain: number // 0..1
  paper: number // 0..1 paper fibre texture
  ca: number // chromatic aberration (madness)
  veilWhite: number // 0..1 flash white-out
  veilBlack: number // 0..1 black-out
  bloodLeft: number // 0..1 the left-eye blood veil
  invert: number // 0..1 negative image
  ao: number // ambient occlusion intensity (N8AO); 0 = off
  aoRadius: number // AO radius in metres
}

export const DEFAULT_LOOK: Look = {
  exposure: 0,
  contrast: 1.05,
  saturation: 1,
  tint: [1, 1, 1],
  lift: 0.0,
  liftTint: [0.1, 0.1, 0.12],
  paint: 0.55,
  paintRadius: 3,
  ink: 0.5,
  inkColor: [0.03, 0.03, 0.04],
  inkFar: 60,
  bloom: 0.9,
  vignette: 0.45,
  grain: 0.35,
  paper: 0.35,
  ca: 0,
  veilWhite: 0,
  veilBlack: 0,
  bloodLeft: 0,
  invert: 0,
  ao: 2.2,
  aoRadius: 1.0,
}

export type LookKey = Partial<Look> & { u: number }

/** Order of components in the flattened look vector. */
export const LOOK_LAYOUT: (keyof Look)[] = Object.keys(DEFAULT_LOOK) as (keyof Look)[]

export function flattenLook(l: Look): number[] {
  const out: number[] = []
  for (const k of LOOK_LAYOUT) {
    const v = l[k]
    if (Array.isArray(v)) out.push(...v)
    else out.push(v as number)
  }
  return out
}

/** Offsets of each look field inside the flattened vector. */
export const LOOK_INDEX = (() => {
  const idx: Record<string, number> = {}
  let i = 0
  for (const k of LOOK_LAYOUT) {
    idx[k] = i
    const v = DEFAULT_LOOK[k]
    i += Array.isArray(v) ? v.length : 1
  }
  return idx as Record<keyof Look, number>
})()

export const LOOK_DIMS = flattenLook(DEFAULT_LOOK).length
