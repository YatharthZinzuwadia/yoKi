// The cave's geometry and where its paintings sit — computed once, at module load, so
// both the scene component and its camera keys use the same wall points.
//
// HOW THE PAINTINGS FIND THE WALL: for each painting we stand on the cave's centre
// curve at a given distance, then cast a ray sideways (left or right) at painting
// height. Where the ray hits the rock is where the decal goes; the hit's surface normal
// tells us which way the wall faces, so the painting lies flat on the stone. The camera
// keys for each painting are derived from the same point, so moving a painting in
// `pictographs.ts` moves the camera's glance with it.

import { DoubleSide, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three'
import { smoothstep } from '../../engine/math'
import { tunnelGeometry } from '../../gl/parts/caveGeometry'
import { PICTOGRAPHS } from '../../gl/parts/pictographs'
import type { CamKey, V3 } from '../types'
import { CAVE_CURVE } from './world'

export const TUNNEL = tunnelGeometry(CAVE_CURVE, {
  rings: 560,
  sides: 72,
  width: 2.2,
  height: 3.0,
  floor: 0,
  rough: 0.4,
  strata: 0.09,
  seed: 3,
  // light vertex colours: the CC0 photo-texture supplies the real albedo (see Cave.tsx)
  colorA: '#c8beb2',
  colorB: '#5a5148',
  flare: (s) => 1 + smoothstep(0.86, 1, s) * 1.6,
})

/** An invisible copy of the tunnel used for raycasts and decal projection. */
export const TUNNEL_PROBE = new Mesh(TUNNEL, new MeshBasicMaterial({ side: DoubleSide }))
TUNNEL_PROBE.updateMatrixWorld()

const ray = new Raycaster()
const up = new Vector3(0, 1, 0)

export const PAINTINGS = PICTOGRAPHS.map((p) => {
  const c = CAVE_CURVE.getPointAt(p.s)
  const t = CAVE_CURVE.getTangentAt(p.s)
  const side = new Vector3().crossVectors(t, up).normalize().multiplyScalar(p.side)
  const origin = new Vector3(c.x, p.y, c.z)
  ray.set(origin, side)
  const hit = ray.intersectObject(TUNNEL_PROBE)[0]
  const point = hit ? hit.point.clone() : origin.clone().addScaledVector(side, 1.8)
  let normal = hit?.face ? hit.face.normal.clone() : side.clone().negate()
  // the normal must face the cave's centre (back toward the viewer)
  if (normal.dot(side) > 0) normal = normal.negate()
  // keep the painting upright: ignore any vertical tilt in the normal
  normal.y = 0
  normal.normalize()
  return { ...p, point, normal, centre: c, sideDir: side }
})

/**
 * Two camera keys per painting: an approach that already turns toward the wall, and a
 * hold (tension → a gentle stop) a couple of metres back on the far side of the tunnel.
 */
export function paintingKeys(i: number, uHold: number): CamKey[] {
  const p = PAINTINGS[i]
  // stand near the opposite wall, ~1.5 m back: the painting is seen almost face-on
  const back = CAVE_CURVE.getPointAt(Math.max(0, p.s - 0.03))
  const far = p.sideDir.clone().multiplyScalar(-0.85)
  const hold: V3 = [back.x + far.x, 1.55, back.z + far.z]
  const approachAt = CAVE_CURVE.getPointAt(Math.max(0, p.s - 0.1))
  const approach: V3 = [approachAt.x + far.x * 0.5, 1.56, approachAt.z]
  const look: V3 = [p.point.x, p.point.y - 0.05, p.point.z]
  const lookAhead: V3 = [p.point.x * 0.6, p.point.y - 0.1, p.point.z - 2]
  return [
    { u: uHold - 0.55, pos: approach, at: lookAhead },
    { u: uHold, pos: hold, at: look, tension: 0.6 },
  ]
}
