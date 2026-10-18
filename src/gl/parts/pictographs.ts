// The cave paintings of Phase 01 — the earliest myth of yoKi, painted the way the
// Bhimbetka rock shelters (Madhya Pradesh, ~10,000+ years old) were painted: red ochre
// and white kaolin stick-figures with hourglass bodies, on sandstone.
//
// HOW THEY ARE MADE (no image files): each painting is drawn at load time into a 2D
// <canvas> with a few "brush" helpers that imitate pigment:
//   • strokes are drawn 3–4 times with tiny random offsets and low alpha, so edges are
//     soft and uneven like a finger or twig brush;
//   • filled shapes are dabbed several times, slightly shifted, for patchy coverage;
//   • `weather()` then erases thousands of tiny specks and a few larger flakes
//     (canvas 'destination-out'), which is what centuries of erosion look like.
// The canvas becomes a texture, and the cave projects it onto the rock as a decal
// (see Cave.tsx / caveLayout.ts), so the paint follows every bump of the stone.

import { CanvasTexture, SRGBColorSpace } from 'three'
import { rng } from '../../engine/math'

type RGB = readonly [number, number, number]
const OCHRE: RGB = [150, 44, 24]
const OCHRE_DEEP: RGB = [118, 32, 20]
const KAOLIN: RGB = [232, 222, 200]
const rgba = (c: RGB, a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a.toFixed(3)})`

type Pt = readonly [number, number]
type Ctx = CanvasRenderingContext2D
type Rand = () => number

// ── brush helpers ─────────────────────────────────────────────────────────────
function brush(ctx: Ctx, pts: readonly Pt[], w: number, col: RGB, r: Rand, passes = 5) {
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (let p = 0; p < passes; p++) {
    ctx.strokeStyle = rgba(col, 0.4 + r() * 0.3)
    ctx.lineWidth = w * (0.7 + r() * 0.5)
    ctx.beginPath()
    pts.forEach(([x, y], i) => {
      const jx = (r() - 0.5) * w * 0.4, jy = (r() - 0.5) * w * 0.4
      if (i) ctx.lineTo(x + jx, y + jy)
      else ctx.moveTo(x + jx, y + jy)
    })
    ctx.stroke()
  }
}

function dab(ctx: Ctx, path: Path2D, col: RGB, r: Rand, passes = 5) {
  for (let p = 0; p < passes; p++) {
    ctx.save()
    ctx.translate((r() - 0.5) * 3, (r() - 0.5) * 3)
    ctx.fillStyle = rgba(col, 0.42 + r() * 0.26)
    ctx.fill(path)
    ctx.restore()
  }
}

const circle = (x: number, y: number, rad: number) => {
  const p = new Path2D()
  p.arc(x, y, rad, 0, Math.PI * 2)
  return p
}
const poly = (pts: readonly Pt[]) => {
  const p = new Path2D()
  pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)))
  p.closePath()
  return p
}
/** Points along a polar arc (degrees, canvas convention: 0° = right, 90° = down). */
const arcPts = (cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n = 16): Pt[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180
    return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry] as const
  })
const dir = (deg: number) => [Math.cos((deg * Math.PI) / 180), Math.sin((deg * Math.PI) / 180)] as const

/** Erosion: specks + flakes erased from the pigment. */
function weather(ctx: Ctx, W: number, H: number, r: Rand, amount = 1) {
  ctx.save()
  ctx.globalCompositeOperation = 'destination-out'
  for (let i = 0; i < 5200 * amount; i++) {
    ctx.fillStyle = `rgba(0,0,0,${(0.12 + r() * 0.55).toFixed(2)})`
    ctx.beginPath()
    ctx.arc(r() * W, r() * H, 0.4 + r() * r() * 2.6, 0, Math.PI * 2)
    ctx.fill()
  }
  for (let i = 0; i < 16 * amount; i++) {
    const cx = r() * W, cy = r() * H, rad = 5 + r() * 20
    const pts: Pt[] = Array.from({ length: 9 }, (_, k) => {
      const a = (k / 9) * Math.PI * 2
      const rr = rad * (0.5 + r() * 0.7)
      return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.7] as const
    })
    ctx.fillStyle = `rgba(0,0,0,${(0.45 + r() * 0.5).toFixed(2)})`
    ctx.fill(poly(pts))
  }
  ctx.restore()
}

// ── the Bhimbetka figure ──────────────────────────────────────────────────────
interface FigureOpts {
  /** [upper arm, forearm] directions in degrees for the arm on the viewer's left. */
  armL: readonly [number, number]
  armR: readonly [number, number]
  /** Leg spread (0 = together, 1 = wide stance). */
  legs?: number
  col?: RGB
  /** Geometric infill inside the torso (Bhimbetka's patterned bodies). */
  infill?: boolean
}
/** A stick-figure with an hourglass body. `feet` = y of the feet, `h` = height in px. */
function figure(ctx: Ctx, x: number, feet: number, h: number, o: FigureOpts, r: Rand) {
  const col = o.col ?? OCHRE
  const sh = feet - h * 0.78, waist = feet - h * 0.58, hip = feet - h * 0.46
  const sw = h * 0.12, hw = h * 0.085
  const torso = poly([[x - sw, sh], [x + sw, sh], [x, waist], [x + hw, hip], [x - hw, hip], [x, waist]])
  dab(ctx, torso, col, r)
  if (o.infill) {
    ctx.save()
    ctx.clip(torso)
    ctx.globalCompositeOperation = 'destination-out'
    ctx.strokeStyle = 'rgba(0,0,0,0.55)'
    ctx.lineWidth = 1.6
    for (let k = -h; k < h; k += 7) {
      ctx.beginPath()
      ctx.moveTo(x + k, sh - 5)
      ctx.lineTo(x + k + h * 0.4, hip + 5)
      ctx.stroke()
    }
    ctx.restore()
  }
  dab(ctx, circle(x, feet - h * 0.88, h * 0.068), col, r)
  brush(ctx, [[x, feet - h * 0.83], [x, sh]], h * 0.028, col, r, 3) // neck
  const w = h * 0.032
  const arm = (sx: number, [u, f]: readonly [number, number]) => {
    const [ux, uy] = dir(u), [fx, fy] = dir(f)
    const ex = sx + ux * h * 0.2, ey = sh + uy * h * 0.2
    brush(ctx, [[sx, sh], [ex, ey], [ex + fx * h * 0.18, ey + fy * h * 0.18]], w, col, r)
  }
  arm(x - sw, o.armL)
  arm(x + sw, o.armR)
  const spread = (o.legs ?? 0.4) * h * 0.14
  brush(ctx, [[x - hw * 0.6, hip], [x - spread * 0.6, feet - h * 0.22], [x - spread, feet]], w * 1.1, col, r)
  brush(ctx, [[x + hw * 0.6, hip], [x + spread * 0.6, feet - h * 0.22], [x + spread, feet]], w * 1.1, col, r)
}

// ── the five paintings ────────────────────────────────────────────────────────
export interface Pictograph {
  id: string
  numeral: string
  title: string
  /** Catalogue line 1 (annotation) and line 2 (detail + age). */
  label: string
  sub: string
  /** Where along the cave's centre curve (0..1), which wall (+1 right / −1 left), how high. */
  s: number
  side: 1 | -1
  y: number
  /** Painted size on the rock, metres. */
  size: number
  draw: (ctx: Ctx, r: Rand) => void
}

const W = 512

export const PICTOGRAPHS: Pictograph[] = [
  {
    id: 'p1.pic.born',
    numeral: 'I',
    title: 'born',
    label: 'YK·01·001 — pictograph I — born',
    sub: 'age 0 · red ochre, kaolin · a mother, a child, a ring of light',
    s: 0.2,
    side: 1,
    y: 1.6,
    size: 2.1,
    draw(ctx, r) {
      // the mother, tall, cradling; the child inside a ring of white rays
      figure(ctx, 256, 478, 330, { armL: [112, 30], armR: [68, 150], legs: 0.35, infill: true }, r)
      const cx = 258, cy = 242
      for (let k = 0; k < 18; k++) {
        const a = (k / 18) * 360
        const [dx, dy] = dir(a)
        brush(ctx, [[cx + dx * 40, cy + dy * 34], [cx + dx * 62, cy + dy * 54]], 5, KAOLIN, r, 3)
      }
      const baby = new Path2D()
      baby.ellipse(cx - 6, cy + 4, 24, 11, -0.15, 0, Math.PI * 2)
      dab(ctx, baby, OCHRE_DEEP, r, 5)
      dab(ctx, circle(cx + 22, cy - 3, 9), OCHRE_DEEP, r, 5)
    },
  },
  {
    id: 'p1.pic.gaze',
    numeral: 'II',
    title: 'the gaze',
    label: 'YK·01·002 — pictograph II — the gaze',
    sub: 'age 2–5 · a small one, and twelve eyes on him',
    s: 0.33,
    side: -1,
    y: 1.65,
    size: 2.2,
    draw(ctx, r) {
      figure(ctx, 256, 350, 170, { armL: [120, 100], armR: [60, 80], legs: 0.3 }, r)
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * 360 - 90
        const [dx, dy] = dir(a)
        const ex = 256 + dx * 185, ey = 268 + dy * 175
        // an almond eye, its pupil turned toward the child
        const top = arcPts(ex, ey + 6, 22, 16, 200, 340, 10)
        const bot = arcPts(ex, ey - 6, 22, 14, 20, 160, 10)
        brush(ctx, top, 7, OCHRE, r, 4)
        brush(ctx, bot, 7, OCHRE, r, 4)
        dab(ctx, circle(ex - dx * 5, ey - dy * 4, 8), OCHRE_DEEP, r, 6)
      }
    },
  },
  {
    id: 'p1.pic.pose',
    numeral: 'III',
    title: 'the pose',
    label: 'YK·01·003 — pictograph III — the pose',
    sub: 'age 6–9 · a box that makes light · modelling',
    s: 0.46,
    side: 1,
    y: 1.6,
    size: 2.2,
    draw(ctx, r) {
      // the child posing — one hand on the hip, one behind the head
      figure(ctx, 160, 440, 250, { armL: [140, 40], armR: [-60, -150], legs: 0.55, infill: true }, r)
      // the box camera on a tripod, and its rays
      dab(ctx, poly([[318, 180], [400, 176], [404, 236], [320, 240]]), OCHRE_DEEP, r, 5)
      brush(ctx, arcPts(312, 208, 17, 17, 0, 360, 20), 5, KAOLIN, r, 3)
      brush(ctx, [[360, 240], [326, 360]], 6, OCHRE, r)
      brush(ctx, [[362, 240], [364, 368]], 6, OCHRE, r)
      brush(ctx, [[364, 240], [402, 360]], 6, OCHRE, r)
      for (let k = -2; k <= 2; k++) {
        const a = 180 + k * 11
        const [dx, dy] = dir(a)
        brush(ctx, [[292 + dx * 10, 208 + dy * 10], [292 + dx * 70, 208 + dy * 70]], 4, KAOLIN, r, 3)
      }
      // a white sun-burst: the flash
      for (let k = 0; k < 10; k++) {
        const [dx, dy] = dir(k * 36)
        brush(ctx, [[312 + dx * 22, 152 + dy * 22], [312 + dx * 34, 152 + dy * 34]], 3.5, KAOLIN, r, 3)
      }
    },
  },
  {
    id: 'p1.pic.home',
    numeral: 'IV',
    title: 'home',
    label: 'YK·01·004 — pictograph IV — home',
    sub: 'age 7–12 · two tall, two small · a broken line between the tall ones',
    s: 0.59,
    side: -1,
    y: 1.65,
    size: 2.4,
    draw(ctx, r) {
      // the two tall ones point at each other
      figure(ctx, 118, 470, 300, { armL: [-130, -150], armR: [-8, -18], legs: 0.45, infill: true }, r)
      figure(ctx, 394, 470, 290, { armL: [190, 200], armR: [-60, -95], legs: 0.45, infill: true }, r)
      // the broken line — white kaolin, jagged, between the two tall ones
      const z: Pt[] = []
      for (let k = 0; k <= 9; k++) z.push([178 + k * 16, 212 + (k % 2 ? -22 : 22)])
      brush(ctx, z, 9, KAOLIN, r, 6)
      // the eldest between them, arms out; the youngest holding on
      figure(ctx, 250, 470, 150, { armL: [175, 182], armR: [5, -2], legs: 0.6 }, r)
      figure(ctx, 308, 470, 92, { armL: [-140, -160], armR: [60, 90], legs: 0.4, col: OCHRE_DEEP }, r)
    },
  },
  {
    id: 'p1.pic.mark',
    numeral: 'V',
    title: 'the mark',
    label: 'YK·01·005 — pictograph V — the mark',
    sub: 'right hand, stencilled · a ring at the wrist · the only signed work in the cave',
    s: 0.72,
    side: 1,
    y: 1.55,
    size: 1.8,
    draw(ctx, r) {
      // a hand stencil: pigment sprayed around a right hand pressed to the rock. The kada
      // on the wrist blocked the spray too — so the ring shows as a band of bare stone,
      // wider than the wrist.
      const cx = 256, cy = 300
      // the dense core of the blown pigment (the mouth-spray technique leaves a soft cloud)
      const g = ctx.createRadialGradient(cx, cy - 20, 40, cx, cy, 240)
      g.addColorStop(0, rgba(OCHRE, 0.88))
      g.addColorStop(0.55, rgba(OCHRE, 0.7))
      g.addColorStop(1, rgba(OCHRE, 0))
      ctx.fillStyle = g
      ctx.fillRect(0, 0, W, W)
      for (let i = 0; i < 46000; i++) {
        const a = r() * Math.PI * 2
        const d = Math.sqrt(r())
        const x = cx + Math.cos(a) * d * 225, y = cy + Math.sin(a) * d * 250
        const fall = Math.pow(1 - d, 0.45)
        ctx.fillStyle = rgba(r() > 0.08 ? OCHRE : OCHRE_DEEP, fall * (0.14 + r() * 0.3))
        ctx.beginPath()
        ctx.arc(x, y, 0.8 + r() * 2.2, 0, Math.PI * 2)
        ctx.fill()
      }
      const hand = new Path2D()
      const finger = (x0: number, y0: number, x1: number, y1: number, w: number) => {
        const len = Math.hypot(x1 - x0, y1 - y0)
        const ang = Math.atan2(y1 - y0, x1 - x0)
        const f = new Path2D()
        f.roundRect(0, -w / 2, len, w, w / 2)
        hand.addPath(f, new DOMMatrix().translateSelf(x0, y0).rotateSelf((ang * 180) / Math.PI))
      }
      hand.roundRect(196, 222, 132, 140, 34) // palm
      finger(212, 240, 200, 116, 30) // index
      finger(248, 232, 246, 92, 31) // middle
      finger(284, 236, 292, 106, 29) // ring
      finger(316, 252, 336, 150, 25) // little
      finger(206, 316, 134, 226, 34) // thumb (left — a right hand, back toward us)
      hand.roundRect(218, 340, 92, 190, 18) // wrist and forearm
      const kada = new Path2D()
      kada.roundRect(184, 396, 160, 28, 12)
      ctx.save()
      ctx.globalCompositeOperation = 'destination-out'
      ctx.fillStyle = 'rgba(0,0,0,1)'
      ctx.fill(hand)
      ctx.fill(kada)
      ctx.restore()
    },
  },
]

/** Draw a pictograph into a texture (cached per id). */
const cache = new Map<string, CanvasTexture>()
export function pictographTexture(p: Pictograph) {
  let t = cache.get(p.id)
  if (t) return t
  const c = document.createElement('canvas')
  c.width = c.height = W
  const ctx = c.getContext('2d')!
  const r = rng(p.id.length * 977 + p.numeral.length * 131)
  p.draw(ctx, r)
  weather(ctx, W, W, r, p.id === 'p1.pic.mark' ? 0.5 : 1)
  t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 8
  cache.set(p.id, t)
  return t
}
