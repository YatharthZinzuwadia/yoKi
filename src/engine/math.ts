// Small, allocation-free math helpers used every frame.

export const clamp = (v: number, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v)
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const invLerp = (a: number, b: number, v: number) => (b === a ? 0 : (v - a) / (b - a))
/** Map v from [a,b] to [0,1], clamped. */
export const range = (v: number, a: number, b: number) => clamp(invLerp(a, b, v))
export const remap = (v: number, a: number, b: number, c: number, d: number) => lerp(c, d, range(v, a, b))

export const smoothstep = (a: number, b: number, v: number) => {
  const t = range(v, a, b)
  return t * t * (3 - 2 * t)
}
export const smootherstep = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)

/** 0 → 1 → 0 bump across [a,b] with soft edges of width `edge` (fraction of the range). */
export const bump = (v: number, a: number, b: number, edge = 0.25) => {
  const w = (b - a) * edge
  return smoothstep(a, a + w, v) * (1 - smoothstep(b - w, b, v))
}

/** Frame-rate independent exponential damping (lambda ≈ responsiveness, 1/s). */
export const damp = (current: number, target: number, lambda: number, dt: number) =>
  lerp(current, target, 1 - Math.exp(-lambda * dt))

export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
export const easeInCubic = (t: number) => t * t * t
export const easeOutExpo = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t))

/** Deterministic hash-based pseudo random in [0,1). */
export const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123
  return s - Math.floor(s)
}

/** Seeded PRNG (mulberry32) for procedural generation. */
export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// --- 3D value noise (cheap, CPU-side, for procedural geometry) --------------
const P = new Uint8Array(512)
{
  const r = rng(1337)
  const p = Array.from({ length: 256 }, (_, i) => i)
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[p[i], p[j]] = [p[j], p[i]]
  }
  for (let i = 0; i < 512; i++) P[i] = p[i & 255]
}
const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)
const grad = (h: number, x: number, y: number, z: number) => {
  const u = h < 8 ? x : y
  const v = h < 4 ? y : h === 12 || h === 14 ? x : z
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v)
}
/** Classic 3D Perlin noise in [-1, 1]. */
export function noise3(x: number, y: number, z: number) {
  const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255
  x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z)
  const u = fade(x), v = fade(y), w = fade(z)
  const A = P[X] + Y, AA = P[A] + Z, AB = P[A + 1] + Z
  const B = P[X + 1] + Y, BA = P[B] + Z, BB = P[B + 1] + Z
  return lerp(
    lerp(lerp(grad(P[AA] & 15, x, y, z), grad(P[BA] & 15, x - 1, y, z), u),
      lerp(grad(P[AB] & 15, x, y - 1, z), grad(P[BB] & 15, x - 1, y - 1, z), u), v),
    lerp(lerp(grad(P[AA + 1] & 15, x, y, z - 1), grad(P[BA + 1] & 15, x - 1, y, z - 1), u),
      lerp(grad(P[AB + 1] & 15, x, y - 1, z - 1), grad(P[BB + 1] & 15, x - 1, y - 1, z - 1), u), v),
    w,
  )
}
export function fbm3(x: number, y: number, z: number, octaves = 4) {
  let a = 0.5, f = 1, s = 0
  for (let i = 0; i < octaves; i++) {
    s += a * noise3(x * f, y * f, z * f)
    f *= 2.03
    a *= 0.5
  }
  return s
}
