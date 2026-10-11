// Small procedural props: rocks, and the three found objects of the cave.

import { BufferGeometry, CapsuleGeometry, CylinderGeometry, ConeGeometry, IcosahedronGeometry, LatheGeometry, TorusGeometry, Vector2, Vector3 } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { fbm3 } from '../../engine/math'

export function rockGeometry(radius = 0.5, seed = 1, detail = 3, squash: [number, number, number] = [1, 0.6, 1]) {
  const g = new IcosahedronGeometry(radius, detail)
  const p = g.attributes.position
  const v = new Vector3()
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i)
    const n = fbm3(v.x * 2.1 + seed, v.y * 2.1, v.z * 2.1, 4)
    v.multiplyScalar(1 + n * 0.45)
    v.set(v.x * squash[0], v.y * squash[1], v.z * squash[2])
    p.setXYZ(i, v.x, v.y, v.z)
  }
  g.computeVertexNormals()
  return g
}

export function sandalGeometry(): BufferGeometry {
  const sole = new CapsuleGeometry(0.035, 0.11, 4, 12)
  sole.rotateX(Math.PI / 2)
  sole.scale(1, 0.18, 1)
  const strapA = new TorusGeometry(0.03, 0.006, 6, 18, Math.PI)
  strapA.translate(0, 0.004, -0.03)
  const strapB = new TorusGeometry(0.032, 0.006, 6, 18, Math.PI)
  strapB.rotateY(0.25)
  strapB.translate(0, 0.004, 0.035)
  return mergeGeometries([sole.toNonIndexed(), strapA.toNonIndexed(), strapB.toNonIndexed()])
}

export function crayonGeometry(): BufferGeometry {
  const body = new CylinderGeometry(0.0055, 0.0055, 0.045, 12)
  const tip = new ConeGeometry(0.0055, 0.012, 12)
  tip.translate(0, 0.0285, 0)
  const g = mergeGeometries([body.toNonIndexed(), tip.toNonIndexed()])
  g.rotateZ(Math.PI / 2 - 0.2)
  return g
}

export function toothGeometry(): BufferGeometry {
  const pts = [
    [0.0, 0.0], [0.004, 0.001], [0.006, 0.006], [0.0045, 0.012], [0.0065, 0.016], [0.0075, 0.021], [0.006, 0.025], [0.0, 0.026],
  ].map(([x, y]) => new Vector2(x, y))
  const g = new LatheGeometry(pts, 16)
  g.scale(1.6, 1.6, 1.6)
  return g
}
