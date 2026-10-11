// Procedural rock: a tunnel swept along a curve, and a deformed dome chamber.
// Inside-facing, noise-displaced, with vertex-colour crevice darkening.

import { BufferAttribute, BufferGeometry, Color, Vector3, type Curve } from 'three'
import { fbm3, noise3 } from '../../engine/math'

export interface TunnelOpts {
  rings?: number
  sides?: number
  width?: number
  height?: number
  floor?: number
  rough?: number
  seed?: number
  colorA?: string
  colorB?: string
  /** Radius multiplier along the tunnel (s: 0..1). */
  flare?: (s: number) => number
}

export function tunnelGeometry(curve: Curve<Vector3>, o: TunnelOpts = {}) {
  const { rings = 260, sides = 36, width = 2.1, height = 2.7, floor = 0, rough = 0.55, seed = 3, colorA = '#24232a', colorB = '#0c0c0f', flare = () => 1 } = o
  const pos = new Float32Array((rings + 1) * (sides + 1) * 3)
  const col = new Float32Array((rings + 1) * (sides + 1) * 3)
  const ca = new Color(colorA), cb = new Color(colorB), c = new Color()
  const up = new Vector3(0, 1, 0)
  const T = new Vector3(), N = new Vector3(), B = new Vector3(), P = new Vector3(), Q = new Vector3()
  let v = 0
  for (let i = 0; i <= rings; i++) {
    const s = i / rings
    curve.getPointAt(s, P)
    curve.getTangentAt(s, T)
    B.crossVectors(T, up).normalize()
    N.crossVectors(B, T).normalize()
    const f = flare(s)
    const w = width * f * (1 + 0.25 * noise3(s * 6, seed, 0))
    const h = height * f * (1 + 0.2 * noise3(s * 5, seed + 4, 1))
    for (let j = 0; j <= sides; j++) {
      const a = (j / sides) * Math.PI * 2
      const cx = Math.cos(a), cy = Math.sin(a)
      // cross-section: wide ellipse, centre raised so the floor sits at y≈floor
      Q.copy(P).addScaledVector(B, cx * w).addScaledVector(N, cy * h * 0.5 + h * 0.5)
      const n = fbm3(Q.x * 0.55 + seed, Q.y * 0.55, Q.z * 0.55, 5)
      const ridge = Math.abs(noise3(Q.x * 1.7, Q.y * 2.3 + seed, Q.z * 1.7))
      const disp = (n * 0.9 + ridge * 0.35) * rough
      Q.addScaledVector(B, -cx * disp).addScaledVector(N, -cy * disp * 0.8)
      if (Q.y < P.y + floor) {
        // flatten into a walkable floor with gentle noise
        Q.y = P.y + floor + noise3(Q.x * 1.3, Q.z * 1.3, seed) * 0.05
      }
      pos[v * 3] = Q.x
      pos[v * 3 + 1] = Q.y
      pos[v * 3 + 2] = Q.z
      const k = Math.min(1, Math.max(0, 0.5 + n * 1.2 - ridge * 0.4))
      c.copy(cb).lerp(ca, k)
      col[v * 3] = c.r
      col[v * 3 + 1] = c.g
      col[v * 3 + 2] = c.b
      v++
    }
  }
  const idx: number[] = []
  for (let i = 0; i < rings; i++)
    for (let j = 0; j < sides; j++) {
      const a = i * (sides + 1) + j, b = a + sides + 1
      // wound so faces point inward
      idx.push(a, a + 1, b, b, a + 1, b + 1)
    }
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(pos, 3))
  g.setAttribute('color', new BufferAttribute(col, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

/** A large deformed dome (inside-facing), e.g. the chamber of the first frame. */
/**
 * `mouth`: carve an opening facing +z (where a tunnel enters). Without it the dome's
 * outer shell blocks the view from the tunnel and the chamber "pops" into existence
 * the moment the camera crosses the shell (bug fixed 2026-10-12, P1-05).
 */
export function domeGeometry({ radius = 18, center = [0, 6, -54] as readonly number[], seg = 96, rough = 2.2, seed = 9, floorY = 0, colorA = '#1f1e24', colorB = '#08080a', mouth = 0 } = {}) {
  const rings = seg / 2
  const pos = new Float32Array((rings + 1) * (seg + 1) * 3)
  const col = new Float32Array((rings + 1) * (seg + 1) * 3)
  const ca = new Color(colorA), cb = new Color(colorB), c = new Color()
  const Q = new Vector3()
  let v = 0
  for (let i = 0; i <= rings; i++) {
    const th = (i / rings) * Math.PI
    for (let j = 0; j <= seg; j++) {
      const ph = (j / seg) * Math.PI * 2
      const dir = new Vector3(Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph))
      const n = fbm3(dir.x * 2.2 + seed, dir.y * 2.2, dir.z * 2.2, 5)
      const r = radius * (1 + n * (rough / radius) * 2.2)
      Q.set(center[0] + dir.x * r, center[1] + dir.y * r * 0.62, center[2] + dir.z * r)
      if (Q.y < floorY) Q.y = floorY + noise3(Q.x * 0.6, Q.z * 0.6, seed) * 0.08
      pos[v * 3] = Q.x
      pos[v * 3 + 1] = Q.y
      pos[v * 3 + 2] = Q.z
      c.copy(cb).lerp(ca, Math.min(1, Math.max(0, 0.5 + n * 1.4)))
      col[v * 3] = c.r
      col[v * 3 + 1] = c.g
      col[v * 3 + 2] = c.b
      v++
    }
  }
  const idx: number[] = []
  for (let i = 0; i < rings; i++)
    for (let j = 0; j < seg; j++) {
      if (mouth > 0) {
        // direction of this quad's centre from the dome centre
        const th = ((i + 0.5) / rings) * Math.PI, ph = ((j + 0.5) / seg) * Math.PI * 2
        const dz = Math.sin(th) * Math.sin(ph), dy = Math.cos(th), dx = Math.sin(th) * Math.cos(ph)
        // an arched opening: wide at the floor, closing toward the top
        if (dz > 1 - mouth && dy < 0.42 - Math.abs(dx) * 0.6) continue
      }
      const a = i * (seg + 1) + j, b = a + seg + 1
      idx.push(a, b, a + 1, b, b + 1, a + 1)
    }
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(pos, 3))
  g.setAttribute('color', new BufferAttribute(col, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}
