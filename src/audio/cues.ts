// The cue sheet for ambient beds: gain curves along each scene's local time.
// One-shots are fired by the scenes themselves (audio.cue(...)).

import { RANGES, sceneRange } from '../content/film'

type Curve = { bed: string; scene: string; keys: [u: number, gain: number][] }

const CURVES: Curve[] = [
  // 01 — the cave: air + low drone; the gallery: crowd murmur; the house: room tone + hum
  { bed: 'air', scene: 'p1.cave', keys: [[0, 0.5], [7, 0.55], [8, 0.3]] },
  { bed: 'droneLow', scene: 'p1.cave', keys: [[0, 0.0], [2, 0.18], [8, 0.22]] },
  { bed: 'droneLow', scene: 'p1.frame', keys: [[0, 0.22], [5, 0.28]] },
  { bed: 'air', scene: 'p1.frame', keys: [[0, 0.3], [5, 0.2]] },
  { bed: 'crowd', scene: 'p1.gallery', keys: [[0, 0], [1.5, 0.12], [6.0, 0.32], [8.0, 0.0]] },
  { bed: 'droneLow', scene: 'p1.gallery', keys: [[0, 0.28], [8, 0.12], [9, 0.05]] },
  { bed: 'room', scene: 'p1.house', keys: [[0, 0.1], [1, 0.35], [5.2, 0.35], [6, 0.0]] },
  { bed: 'hum', scene: 'p1.house', keys: [[0, 0], [1, 0.08], [5.5, 0.08], [6, 0]] },
  { bed: 'droneDark', scene: 'p1.name', keys: [[0, 0], [1.5, 0.22], [5, 0.26], [6, 0.1]] },
  // placeholders downstream get a quiet bed so silence never feels broken
  ...RANGES.filter((r) => !r.id.startsWith('p1.')).map(
    (r): Curve => ({ bed: r.phase >= 4 ? 'droneDark' : 'wind', scene: r.id, keys: [[0, 0.05], [0.5, 0.16], [r.length - 0.5, 0.16], [r.length, 0.05]] }),
  ),
]

const compiled = CURVES.map((c) => ({ ...c, r: sceneRange(c.scene) }))

function sample(keys: [number, number][], u: number) {
  if (u <= keys[0][0]) return keys[0][1]
  for (let i = 1; i < keys.length; i++) {
    if (u <= keys[i][0]) {
      const [u0, g0] = keys[i - 1], [u1, g1] = keys[i]
      const k = (u - u0) / (u1 - u0)
      return g0 + (g1 - g0) * k * k * (3 - 2 * k)
    }
  }
  return keys[keys.length - 1][1]
}

export const BEDS = {
  level(bed: string, t: number) {
    let sum = 0
    for (const c of compiled) {
      if (c.bed !== bed) continue
      if (t < c.r.start - 0.01 || t > c.r.end + 0.01) continue
      sum += sample(c.keys, t - c.r.start)
    }
    return Math.min(1, sum)
  },
}
