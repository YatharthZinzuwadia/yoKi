// The lab: isolated test benches for building blocks, outside the film.
//   /?lab=arm    — the four POV arms in poses (hands, kada, IK)
//   /?lab=tex    — triplanar texture sets on spheres and boxes
// Used by tools/qa (screenshots) and by you, to see one thing at a time.

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Suspense, useMemo } from 'react'
import { Vector3 } from 'three'
import { sceneLights } from '../engine/fx'
import { mixPose, newPose, POSES, useArm, type ArmAge } from '../gl/parts/arm'
import { painted, triSet, sharedUniforms } from '../gl/materials/painted'

function Lights() {
  const camera = useThree((s) => s.camera)
  useFrame(() => {
    sceneLights.reset()
    sceneLights.push(0.8, 1.0, 0.2, 6, 1, 0.9, 0.78, 5)
    sceneLights.push(-1.2, 0.2, -0.8, 6, 0.6, 0.7, 0.9, 2)
    const m = camera.matrixWorldInverse
    for (let i = 0; i < sceneLights.count; i++) {
      const p = sceneLights.pos[i]
      sceneLights.view[i].set(p.x, p.y, p.z, 1).applyMatrix4(m)
      sceneLights.view[i].w = p.w
    }
    sharedUniforms.uTime.value += 1 / 60
  }, -10)
  return <hemisphereLight args={['#b8b8c8', '#202024', 0.6]} />
}

// One arm at a time, placed as in the film: camera at the origin looking down −Z, the
// shoulder just below/behind the camera on the right, the hand out in front.
//   /?lab=arm&age=teen&pose=write
const Q = new URLSearchParams(location.search)
const AGE = (Q.get('age') ?? 'adult') as ArmAge
const POSE = (Q.get('pose') ?? 'point') as keyof typeof POSES

const CLOSE = Q.get('cam') === 'close'

function ArmBench() {
  const arm = useArm(AGE)
  const pose = useMemo(newPose, [])
  const camera = useThree((s) => s.camera)
  useFrame(() => {
    mixPose(POSES[POSE], POSES[POSE], 1, pose)
    arm.setPose(pose)
    const s = arm.lengths.upper + arm.lengths.fore
    arm.place({
      shoulder: new Vector3(0.36 * s, -0.46 * s, 0.05),
      wrist: new Vector3(0.06 * s, -0.16 * s, -0.78 * s),
      pole: new Vector3(0.6, -1, 0.2),
      fingers: new Vector3(-0.25, 0.3, -1),
      palm: new Vector3(-0.3, -1, -0.1),
    })
    if (CLOSE) {
      // look at the hand from the thumb side, 28 cm away
      const h = arm.bones.hand_r.getWorldPosition(new Vector3())
      camera.position.set(h.x - 0.22, h.y + 0.05, h.z + 0.12)
      camera.lookAt(h.x + 0.02, h.y, h.z - 0.06)
    }
  })
  return <primitive object={arm.root} />
}

function TexBench() {
  const sets = ['rock030', 'plaster001', 'woodfloor041', 'wood049', 'concrete034']
  const mats = useMemo(() => sets.map((s) => painted({ color: '#ffffff', roughness: 0.8, tri: { set: triSet(s), scale: 1.2 } })), [])
  return (
    <>
      {mats.map((m, i) => (
        <group key={i} position={[(i - 2) * 1.1, 0, -1.5]}>
          <mesh material={m} position={[0, 0.35, 0]}>
            <sphereGeometry args={[0.4, 64, 32]} />
          </mesh>
          <mesh material={m} position={[0, -0.45, 0]} rotation={[0.5, 0.6, 0]}>
            <boxGeometry args={[0.6, 0.6, 0.6]} />
          </mesh>
        </group>
      ))}
    </>
  )
}

export function Lab({ name }: { name: string }) {
  return (
    <Canvas className="stage" camera={{ fov: 55, position: [0, 0, 0], near: 0.01, far: 50 }} onCreated={({ camera }) => camera.lookAt(0, -0.05, -1)} gl={{ antialias: true }} flat>
      <color attach="background" args={['#18181c']} />
      <Lights />
      <Suspense fallback={null}>{name === 'arm' ? <ArmBench /> : <TexBench />}</Suspense>
    </Canvas>
  )
}
