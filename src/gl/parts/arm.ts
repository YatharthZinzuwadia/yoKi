// yoKi's right arm, at any age — a rigged MakeHuman (CC0) arm built by
// tools/blender/make_body.py, posed entirely in code. The kada is always on the wrist.
//
// HOW IT WORKS
//  • The .glb holds a skinned mesh + the 53-bone "game_engine" skeleton. Bones we use:
//    upperarm_r → lowerarm_r → hand_r → {thumb,index,middle,ring,pinky}_0{1,2,3}_r.
//  • place(): a two-bone IK. Given a shoulder position and a wrist target, the law of
//    cosines gives the elbow position (bent toward a "pole" direction); we rotate the
//    upper arm so its bone points at the elbow and the forearm so it points at the target.
//    Rotations are computed in world space and converted to each bone's local space.
//  • The hand is then oriented by two directions you give in world space: where the
//    fingers point and which way the palm faces. We measured the rest-pose hand's own
//    finger/palm directions from bone positions at load time, so no axis guessing.
//  • Finger curl: each joint rotates about its own flexion axis. The axis is detected at
//    load time by test-rotating a joint and keeping the axis that moves the fingertip most
//    toward the palm — so poses work whatever the exporter's bone roll is.
//  • Forearm twist: after the hand is oriented, part of its twist is moved onto the
//    forearm (as real forearms do), which avoids the "candy wrapper" wrist.

import { useLoader } from '@react-three/fiber'
import { useMemo } from 'react'
import { Bone, Group, Matrix4, Mesh, Object3D, Quaternion, SkinnedMesh, TorusGeometry, Vector3 } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { painted, type PaintedMaterial } from '../materials/painted'

export type ArmAge = 'adult' | 'teen' | 'child' | 'baby'
const URLS: Record<ArmAge, string> = {
  adult: '/models/arm-adult.glb',
  teen: '/models/arm-teen.glb',
  child: '/models/arm-child.glb',
  baby: '/models/arm-baby.glb',
}

const FINGERS = ['thumb', 'index', 'middle', 'ring', 'pinky'] as const
export type Finger = (typeof FINGERS)[number]

/** Curl per finger (0 straight … 1 fully bent), plus thumb across the palm. */
export interface ArmPose {
  thumb: number
  index: number
  middle: number
  ring: number
  pinky: number
  /** Spread fingers apart (−0.2 … 1). */
  spread: number
}

export const POSES: Record<string, ArmPose> = {
  relaxed: { thumb: 0.25, index: 0.25, middle: 0.32, ring: 0.38, pinky: 0.45, spread: 0.15 },
  open: { thumb: 0.05, index: 0.03, middle: 0.03, ring: 0.05, pinky: 0.08, spread: 0.6 },
  point: { thumb: 0.65, index: 0.02, middle: 0.9, ring: 0.95, pinky: 0.95, spread: 0 },
  write: { thumb: 0.55, index: 0.08, middle: 0.75, ring: 0.85, pinky: 0.9, spread: 0 },
  grip: { thumb: 0.6, index: 0.62, middle: 0.66, ring: 0.7, pinky: 0.72, spread: 0 },
  fist: { thumb: 0.9, index: 1, middle: 1, ring: 1, pinky: 1, spread: -0.1 },
  cradle: { thumb: 0.35, index: 0.45, middle: 0.5, ring: 0.55, pinky: 0.6, spread: 0.1 },
}

export function mixPose(a: ArmPose, b: ArmPose, k: number, out: ArmPose): ArmPose {
  for (const f of FINGERS) out[f] = a[f] + (b[f] - a[f]) * k
  out.spread = a.spread + (b.spread - a.spread) * k
  return out
}
export const newPose = (): ArmPose => ({ ...POSES.relaxed })

export interface PlaceArgs {
  /** World position of the shoulder joint. */
  shoulder: Vector3
  /** World position the wrist should reach. */
  wrist: Vector3
  /** World direction the elbow should bend toward (e.g. down and out). */
  pole: Vector3
  /** World direction the fingers point. */
  fingers: Vector3
  /** World direction the palm faces. */
  palm: Vector3
}

export interface ArmRig {
  root: Group
  mesh: SkinnedMesh
  material: PaintedMaterial
  kada: Mesh
  setPose(p: ArmPose): void
  place(a: PlaceArgs): void
  /** World position of a fingertip (after place/setPose). */
  tip(f: Finger, out: Vector3): Vector3
  /** Lengths (m) of the upper arm and forearm, for framing. */
  lengths: { upper: number; fore: number; hand: number }
  bones: Record<string, Bone>
}

// scratch
const _v1 = new Vector3(), _v2 = new Vector3(), _v3 = new Vector3(), _v4 = new Vector3()
const _q1 = new Quaternion(), _q2 = new Quaternion(), _q3 = new Quaternion()
const _m = new Matrix4()

function worldQuat(o: Object3D, out: Quaternion) {
  return o.getWorldQuaternion(out)
}
/** Set an object's world rotation (keeps its world position). */
function setWorldQuat(o: Object3D, q: Quaternion) {
  const parent = o.parent!
  parent.getWorldQuaternion(_q3)
  o.quaternion.copy(_q3.invert().multiply(q))
  o.updateMatrixWorld(true)
}

export function useArm(age: ArmAge, { skin = '#e3b597', kada = true } = {}): ArmRig {
  const gltf = useLoader(GLTFLoader, URLS[age])
  return useMemo(() => buildArm(gltf.scene, age, skin, kada), [gltf, age, skin, kada])
}

function buildArm(src: Object3D, _age: ArmAge, skin: string, withKada: boolean): ArmRig {
  const scene = skeletonClone(src)
  const root = new Group()
  root.add(scene)
  // MakeHuman faces +Z after glTF export; turn it to face −Z like our cameras do.
  scene.rotation.y = Math.PI
  root.updateMatrixWorld(true)

  let mesh!: SkinnedMesh
  const bones: Record<string, Bone> = {}
  scene.traverse((o) => {
    if ((o as SkinnedMesh).isSkinnedMesh) mesh = o as SkinnedMesh
    if ((o as Bone).isBone) bones[o.name] = o as Bone
  })
  mesh.frustumCulled = false
  // Fair Gujju skin: warm wheat base, soft wrap light, a little pore/crease detail.
  const material = painted({
    color: skin,
    roughness: 0.55,
    rim: [1.0, 0.6, 0.45, 0.45],
  })
  mesh.material = material
  mesh.castShadow = true

  const B = (n: string) => {
    const b = bones[n]
    if (!b) throw new Error(`arm rig: missing bone ${n}`)
    return b
  }
  const upper = B('upperarm_r'), fore = B('lowerarm_r'), hand = B('hand_r')
  const chain = (f: Finger) => [B(`${f}_01_r`), B(`${f}_02_r`), B(`${f}_03_r`)]
  const fingers = Object.fromEntries(FINGERS.map((f) => [f, chain(f)])) as Record<Finger, Bone[]>

  // ── rest measurements ──────────────────────────────────────────────────────
  const wp = (o: Object3D) => o.getWorldPosition(new Vector3())
  const pS = wp(upper), pE = wp(fore), pW = wp(hand)
  const upperLen = pS.distanceTo(pE), foreLen = pE.distanceTo(pW)
  const pMid = wp(fingers.middle[0]), pIdx = wp(fingers.index[0]), pPinky = wp(fingers.pinky[0])
  const handLen = pW.distanceTo(wp(fingers.middle[2])) * 1.25
  // rest hand frame: F = fingers, S = toward thumb side, N = palm normal (out of the palm)
  const restF = pMid.clone().sub(pW).normalize()
  const restS = pIdx.clone().sub(pPinky).normalize()
  const restN = new Vector3().crossVectors(restS, restF).normalize()
  restS.crossVectors(restF, restN).normalize()
  const restBasis = new Matrix4().makeBasis(restS, restF, restN)
  const restHandQ = worldQuat(hand, new Quaternion())

  // rest local rotations (we re-solve from rest every frame → no drift)
  const restLocal = new Map<Bone, Quaternion>()
  for (const b of Object.values(bones)) restLocal.set(b, b.quaternion.clone())

  // finger tip helpers: a point beyond the last joint, along the bone direction
  const tipObj = Object.fromEntries(
    FINGERS.map((f) => {
      const [, b2, b3] = fingers[f]
      const o = new Object3D()
      const len = wp(b2).distanceTo(wp(b3))
      // local Y points along the bone in Blender-exported rigs; verified below
      o.position.set(0, len * 0.95, 0)
      b3.add(o)
      return [f, o]
    }),
  ) as Record<Finger, Object3D>
  root.updateMatrixWorld(true)

  // detect each finger's flexion axis (local X or Z, ±) by test rotation
  const flex = {} as Record<Finger, { axis: Vector3; sign: number }>
  for (const f of FINGERS) {
    const b = fingers[f][1]
    const before = tipObj[f].getWorldPosition(new Vector3())
    let best = { axis: new Vector3(1, 0, 0), sign: 1, score: -Infinity }
    for (const ax of [new Vector3(1, 0, 0), new Vector3(0, 0, 1)])
      for (const sign of [1, -1]) {
        b.quaternion.copy(restLocal.get(b)!).multiply(_q1.setFromAxisAngle(ax, 0.6 * sign))
        b.updateMatrixWorld(true)
        const after = tipObj[f].getWorldPosition(new Vector3())
        const score = after.sub(before).dot(restN)
        if (score > best.score) best = { axis: ax.clone(), sign, score }
      }
    b.quaternion.copy(restLocal.get(b)!)
    b.updateMatrixWorld(true)
    flex[f] = { axis: best.axis, sign: best.sign }
  }
  // The thumb is different: its base joint mostly ADDUCTS (swings toward the index finger)
  // rather than curling toward the palm. Detect that axis by test-rotating thumb_01 and
  // keeping the axis/sign that moves the thumb tip most toward the index finger's base.
  const thumbAdd = (() => {
    const b = fingers.thumb[0]
    const before = tipObj.thumb.getWorldPosition(new Vector3())
    const toIndex = pIdx.clone().sub(before).normalize()
    let best = { axis: new Vector3(0, 0, 1), sign: 1, score: -Infinity }
    for (const ax of [new Vector3(1, 0, 0), new Vector3(0, 0, 1)])
      for (const sign of [1, -1]) {
        b.quaternion.copy(restLocal.get(b)!).multiply(_q1.setFromAxisAngle(ax, 0.4 * sign))
        b.updateMatrixWorld(true)
        const score = tipObj.thumb.getWorldPosition(new Vector3()).sub(before).dot(toIndex)
        if (score > best.score) best = { axis: ax.clone(), sign, score }
      }
    b.quaternion.copy(restLocal.get(b)!)
    b.updateMatrixWorld(true)
    return best
  })()

  // spread axis: the other local axis (perpendicular to flexion and bone)
  const spreadAxis = Object.fromEntries(
    FINGERS.map((f) => [f, flex[f].axis.x ? new Vector3(0, 0, 1) : new Vector3(1, 0, 0)]),
  ) as Record<Finger, Vector3>

  // ── the kada: steel, loose on the wrist, child-sized for children ──────────
  const kadaR = foreLen * 0.108
  const kadaMat = painted({ color: '#c8ccd0', roughness: 0.22, metalness: 1, rim: [0.85, 0.9, 1.0, 0.8] })
  const kadaMesh = new Mesh(new TorusGeometry(kadaR, kadaR * 0.15, 14, 56), kadaMat)
  kadaMesh.frustumCulled = false
  kadaMesh.visible = withKada
  // sits ~88% down the forearm; torus axis (Z) aligned with the bone (Y)
  kadaMesh.position.set(0, foreLen * 0.9, 0)
  kadaMesh.rotation.set(Math.PI / 2, 0, 0.2)
  fore.add(kadaMesh)

  const pose: ArmPose = { ...POSES.relaxed }
  const applyFingers = () => {
    for (const f of FINGERS) {
      const c = pose[f]
      const [b1, b2, b3] = fingers[f]
      const { axis, sign } = flex[f]
      const thumb = f === 'thumb'
      const spread = (f === 'index' ? -0.12 : f === 'middle' ? -0.03 : f === 'ring' ? 0.05 : f === 'pinky' ? 0.14 : 0) * pose.spread
      if (thumb) {
        // tucked toward the index at rest (0.35 rad), more as it curls; the two distal
        // joints bend toward the palm
        b1.quaternion.copy(restLocal.get(b1)!).multiply(_q1.setFromAxisAngle(thumbAdd.axis, thumbAdd.sign * (0.35 + c * 0.45)))
        b2.quaternion.copy(restLocal.get(b2)!).multiply(_q1.setFromAxisAngle(axis, sign * c * 0.45))
        b3.quaternion.copy(restLocal.get(b3)!).multiply(_q1.setFromAxisAngle(axis, sign * c * 0.7))
        continue
      }
      b1.quaternion
        .copy(restLocal.get(b1)!)
        .multiply(_q1.setFromAxisAngle(spreadAxis[f], spread))
        .multiply(_q2.setFromAxisAngle(axis, sign * c * 1.25))
      b2.quaternion.copy(restLocal.get(b2)!).multiply(_q1.setFromAxisAngle(axis, sign * c * 1.55))
      b3.quaternion.copy(restLocal.get(b3)!).multiply(_q1.setFromAxisAngle(axis, sign * c * 1.15))
    }
  }

  const rig: ArmRig = {
    root,
    mesh,
    material,
    kada: kadaMesh,
    bones,
    lengths: { upper: upperLen, fore: foreLen, hand: handLen },
    setPose(p) {
      Object.assign(pose, p)
    },
    place({ shoulder, wrist, pole, fingers: fDir, palm }) {
      // 0) reset the chain to rest and move the whole rig so the shoulder sits where asked
      for (const [b, q] of restLocal) b.quaternion.copy(q)
      root.position.set(0, 0, 0)
      root.updateMatrixWorld(true)
      upper.getWorldPosition(_v1)
      root.position.copy(shoulder).sub(_v1)
      root.updateMatrixWorld(true)

      // 1) elbow position by the law of cosines
      const a = upperLen, b = foreLen
      const toT = _v1.copy(wrist).sub(shoulder)
      const d = Math.min(Math.max(toT.length(), Math.abs(a - b) + 1e-3), a + b - 1e-3)
      const dir = toT.normalize()
      const n = _v2.copy(pole).addScaledVector(dir, -pole.dot(dir)).normalize()
      const cosA = (a * a + d * d - b * b) / (2 * a * d)
      const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA))
      const elbow = _v3.copy(shoulder).addScaledVector(dir, a * cosA).addScaledVector(n, a * sinA)
      const target = _v4.copy(shoulder).addScaledVector(dir, d)

      // 2) aim the upper arm at the elbow
      const curE = fore.getWorldPosition(new Vector3())
      _q1.setFromUnitVectors(curE.sub(shoulder).normalize(), elbow.clone().sub(shoulder).normalize())
      setWorldQuat(upper, _q1.multiply(worldQuat(upper, _q2)))

      // 3) aim the forearm at the target
      const curW = hand.getWorldPosition(new Vector3())
      _q1.setFromUnitVectors(curW.sub(elbow).normalize(), target.clone().sub(elbow).normalize())
      setWorldQuat(fore, _q1.multiply(worldQuat(fore, _q2)))

      // 4) orient the hand from (fingers, palm)
      const F = fDir.clone().normalize()
      const N = palm.clone().addScaledVector(F, -palm.dot(F)).normalize()
      const S = new Vector3().crossVectors(F, N).normalize()
      const want = _m.makeBasis(S, F, N).multiply(new Matrix4().copy(restBasis).transpose())
      const handQ = new Quaternion().setFromRotationMatrix(want).multiply(restHandQ)

      // 5) move ~60% of the wrist twist onto the forearm (about the forearm's own axis)
      const foreQ = worldQuat(fore, new Quaternion())
      const axis = target.clone().sub(elbow).normalize()
      const rel = foreQ.clone().invert().multiply(handQ)
      const localAxis = axis.clone().applyQuaternion(foreQ.clone().invert())
      const proj = new Vector3(rel.x, rel.y, rel.z).projectOnVector(localAxis)
      const twist = new Quaternion(proj.x, proj.y, proj.z, rel.w).normalize()
      const angle = 2 * Math.acos(Math.min(1, Math.abs(twist.w))) * Math.sign(twist.w || 1)
      const partial = new Quaternion().setFromAxisAngle(axis, angle * 0.6 * (proj.dot(localAxis) >= 0 ? 1 : -1))
      setWorldQuat(fore, partial.multiply(foreQ))
      setWorldQuat(hand, handQ)

      // 6) fingers
      applyFingers()
      root.updateMatrixWorld(true)
    },
    tip(f, out) {
      return tipObj[f].getWorldPosition(out)
    },
  }
  rig.setPose(POSES.relaxed)
  applyFingers()
  return rig
}

/** Preload all arms during the loader (call once at module level in a scene). */
export const preloadArms = (ages: ArmAge[]) => ages.forEach((a) => useLoader.preload(GLTFLoader, URLS[a]))
