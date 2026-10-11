// Keyframe tracks along film time.
// Smooth cubic Hermite interpolation with Catmull-Rom tangents (non-uniform time),
// per-key tension (1 = hold/stop, 0 = flowing), and `cut` keys that create
// discontinuities (hidden cuts, which the scene must mask).

export interface Key<V> {
  t: number
  v: V
  /** 0 → flowing Catmull-Rom tangent, 1 → zero velocity (a hold). */
  tension?: number
  /** This key starts a new continuous segment (no interpolation from the previous key). */
  cut?: boolean
}

type Lerpable = number | readonly number[]

function sub<V extends Lerpable>(a: V, b: V): number[] | number {
  if (typeof a === 'number') return a - (b as number)
  const out: number[] = []
  for (let i = 0; i < a.length; i++) out[i] = a[i] - (b as readonly number[])[i]
  return out
}

/**
 * A keyframe track. Values are numbers or fixed-length number arrays.
 * `sample(t, out)` writes into `out` for arrays (no allocation per frame).
 */
export class Track<V extends Lerpable> {
  readonly keys: Key<V>[]
  private tangents: (number | number[])[] = []
  readonly dims: number

  constructor(keys: Key<V>[]) {
    this.keys = [...keys].sort((a, b) => a.t - b.t)
    if (!this.keys.length) throw new Error('Track needs at least one key')
    const v0 = this.keys[0].v
    this.dims = typeof v0 === 'number' ? 1 : v0.length
    this.computeTangents()
  }

  private computeTangents() {
    const k = this.keys
    const n = k.length
    this.tangents = k.map((key, i) => {
      const tension = key.tension ?? 0
      // Neighbours inside the same continuous segment only.
      const prev = i > 0 && !key.cut ? k[i - 1] : null
      const next = i < n - 1 && !k[i + 1].cut ? k[i + 1] : null
      const zero = this.dims === 1 ? 0 : new Array(this.dims).fill(0)
      if (!prev && !next) return zero
      const a = prev ?? key
      const b = next ?? key
      const dt = b.t - a.t
      if (dt <= 0) return zero
      const d = sub(b.v, a.v)
      const s = (1 - tension) / dt
      return typeof d === 'number' ? d * s : d.map((x) => x * s)
    })
  }

  /** Index of the segment start key for time t. */
  private seg(t: number) {
    const k = this.keys
    let lo = 0, hi = k.length - 1
    if (t <= k[0].t) return -1
    if (t >= k[hi].t) return hi
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1
      if (k[mid].t <= t) lo = mid
      else hi = mid
    }
    return lo
  }

  sampleNumber(t: number): number {
    const k = this.keys as Key<number>[]
    const i = this.seg(t)
    if (i < 0) return k[0].v
    if (i >= k.length - 1) return k[k.length - 1].v
    const a = k[i], b = k[i + 1]
    if (b.cut) return a.v // hold until the cut instant
    const h = b.t - a.t
    const u = (t - a.t) / h
    const u2 = u * u, u3 = u2 * u
    const h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2
    return h00 * a.v + h10 * h * (this.tangents[i] as number) + h01 * b.v + h11 * h * (this.tangents[i + 1] as number)
  }

  sampleArray(t: number, out: number[]): number[] {
    const k = this.keys as Key<readonly number[]>[]
    const i = this.seg(t)
    const d = this.dims
    if (i < 0 || i >= k.length - 1) {
      const src = i < 0 ? k[0].v : k[k.length - 1].v
      for (let j = 0; j < d; j++) out[j] = src[j]
      return out
    }
    const a = k[i], b = k[i + 1]
    if (b.cut) {
      for (let j = 0; j < d; j++) out[j] = a.v[j]
      return out
    }
    const h = b.t - a.t
    const u = (t - a.t) / h
    const u2 = u * u, u3 = u2 * u
    const h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2
    const ta = this.tangents[i] as number[], tb = this.tangents[i + 1] as number[]
    for (let j = 0; j < d; j++) out[j] = h00 * a.v[j] + h10 * h * ta[j] + h01 * b.v[j] + h11 * h * tb[j]
    return out
  }
}

/** Linear (non-smooth) track for values that must not overshoot (exposure, fades). */
export class LinearTrack {
  readonly keys: { t: number; v: number[] }[]
  readonly dims: number
  constructor(keys: { t: number; v: number[] }[]) {
    this.keys = [...keys].sort((a, b) => a.t - b.t)
    this.dims = this.keys[0].v.length
  }
  sample(t: number, out: number[]) {
    const k = this.keys
    if (t <= k[0].t) return copy(out, k[0].v)
    if (t >= k[k.length - 1].t) return copy(out, k[k.length - 1].v)
    let i = 0
    while (i < k.length - 2 && k[i + 1].t <= t) i++
    const a = k[i], b = k[i + 1]
    const u = (t - a.t) / (b.t - a.t)
    const s = u * u * (3 - 2 * u) // smoothstep between keys: no kinks, no overshoot
    for (let j = 0; j < this.dims; j++) out[j] = a.v[j] + (b.v[j] - a.v[j]) * s
    return out
  }
}

function copy(out: number[], src: number[]) {
  for (let j = 0; j < src.length; j++) out[j] = src[j]
  return out
}
