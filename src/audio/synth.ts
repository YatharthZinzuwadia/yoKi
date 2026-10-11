// Offline synthesis of every sound into Float32 buffers (done once at entry,
// so playback never costs CPU or hitches). All procedural, all original.

import { rng } from '../engine/math'

export const SR = 44100

type Mono = Float32Array
const buf = (sec: number) => new Float32Array(Math.floor(sec * SR))

function normalize(b: Mono, peak = 0.9) {
  let m = 0
  for (let i = 0; i < b.length; i++) m = Math.max(m, Math.abs(b[i]))
  if (m > 0) for (let i = 0; i < b.length; i++) b[i] *= peak / m
  return b
}

/** One-pole low-pass in place. */
function lowpass(b: Mono, hz: number) {
  const a = Math.exp((-2 * Math.PI * hz) / SR)
  let y = 0
  for (let i = 0; i < b.length; i++) b[i] = y = (1 - a) * b[i] + a * y
  return b
}
function highpass(b: Mono, hz: number) {
  const a = Math.exp((-2 * Math.PI * hz) / SR)
  let y = 0, x1 = 0
  for (let i = 0; i < b.length; i++) {
    const x = b[i]
    y = a * (y + x - x1)
    x1 = x
    b[i] = y
  }
  return b
}
/** Two-pole resonant band-pass (biquad) in place. */
function bandpass(b: Mono, hz: number, q: number) {
  const w = (2 * Math.PI * hz) / SR, al = Math.sin(w) / (2 * q), c = Math.cos(w)
  const b0 = al, b2 = -al, a0 = 1 + al, a1 = -2 * c, a2 = 1 - al
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0
  for (let i = 0; i < b.length; i++) {
    const x = b[i]
    const y = (b0 * x + b2 * x2 - a1 * y1 - a2 * y2) / a0
    x2 = x1; x1 = x; y2 = y1; y1 = y
    b[i] = y
  }
  return b
}

function white(sec: number, seed = 1) {
  const r = rng(seed), b = buf(sec)
  for (let i = 0; i < b.length; i++) b[i] = r() * 2 - 1
  return b
}
function brown(sec: number, seed = 2) {
  const r = rng(seed), b = buf(sec)
  let y = 0
  for (let i = 0; i < b.length; i++) {
    y = (y + 0.02 * (r() * 2 - 1)) / 1.02
    b[i] = y * 3.5
  }
  return b
}
function pink(sec: number, seed = 3) {
  const r = rng(seed), b = buf(sec)
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
  for (let i = 0; i < b.length; i++) {
    const w = r() * 2 - 1
    b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852
    b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898
    b[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11
    b6 = w * 0.115926
  }
  return b
}

/** Crossfade the end into the start so a loop is seamless. */
function loopify(b: Mono, fadeSec = 0.5) {
  const n = Math.floor(fadeSec * SR)
  const out = b.slice(0, b.length - n)
  for (let i = 0; i < n; i++) {
    const k = i / n
    out[i] = out[i] * k + b[b.length - n + i] * (1 - k)
  }
  return out
}


// ── beds (loops) ────────────────────────────────────────────────────────────
export function bedAir() {
  return normalize(loopify(lowpass(brown(9, 11), 420)), 0.5)
}
export function bedRoom() {
  const b = lowpass(pink(9, 12), 900)
  highpass(b, 60)
  return normalize(loopify(b), 0.35)
}
export function bedWind() {
  const b = pink(12, 13)
  // slow gusts: amplitude + band movement approximated by mixing two bandpassed copies
  const a = bandpass(b.slice(), 380, 0.7), c = bandpass(b.slice(), 900, 0.9)
  const out = buf(12)
  for (let i = 0; i < out.length; i++) {
    const t = i / SR
    const g = 0.55 + 0.45 * Math.sin(t * 0.52 + Math.sin(t * 0.21) * 2)
    out[i] = a[i] * g + c[i] * (1 - g) * 0.6
  }
  return normalize(loopify(out, 1), 0.5)
}
export function bedHum() {
  const out = buf(6)
  for (let i = 0; i < out.length; i++) {
    const t = i / SR
    out[i] = Math.sin(2 * Math.PI * 50 * t) * 0.5 + Math.sin(2 * Math.PI * 100 * t) * 0.3 + Math.sin(2 * Math.PI * 150 * t) * 0.12
  }
  const n = lowpass(white(6, 14), 3000)
  for (let i = 0; i < out.length; i++) out[i] += n[i] * 0.04
  return normalize(out, 0.3)
}
export function bedCrowd() {
  // murmur: many band-passed noise "voices" with syllabic amplitude
  const out = buf(10), r = rng(15)
  for (let v = 0; v < 14; v++) {
    const n = bandpass(pink(10, 100 + v), 300 + r() * 900, 3)
    const rate = 2.5 + r() * 3, ph = r() * 10
    for (let i = 0; i < out.length; i++) {
      const t = i / SR
      const syl = Math.max(0, Math.sin(t * rate * 6.283 + ph) * Math.sin(t * rate * 1.7 + ph * 2))
      out[i] += n[i] * syl
    }
  }
  return normalize(loopify(out, 1), 0.4)
}

/** A slow drone chord; frequencies snapped so the loop is seamless. */
export function bedDrone(freqs: number[], sec = 8, seed = 20) {
  const out = buf(sec), r = rng(seed)
  for (const f0 of freqs) {
    for (let d = -1; d <= 1; d++) {
      const f = Math.round((f0 * (1 + d * 0.0035)) * sec) / sec
      const ph = r() * 6.283
      const am = Math.round((0.06 + r() * 0.1) * sec) / sec
      for (let i = 0; i < out.length; i++) {
        const t = i / SR
        out[i] += Math.sin(2 * Math.PI * f * t + ph) * (0.6 + 0.4 * Math.sin(2 * Math.PI * am * t + ph)) * (d === 0 ? 1 : 0.5)
      }
    }
  }
  lowpass(out, 1800)
  return normalize(out, 0.5)
}

// ── one-shots ───────────────────────────────────────────────────────────────
export function drip(seed = 1) {
  const r = rng(seed), n = Math.floor(0.25 * SR), b = buf(0.25)
  const f0 = 900 + r() * 900
  let ph = 0
  for (let i = 0; i < n; i++) {
    const t = i / SR
    const f = f0 * (0.45 + 0.55 * Math.exp(-t * 40))
    ph += (2 * Math.PI * f) / SR
    b[i] = Math.sin(ph) * Math.exp(-t * 28) * (t < 0.002 ? t / 0.002 : 1)
  }
  return normalize(b, 0.7)
}
export function shutter() {
  const b = buf(0.35), n = white(0.35, 30)
  bandpass(n, 3200, 1.2)
  for (let i = 0; i < b.length; i++) {
    const t = i / SR
    const c1 = Math.exp(-t * 300), c2 = t > 0.11 ? Math.exp(-(t - 0.11) * 260) : 0
    b[i] = n[i] * (c1 + c2 * 0.8)
  }
  return normalize(b, 0.8)
}
export function flash() {
  const len = 0.9, b = buf(len)
  let ph = 0
  for (let i = 0; i < b.length; i++) {
    const t = i / SR
    const f = 1800 + 5200 * Math.min(1, t / 0.6)
    ph += (2 * Math.PI * f) / SR
    b[i] = Math.sin(ph) * 0.08 * Math.min(1, t / 0.05) * (t < 0.62 ? 1 : 0)
  }
  // the pop
  const pop = white(0.3, 31)
  lowpass(pop, 2500)
  for (let i = 0; i < pop.length; i++) {
    const j = Math.floor(0.62 * SR) + i
    if (j < b.length) b[j] += pop[i] * Math.exp(-(i / SR) * 40) * 0.9
  }
  return normalize(b, 0.8)
}
export function clap(seed = 1) {
  const n = white(0.18, 40 + seed)
  bandpass(n, 1100 + seed * 37, 1.1)
  for (let i = 0; i < n.length; i++) {
    const t = i / SR
    const multi = Math.exp(-t * 90) + (t > 0.008 ? Math.exp(-(t - 0.008) * 70) * 0.6 : 0) + (t > 0.016 ? Math.exp(-(t - 0.016) * 50) * 0.4 : 0)
    n[i] *= multi
  }
  return normalize(n, 0.8)
}
export function applause(sec = 4.5) {
  const out = buf(sec), r = rng(41)
  const claps = [0, 1, 2, 3].map((s) => clap(s))
  const count = Math.floor(sec * 140)
  for (let k = 0; k < count; k++) {
    const t = r() * sec
    const shape = Math.sin(Math.PI * Math.min(1, t / sec)) ** 0.7
    if (r() > shape) continue
    const c = claps[Math.floor(r() * 4)]
    const start = Math.floor(t * SR), g = 0.2 + r() * 0.5
    for (let i = 0; i < c.length && start + i < out.length; i++) out[start + i] += c[i] * g
  }
  lowpass(out, 6000)
  return normalize(out, 0.7)
}
export function shatter() {
  const len = 1.6, out = buf(len), r = rng(50)
  const n = white(len, 51)
  highpass(n, 1500)
  for (let i = 0; i < out.length; i++) out[i] = n[i] * Math.exp(-(i / SR) * 9) * 0.6
  for (let k = 0; k < 40; k++) {
    const t0 = Math.pow(r(), 1.8) * len * 0.9, f = 2500 + r() * 6000, a = 0.1 + r() * 0.3
    const s = Math.floor(t0 * SR)
    for (let i = 0; i < 0.12 * SR && s + i < out.length; i++) out[s + i] += Math.sin((2 * Math.PI * f * i) / SR) * Math.exp(-(i / SR) * 45) * a
  }
  return normalize(out, 0.85)
}
/** Karplus–Strong plucked string. */
export function pluck(freq: number, sec = 2.5, bright = 0.5, seed = 60) {
  const r = rng(seed), out = buf(sec)
  const period = Math.max(2, Math.round(SR / freq))
  const ring = new Float32Array(period)
  for (let i = 0; i < period; i++) ring[i] = r() * 2 - 1
  let idx = 0
  const damp = 0.996 - (1 - bright) * 0.004
  for (let i = 0; i < out.length; i++) {
    const a = ring[idx], b = ring[(idx + 1) % period]
    const v = (a + b) * 0.5 * damp
    ring[idx] = v
    out[i] = a
    idx = (idx + 1) % period
  }
  return normalize(out, 0.7)
}
export function thud(freq = 55, sec = 0.9) {
  const out = buf(sec)
  let ph = 0
  const n = lowpass(white(sec, 70), 400)
  for (let i = 0; i < out.length; i++) {
    const t = i / SR
    ph += (2 * Math.PI * freq * (1 + 1.5 * Math.exp(-t * 18))) / SR
    out[i] = Math.sin(ph) * Math.exp(-t * 5) + n[i] * Math.exp(-t * 25) * 0.8
  }
  return normalize(out, 0.95)
}
export function breath(sec = 2.6, seed = 80) {
  const n = pink(sec, seed)
  bandpass(n, 900, 0.6)
  const out = buf(sec)
  for (let i = 0; i < out.length; i++) {
    const t = i / SR
    const inhale = Math.sin(Math.PI * Math.min(1, t / (sec * 0.45))) * (t < sec * 0.45 ? 1 : 0)
    const exhale = t > sec * 0.5 ? Math.sin(Math.PI * Math.min(1, (t - sec * 0.5) / (sec * 0.5))) * 0.8 : 0
    out[i] = n[i] * (inhale + exhale)
  }
  return normalize(out, 0.6)
}
export function squeak(sec = 0.5, seed = 90) {
  const r = rng(seed), out = buf(sec)
  let ph = 0
  const f0 = 1700 + r() * 600
  for (let i = 0; i < out.length; i++) {
    const t = i / SR
    const f = f0 * (1 + 0.08 * Math.sin(t * 47) + 0.05 * Math.sin(t * 13))
    ph += (2 * Math.PI * f) / SR
    out[i] = Math.sin(ph) * Math.sin(Math.PI * (t / sec)) * (0.6 + 0.4 * Math.sin(t * 90))
  }
  return normalize(out, 0.25)
}
export function swell(sec = 3.2) {
  const out = buf(sec)
  const n = lowpass(pink(sec, 95), 1400)
  for (let i = 0; i < out.length; i++) {
    const t = i / SR
    const e = Math.sin(Math.PI * Math.min(1, t / sec)) ** 2
    out[i] = (n[i] * 0.7 + Math.sin(2 * Math.PI * 73.4 * t) * 0.25 + Math.sin(2 * Math.PI * 110 * t) * 0.15) * e
  }
  return normalize(out, 0.7)
}
export function clink(seed = 1) {
  const r = rng(200 + seed), out = buf(0.6)
  const fs = [2400 + r() * 1200, 3900 + r() * 1500, 6100 + r() * 1800]
  for (let i = 0; i < out.length; i++) {
    const t = i / SR
    out[i] = fs.reduce((s, f, k) => s + Math.sin(2 * Math.PI * f * t) * Math.exp(-t * (18 + k * 9)) / (k + 1), 0)
  }
  return normalize(out, 0.5)
}
export function heartbeat() {
  const out = buf(1.1)
  for (const [t0, g] of [[0, 1], [0.24, 0.7]] as const) {
    let ph = 0
    for (let i = 0; i < 0.25 * SR; i++) {
      const t = i / SR
      ph += (2 * Math.PI * (48 + 30 * Math.exp(-t * 30))) / SR
      out[Math.floor(t0 * SR) + i] += Math.sin(ph) * Math.exp(-t * 22) * g
    }
  }
  return normalize(out, 0.9)
}

/** A muffled shout heard through glass: a vowel-formant sawtooth with a jagged pitch contour. */
export function shout(seed = 1, sec = 0.9) {
  const r = rng(500 + seed), out = buf(sec)
  const f0 = 140 + r() * 90
  let ph = 0
  const syl = 2 + Math.floor(r() * 3)
  for (let i = 0; i < out.length; i++) {
    const t = i / SR
    const k = t / sec
    const f = f0 * (1 + 0.25 * Math.sin(k * Math.PI) + 0.06 * Math.sin(t * 31 + seed))
    ph += f / SR
    const saw = 2 * (ph - Math.floor(ph)) - 1
    const env = Math.pow(Math.max(0, Math.sin(Math.PI * ((k * syl) % 1))), 0.6) * Math.sin(Math.PI * k)
    out[i] = saw * env
  }
  const a = bandpass(out.slice(), 650 + r() * 150, 3), b = bandpass(out.slice(), 1150 + r() * 250, 4)
  for (let i = 0; i < out.length; i++) out[i] = a[i] + b[i] * 0.7
  lowpass(out, 900) // through the glass
  return normalize(out, 0.7)
}

/** Generated impulse response for the reverb send (stereo). */
export function impulse(ctx: BaseAudioContext, sec = 3.2, decay = 2.6) {
  const b = ctx.createBuffer(2, Math.floor(sec * ctx.sampleRate), ctx.sampleRate)
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c), r = rng(300 + c)
    for (let i = 0; i < d.length; i++) {
      const t = i / ctx.sampleRate
      d[i] = (r() * 2 - 1) * Math.pow(1 - t / sec, decay) * (t < 0.01 ? t / 0.01 : 1)
    }
  }
  return b
}

