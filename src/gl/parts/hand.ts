// A procedural, posable POV right hand (with forearm and the kada).
// Local frame: wrist at origin, fingers toward -Z, palm facing -Y, thumb on -X.
// Used everywhere yoKi's hand appears: writing, drawing, dribbling, fists, the cut.

import { CapsuleGeometry, Group, Mesh, SphereGeometry, TorusGeometry, CylinderGeometry, Vector3, type Material } from 'three'
import { painted } from '../materials/painted'

export interface HandPose {
  /** Curl per finger 0..1: index, middle, ring, pinky. */
  curl: [number, number, number, number]
  thumb: number
  spread: number
}

export const POSES: Record<string, HandPose> = {
  open: { curl: [0.06, 0.05, 0.08, 0.1], thumb: 0.1, spread: 0.6 },
  relaxed: { curl: [0.28, 0.34, 0.4, 0.45], thumb: 0.3, spread: 0.25 },
  point: { curl: [0.02, 0.92, 0.96, 0.98], thumb: 0.65, spread: 0.1 },
  grip: { curl: [0.62, 0.68, 0.72, 0.76], thumb: 0.55, spread: 0.05 },
  fist: { curl: [1, 1, 1, 1], thumb: 0.9, spread: 0 },
  pinch: { curl: [0.45, 0.85, 0.9, 0.92], thumb: 0.75, spread: 0.05 },
}

export function mixPose(a: HandPose, b: HandPose, k: number, out: HandPose) {
  for (let i = 0; i < 4; i++) out.curl[i] = a.curl[i] + (b.curl[i] - a.curl[i]) * k
  out.thumb = a.thumb + (b.thumb - a.thumb) * k
  out.spread = a.spread + (b.spread - a.spread) * k
  return out
}

const FINGERS = [
  // x, length, radius (adult metres)
  { x: -0.027, len: [0.034, 0.024, 0.02], r: 0.0092 },
  { x: -0.008, len: [0.038, 0.027, 0.021], r: 0.0095 },
  { x: 0.011, len: [0.035, 0.025, 0.02], r: 0.009 },
  { x: 0.028, len: [0.028, 0.019, 0.017], r: 0.008 },
]

export interface HandRig {
  root: Group
  kada: Mesh
  pose(p: HandPose): void
  /** Index fingertip in hand-local space (for aiming the finger at a point). */
  tipLocal: Vector3
  dispose(): void
}

export function makeHand({ skin = '#8a5a3c', kada = true, sleeve = '#141416', scale = 1 } = {}): HandRig {
  const skinMat = painted({ color: skin, roughness: 0.55, bands: 0.1, rim: [1, 0.72, 0.55, 0.45] })
  const kadaMat = painted({ color: '#b9c0c6', roughness: 0.22, metalness: 1, rim: [0.8, 0.9, 1, 0.6] })
  const sleeveMat = painted({ color: sleeve, roughness: 0.9, bands: 0.15 })
  const root = new Group()
  const s = new Group()
  s.scale.setScalar(scale)
  root.add(s)

  const mats: Material[] = [skinMat, kadaMat, sleeveMat]
  const mk = (geo: CapsuleGeometry | SphereGeometry | CylinderGeometry | TorusGeometry, m: Material) => {
    const mesh = new Mesh(geo, m)
    mesh.frustumCulled = false
    return mesh
  }

  // forearm (toward the camera) + sleeve
  const forearm = mk(new CylinderGeometry(0.026, 0.034, 0.32, 18, 1), skinMat)
  forearm.rotation.x = Math.PI / 2
  forearm.position.set(0.004, 0.004, 0.16)
  s.add(forearm)
  const cuff = mk(new CylinderGeometry(0.042, 0.046, 0.2, 18, 1, true), sleeveMat)
  cuff.rotation.x = Math.PI / 2
  cuff.position.set(0.004, 0.004, 0.36)
  s.add(cuff)

  // palm: a flattened capsule
  const palm = mk(new CapsuleGeometry(0.03, 0.05, 6, 14), skinMat)
  palm.rotation.x = Math.PI / 2
  palm.scale.set(1.45, 1, 0.5)
  palm.position.set(0, 0, -0.045)
  s.add(palm)

  // the kada, loose on the wrist
  const kadaMesh = mk(new TorusGeometry(0.036, 0.0042, 10, 40), kadaMat)
  kadaMesh.position.set(0.002, 0.002, 0.03)
  kadaMesh.visible = kada
  s.add(kadaMesh)

  // fingers: chains of joint groups
  const joints: Group[][] = []
  FINGERS.forEach((f) => {
    const chain: Group[] = []
    let parent: Group = new Group()
    parent.position.set(f.x, 0, -0.09)
    s.add(parent)
    const knuckle = mk(new SphereGeometry(f.r * 1.15, 10, 8), skinMat)
    parent.add(knuckle)
    f.len.forEach((L, k) => {
      const j = new Group()
      if (k > 0) j.position.set(0, 0, -f.len[k - 1])
      parent.add(j)
      const seg = mk(new CapsuleGeometry(f.r * (1 - k * 0.1), L - f.r * 1.2, 4, 10), skinMat)
      seg.rotation.x = Math.PI / 2
      seg.position.z = -L / 2
      j.add(seg)
      chain.push(j)
      parent = j
    })
    joints.push(chain)
  })
  // thumb
  const thumbBase = new Group()
  thumbBase.position.set(-0.034, -0.008, -0.03)
  s.add(thumbBase)
  const thumbJ: Group[] = []
  let tp: Group = thumbBase
  ;[0.03, 0.026, 0.022].forEach((L, k) => {
    const j = new Group()
    if (k > 0) j.position.set(0, 0, -[0.03, 0.026][k - 1])
    tp.add(j)
    const seg = mk(new CapsuleGeometry(0.0105 - k * 0.001, L - 0.012, 4, 10), skinMat)
    seg.rotation.x = Math.PI / 2
    seg.position.z = -L / 2
    j.add(seg)
    thumbJ.push(j)
    tp = j
  })

  const rig: HandRig = {
    root,
    kada: kadaMesh,
    tipLocal: new Vector3(-0.027, 0, -0.09 - 0.078).multiplyScalar(scale),
    pose(p) {
      joints.forEach((chain, i) => {
        const c = p.curl[i]
        const spread = (i - 1.5) * 0.09 * p.spread
        chain[0].rotation.set(-c * 1.35, spread, 0)
        chain[1].rotation.set(-c * 1.6, 0, 0)
        chain[2].rotation.set(-c * 1.1, 0, 0)
      })
      thumbJ[0].rotation.set(-0.35 - p.thumb * 0.5, 0.75 - p.thumb * 0.55, -0.4 - p.thumb * 0.5)
      thumbJ[1].rotation.set(-p.thumb * 0.7, 0, 0)
      thumbJ[2].rotation.set(-p.thumb * 0.9, 0, 0)
      // fingertip for aiming: approximate with the index chain
      const c = p.curl[0]
      rig.tipLocal
        .set(-0.027, -Math.sin(c * 1.35) * 0.03 - Math.sin(c * 2.9) * 0.025, -0.09 - Math.cos(c * 1.35) * 0.034 - Math.cos(c * 2.9) * 0.045)
        .multiplyScalar(scale)
    },
    dispose() {
      root.traverse((o) => (o as Mesh).geometry?.dispose())
      mats.forEach((m) => m.dispose())
    },
  }
  rig.pose(POSES.relaxed)
  return rig
}
