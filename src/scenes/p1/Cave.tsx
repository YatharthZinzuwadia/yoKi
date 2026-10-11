// 01.1 — The cave. A narrow wet passage; a filament of warm light runs ahead on the
// floor; drips catch the light; three small things from a childhood lie in the dust.

import { useEffect, useMemo, useRef } from 'react'
import { Color, DoubleSide, InstancedMesh, Matrix4, Object3D, RingGeometry, SphereGeometry, Vector3, MeshBasicMaterial, AdditiveBlending, ConeGeometry } from 'three'
import { audio } from '../../audio/engine'
import { sceneRange, type SceneRange } from '../../content/film'
import { setAnchor, view } from '../../engine/anchors'
import { film } from '../../engine/director'
import { sceneLights } from '../../engine/fx'
import { clamp, range, rng, smoothstep } from '../../engine/math'
import { tunnelGeometry } from '../../gl/parts/caveGeometry'
import { makeDust } from '../../gl/parts/Dust'
import { makeFilament } from '../../gl/parts/Filament'
import { crayonGeometry, rockGeometry, sandalGeometry, toothGeometry } from '../../gl/parts/rocks'
import { painted } from '../../gl/materials/painted'
import { SceneRoot, useSceneFrame } from '../SceneRoot'
import type { SceneSpec } from '../types'
import { CAVE_CURVE, FILAMENT_CURVE, FOUND } from './world'

const DRIP_SPOTS = [
  [0.9, -3.5], [-0.6, -9], [0.4, -13.2], [-0.8, -17.8], [1.1, -23.5], [-0.3, -27.4], [0.7, -32], [-0.5, -35.5],
] as const

/** Filament reveal (0..1) as a function of film time, shared with the frame scene. */
export function filamentReveal(t: number) {
  const cave = sceneRange('p1.cave')
  const frame = sceneRange('p1.frame')
  return 0.09 + 0.91 * smoothstep(cave.start - 0.2, frame.start + 1.4, t) ** 0.92
}

function Cave({ range: r }: { range: SceneRange }) {
  const frameLen = sceneRange('p1.frame').length
  const tunnel = useMemo(
    () =>
      tunnelGeometry(CAVE_CURVE, {
        rings: 520,
        sides: 64,
        width: 2.15,
        height: 2.9,
        floor: 0,
        rough: 0.62,
        seed: 3,
        colorA: '#2c2a31',
        colorB: '#0b0b0e',
        flare: (s) => 1 + smoothstep(0.86, 1, s) * 1.6,
      }),
    [],
  )
  const rockMat = useMemo(() => painted({ vertexColors: true, roughness: 0.78, side: DoubleSide, detail: [0.55, 0.9, 0.38, 0.4], rim: [0.5, 0.55, 0.65, 0.06] }), [])
  const wetMat = useMemo(() => painted({ color: '#2a2830', roughness: 0.35, detail: [0.6, 3.0, 0.4, 0.3] }), [])
  const ledge = useMemo(() => rockGeometry(0.42, 11, 3, [1.1, 0.42, 0.8]), [])
  const shelf = useMemo(() => rockGeometry(0.4, 17, 3, [1.0, 0.36, 0.75]), [])
  const boulders = useMemo(() => {
    const R = rng(5)
    return Array.from({ length: 14 }, (_, i) => {
      const s = 0.05 + (i / 14) * 0.85
      const p = CAVE_CURVE.getPointAt(s)
      const side = R() > 0.5 ? 1 : -1
      return { pos: [p.x + side * (1.3 + R() * 0.5), 0.05, p.z + (R() - 0.5) * 2] as const, s: 0.2 + R() * 0.35, g: rockGeometry(1, 30 + i, 2, [1, 0.55, 0.9]) }
    })
  }, [])

  // stalactites: instanced cones hanging from the ceiling
  const stal = useMemo(() => {
    const R = rng(21)
    const n = 90
    const mesh = new InstancedMesh(new ConeGeometry(0.06, 1, 6, 1), wetMat, n)
    const o = new Object3D()
    for (let i = 0; i < n; i++) {
      const s = R() * 0.92
      const p = CAVE_CURVE.getPointAt(s)
      const len = 0.2 + R() ** 2 * 0.9
      o.position.set(p.x + (R() - 0.5) * 3, 2.75 + R() * 0.25 - len / 2, p.z + (R() - 0.5))
      o.rotation.set(Math.PI + (R() - 0.5) * 0.2, R() * 6, (R() - 0.5) * 0.2)
      o.scale.set(0.5 + R(), len, 0.5 + R())
      o.updateMatrix()
      mesh.setMatrixAt(i, o.matrix)
    }
    mesh.frustumCulled = false
    return mesh
  }, [wetMat])

  // found objects
  const sandal = useMemo(() => sandalGeometry(), [])
  const crayon = useMemo(() => crayonGeometry(), [])
  const tooth = useMemo(() => toothGeometry(), [])
  const sandalMat = useMemo(() => painted({ color: '#6b3d2a', roughness: 0.7, bands: 0.1, rim: [1, 0.8, 0.6, 0.6] }), [])
  const crayonMat = useMemo(() => painted({ color: '#e8b49a', roughness: 0.6, bands: 0.1, rim: [1, 0.85, 0.7, 0.5] }), [])
  const toothMat = useMemo(() => painted({ color: '#f1ead8', roughness: 0.25, bands: 0.08, rim: [1, 0.95, 0.85, 0.9] }), [])

  // filament + dust
  const fil = useMemo(() => makeFilament(FILAMENT_CURVE, { radius: 0.011, segments: 900, color: '#ffc77a', intensity: 7 }), [])
  const dust = useMemo(() => makeDust({ count: 1400, center: [0.2, 1.4, -18], size: [4.4, 2.8, 50], seed: 9, brightness: 1 }), [])

  // drips
  const drips = useMemo(() => {
    const drop = new InstancedMesh(new SphereGeometry(0.012, 8, 6), new MeshBasicMaterial({ color: '#ffe2b0', transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false }), DRIP_SPOTS.length)
    const ringMat = new MeshBasicMaterial({ color: '#ffd9a0', transparent: true, opacity: 0.6, blending: AdditiveBlending, depthWrite: false, side: DoubleSide, toneMapped: false })
    const ring = new InstancedMesh(new RingGeometry(0.8, 1, 32), ringMat, DRIP_SPOTS.length)
    drop.frustumCulled = ring.frustumCulled = false
    const R = rng(77)
    const st = DRIP_SPOTS.map(([x, z]) => ({ x, z, period: 1.4 + R() * 2.4, phase: R() * 4, last: -1 }))
    return { drop, ring, ringMat, st }
  }, [])

  const tmp = useRef({ m: new Matrix4(), o: new Object3D(), v: new Vector3(), c: new Color() })
  useEffect(() => () => tunnel.dispose(), [tunnel])

  useSceneFrame(
    r,
    (u) => {
      const t = film.t
      const reveal = filamentReveal(t)
      fil.material.uniforms.uReveal.value = reveal
      fil.material.uniforms.uTime.value = film.clock
      // the filament lights the world: a hot head and a soft glow near the camera
      const head = FILAMENT_CURVE.getPointAt(clamp(reveal - 0.004))
      sceneLights.push(head.x, head.y + 0.2, head.z, 5.5, 1, 0.7, 0.38, 6)
      const near = FILAMENT_CURVE.getPointAt(clamp(reveal - 0.1))
      sceneLights.push(near.x, near.y + 0.15, near.z, 3.6, 1, 0.68, 0.36, 2.4)
      const mid = FILAMENT_CURVE.getPointAt(clamp(reveal - 0.05))
      sceneLights.push(mid.x, mid.y + 0.15, mid.z, 4, 1, 0.7, 0.38, 2.4)
      // a cold grazing light far ahead on the stone
      const ahead = CAVE_CURVE.getPointAt(clamp(0.18 + range(u, 0, 7) * 0.8))
      sceneLights.push(ahead.x - 1.6, 2.5, ahead.z - 5, 7, 0.5, 0.58, 0.78, 1.6)

      // relic lights on the found objects as the camera reaches them
      const glow = (p: Vector3, a: number, b: number) => {
        const k = smoothstep(a - 0.6, a, u) * (1 - smoothstep(b, b + 0.8, u))
        sceneLights.push(p.x, p.y + 0.55, p.z + 0.25, 1.6, 1, 0.82, 0.6, 3.2 * k)
      }
      glow(FOUND.sandal, 1.3, 2.6)
      glow(FOUND.crayon, 2.8, 4.0)
      glow(FOUND.tooth, 4.4, 5.6)

      setAnchor('p1.sandal', FOUND.sandal.x, FOUND.sandal.y + 0.08, FOUND.sandal.z)
      setAnchor('p1.crayon', FOUND.crayon.x, FOUND.crayon.y + 0.05, FOUND.crayon.z)
      setAnchor('p1.tooth', FOUND.tooth.x, FOUND.tooth.y + 0.06, FOUND.tooth.z)

      // drips (wall-clock, so the cave is alive even when you stop scrolling)
      const { m, o } = tmp.current
      const cam = view.camera
      drips.st.forEach((d, i) => {
        const k = ((film.clock + d.phase) % d.period) / d.period
        const fall = Math.min(1, k / 0.42)
        const y = 2.75 - 2.73 * fall * fall
        o.position.set(d.x, y, d.z)
        o.scale.set(1, 1 + fall * 2.2, 1)
        o.rotation.set(0, 0, 0)
        o.updateMatrix()
        drips.drop.setMatrixAt(i, fall < 1 ? o.matrix : m.makeScale(0, 0, 0))
        const rk = clamp((k - 0.42) / 0.3)
        o.position.set(d.x, 0.025, d.z)
        o.rotation.set(-Math.PI / 2, 0, 0)
        o.scale.setScalar(0.02 + rk * 0.22)
        o.updateMatrix()
        drips.ring.setMatrixAt(i, rk > 0 && rk < 1 ? o.matrix : m.makeScale(0, 0, 0))
        const cycle = Math.floor((film.clock + d.phase) / d.period)
        if (k > 0.42 && d.last !== cycle) {
          d.last = cycle
          if (cam) {
            const dist = cam.position.distanceTo(tmp.current.v.set(d.x, 0, d.z))
            if (dist < 11) audio.cue((['drip0', 'drip1', 'drip2'] as const)[i % 3], { gain: 0.5 * (1 - dist / 11), pan: clamp((d.x - cam.position.x) / 2, -0.8, 0.8), wet: 0.8 })
          }
        }
      })
      drips.drop.instanceMatrix.needsUpdate = true
      drips.ring.instanceMatrix.needsUpdate = true
      drips.ringMat.opacity = 0.5
    },
    { after: frameLen + 1.25 },
  )

  return (
    <SceneRoot range={r} after={frameLen + 1.25}>
      <mesh geometry={tunnel} material={rockMat} receiveShadow />
      <primitive object={stal} />
      {boulders.map((b, i) => (
        <mesh key={i} geometry={b.g} material={rockMat} position={b.pos as unknown as Vector3} scale={b.s} rotation-y={i} />
      ))}
      <mesh geometry={ledge} material={rockMat} position={[FOUND.crayon.x - 0.15, FOUND.crayon.y - 0.16, FOUND.crayon.z]} />
      <mesh geometry={shelf} material={rockMat} position={[FOUND.tooth.x + 0.15, FOUND.tooth.y - 0.13, FOUND.tooth.z]} />
      <mesh geometry={sandal} material={sandalMat} position={FOUND.sandal} rotation-y={0.6} scale={1.7} />
      <mesh geometry={crayon} material={crayonMat} position={FOUND.crayon} rotation-y={0.4} scale={3} />
      <mesh geometry={tooth} material={toothMat} position={FOUND.tooth} scale={3} />
      <mesh geometry={fil.geometry} material={fil.material} frustumCulled={false} renderOrder={5} />
      <primitive object={dust} />
      <primitive object={drips.drop} />
      <primitive object={drips.ring} />
    </SceneRoot>
  )
}

export const caveSpec: SceneSpec = {
  id: 'p1.cave',
  Component: Cave,
  camera: [
    { u: 0, pos: [0.05, 1.56, 3.2], at: [0.15, 1.25, -6], fov: 54 },
    { u: 1.0, pos: [0.35, 1.55, -2.6], at: [0.75, 0.55, -8.2] },
    { u: 1.85, pos: [0.45, 1.42, -5.4], at: [0.95, 0.06, -7.95], tension: 0.55 },
    { u: 2.6, pos: [0.15, 1.55, -9.2], at: [-0.4, 1.15, -16] },
    { u: 3.35, pos: [-0.15, 1.5, -12.1], at: [-1.05, 0.62, -14.8], tension: 0.55 },
    { u: 4.2, pos: [0.3, 1.56, -16.6], at: [0.7, 1.3, -24] },
    { u: 4.95, pos: [0.55, 1.5, -19.6], at: [1.3, 1.02, -22.3], tension: 0.55 },
    { u: 5.9, pos: [0.25, 1.62, -26.4], at: [0.1, 1.7, -37] },
    { u: 7.0, pos: [0.05, 1.68, -35], at: [0.5, 2.6, -55] },
  ],
  look: [
    {
      u: 0,
      exposure: -0.1,
      contrast: 1.2,
      saturation: 0.9,
      tint: [1.0, 0.97, 0.92],
      lift: 0.012,
      liftTint: [0.18, 0.2, 0.28],
      paint: 0.55,
      paintRadius: 3,
      ink: 0.55,
      inkColor: [0.02, 0.02, 0.025],
      inkFar: 26,
      bloom: 0.75,
      vignette: 0.6,
      grain: 0.42,
      paper: 0.3,
      veilBlack: 0.35,
    },
    { u: 0.8, veilBlack: 0 },
    { u: 7, exposure: 0.0 },
  ],
  // far enough that the chamber's back-lit frame reads as a silhouette from inside the tunnel (P1-05)
  fog: { color: '#060608', near: 6, far: 52 },
}
