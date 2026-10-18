// 01.3 — The gallery of the gaze. Frames hang in the dark and exist only when a
// flashbulb hits them. Then the walls open their eyes — hundreds, wet, all on us.

import { useMemo } from 'react'
import { MeshBasicMaterial, Object3D, Vector3 } from 'three'
import { audio } from '../../audio/engine'
import type { SceneRange } from '../../content/film'
import { setAnchor, view } from '../../engine/anchors'
import { film } from '../../engine/director'
import { env, fx, sceneLights } from '../../engine/fx'
import { clamp, rng, smoothstep } from '../../engine/math'
import { makeTriggers } from '../../engine/triggers'
import { sepiaPortrait, useImage } from '../../gl/parts/images'
import { painted, triSet } from '../../gl/materials/painted'
import { makeEyes, type EyePlacement } from '../../gl/parts/eyes'
import { buildRoom } from '../../gl/parts/roomKit'
import { SceneRoot, useSceneFrame } from '../SceneRoot'
import type { SceneSpec } from '../types'
import { GALLERY, GALLERY_FRAMES, STUDIO_WALL } from './world'

/** Flash times (scene-local units) → which frame they hit (-1 = a distant audience flash). */
const FLASHES: [number, number][] = [
  [0.7, 0], [1.25, -1], [1.7, 1], [2.25, -1], [2.65, 2], [3.05, -1], [3.6, 3], [3.95, -1],
  [4.5, 4], [4.8, -1], [5.15, -1], [5.45, 5], [5.75, -1], [6.05, -1],
]


/** Where the eyes go: plaster walls between frames and pilasters, the end wall around the
 *  doorway, and the ceiling coffers. Five opening waves; style mix weighted to realistic. */
function eyePlacements(): EyePlacement[] {
  const R = rng(404)
  const out: EyePlacement[] = []
  const W = GALLERY.halfW
  const z0 = STUDIO_WALL.z - 0.5
  const pilasters: number[] = []
  for (let z = z0 - GALLERY.pilasterEvery / 2; z > GALLERY.z1 + 0.5; z -= GALLERY.pilasterEvery) pilasters.push(z)
  const style = () => {
    const x = R()
    return x < 0.45 ? 0 : x < 0.65 ? 1 : x < 0.77 ? 2 : x < 0.9 ? 3 : 4
  }
  const clear = (p: Vector3, size: number) => out.every((e) => e.pos.distanceTo(p) > (e.size + size) * 1.3)
  const add = (pos: Vector3, rotY: number, rotX: number, size: number) => {
    if (!clear(pos, size)) return
    const wave = Math.floor(R() * 5)
    out.push({ pos, rotY, rotX, size, style: style(), opensAt: 4.15 + wave * 0.38 + R() * 0.12, seed: R() })
  }
  // a few giants first, high on the walls and over the doorway
  const giants: [number, number, number, number][] = [
    [1, 7.6, -118, 1.5], [-1, 6.9, -126, 1.9], [1, 8.2, -133, 1.3], [-1, 8.4, -110.5, 1.2],
  ]
  for (const [side, y, z, size] of giants) add(new Vector3(side * (W - 0.012), y, z), -side * Math.PI / 2, 0, size)
  add(new Vector3(0, 7.2, GALLERY.z1 + 0.012), 0, 0, 2.2)
  // side walls
  for (let i = 0; i < 900 && out.length < 170; i++) {
    const side = R() > 0.5 ? 1 : -1
    const z = -84 - R() * 55.5, y = 1.6 + R() * 8.1
    const size = 0.12 + R() * R() * 0.68
    if (pilasters.some((pz) => Math.abs(z - pz) < 0.6 + size)) continue
    if (GALLERY_FRAMES.some((f) => f.side === side && Math.abs(z - f.z) < f.w / 2 + 0.4 + size && y > f.y - f.h / 2 - 0.4 - size && y < f.y + f.h / 2 + 0.9 + size)) continue
    if (Math.abs(y - 5.62) < 0.08 + size * 0.6) continue // the picture rail
    add(new Vector3(side * (W - 0.012), y, z), -side * Math.PI / 2, 0, size)
  }
  // the end wall, around the doorway
  for (let i = 0; i < 400 && out.length < 215; i++) {
    const x = (R() - 0.5) * 8.4, y = 0.5 + R() * 9.4, size = 0.12 + R() * R() * 0.6
    if (Math.abs(x) < 1.6 + size && y < 4.2 + size) continue
    add(new Vector3(x, y, GALLERY.z1 + 0.012), 0, 0, size)
  }
  // the ceiling coffers (outside the skylight bays)
  for (let i = 0; i < 300 && out.length < 240; i++) {
    const side = R() > 0.5 ? 1 : -1
    const x = side * (2.5 + R() * 1.8), z = -84 - R() * 55, size = 0.12 + R() * R() * 0.45
    if (Math.abs(((z - z0) % 3 + 3) % 3 - 0) < 0.3 + size || Math.abs(((z - z0) % 3 + 3) % 3 - 3) < 0.3 + size) continue
    add(new Vector3(x, GALLERY.height - 0.012, z), 0, Math.PI / 2, size)
  }
  return out
}

function Gallery({ range: r }: { range: SceneRange }) {
  const imgs = GALLERY_FRAMES.map((f, i) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useImage(f.img, sepiaPortrait(20 + i, i === 2 ? 'stage' : i === 3 ? 'object' : 'child'), [768, 1024]),
  )
  // P1-08: a real room — museum hall meets school assembly hall (see gl/parts/roomKit.ts)
  const room = useMemo(() => {
    const plaster = triSet('plaster001'), wood = triSet('wood049'), parquet = triSet('woodfloor041')
    return buildRoom(
      {
        x0: -GALLERY.halfW, x1: GALLERY.halfW, y1: GALLERY.height,
        z0: STUDIO_WALL.z - 0.5, z1: GALLERY.z1,
        wainscot: 1.2, pictureRail: 5.6, pilasterEvery: GALLERY.pilasterEvery, beamsEvery: 3,
        endDoor: { x: 0, w: 2.2, h: 2.5 },
      },
      {
        wall: painted({ color: '#8a8178', roughness: 0.9, tri: { set: plaster, scale: 0.6, normal: 0.6, rough: 0.5, tint: [1.2, 1.15, 1.1] } }),
        wood: painted({ color: '#6b4a33', roughness: 0.55, tri: { set: wood, scale: 0.8, normal: 0.8, rough: 0.5, tint: [1.3, 1.2, 1.1] } }),
        trim: painted({ color: '#3d2e24', roughness: 0.5, tri: { set: wood, scale: 1.2, normal: 0.5, rough: 0.4, tint: [1.2, 1.1, 1.0] } }),
        floor: painted({ color: '#a8875f', roughness: 0.3, tri: { set: parquet, scale: 0.45, normal: 0.7, rough: 0.35, tint: [1.2, 1.1, 1.0] } }),
        ceiling: painted({ color: '#57524c', roughness: 0.95, tri: { set: plaster, scale: 0.4, normal: 0.5, rough: 0.6, tint: [1.1, 1.08, 1.05] } }),
        glass: new MeshBasicMaterial({ color: '#46505f', toneMapped: false }),
      },
    )
  }, [])
  const lacquer = useMemo(() => painted({ color: '#0b0a0c', roughness: 0.2, bands: 0.06, rim: [0.9, 0.8, 0.7, 0.2] }), [])
  const brass = useMemo(() => painted({ color: '#c99545', roughness: 0.35, metalness: 1 }), [])
  const photoMats = useMemo(() => imgs.map((map) => painted({ map, roughness: 0.55, bands: 0.05 })), [imgs])
  const trig = useMemo(() => makeTriggers(), [])

  // the eyes (P1-10): five styles, set into the walls and ceiling (gl/parts/eyes.ts)
  const eyes = useMemo(() => makeEyes(eyePlacements()), [])

  const z1 = GALLERY.z1, W = GALLERY.halfW
  const emptyFrame = useMemo(() => new Object3D(), [])

  useSceneFrame(r, (u) => {
    const p = trig.step(u)
    // flashes: scroll-scrubbed envelopes (deterministic both ways)
    let flashSum = 0
    FLASHES.forEach(([at, target], k) => {
      if (trig.crossed(p, u, at)) {
        audio.cue('shutter', { gain: target < 0 ? 0.35 : 0.7, pan: target < 0 ? (k % 2 ? 0.6 : -0.6) : GALLERY_FRAMES[target].side * 0.5 })
        if (target >= 0 && k % 2 === 0) audio.cue('flash', { gain: 0.35, delay: 0.02 })
      }
      if (u < at) return
      const e = Math.exp(-(u - at) * 7.5)
      if (e < 0.01) return
      if (target >= 0) {
        const f = GALLERY_FRAMES[target]
        sceneLights.push(f.side * 1.6, f.y + 0.6, f.z + 2.6, 10, 1, 0.97, 0.92, 26 * e)
        flashSum += e
      } else {
        const zz = -75.4 - k * 3.5
        sceneLights.push((k % 2 ? 1 : -1) * 3, 4.5, zz, 9, 1, 0.97, 0.92, 9 * e)
        flashSum += e * 0.35
      }
    })
    fx.flash += clamp(flashSum * 0.16, 0, 0.22)
    // the room's own light: moonlight through the skylights (the global sun, with shadows, so
    // the coffer beams stripe the floor), a cool fill, and a warm picture light per photo
    const cam = view.camera
    const into = smoothstep(-2, 0.4, u) * (1 - smoothstep(r.length + 0.2, r.length + 1.2, u))
    env.hemiSky[0] = 0.07 + 0.14 * into; env.hemiSky[1] = 0.075 + 0.16 * into; env.hemiSky[2] = 0.09 + 0.2 * into
    env.hemiGround[0] = 0.07 * into + 0.01; env.hemiGround[1] = 0.06 * into + 0.01; env.hemiGround[2] = 0.05 * into + 0.012
    env.sunIntensity = 3.4 * into
    env.sunColor[0] = 0.62; env.sunColor[1] = 0.72; env.sunColor[2] = 0.95
    env.sunDir[0] = 0.32; env.sunDir[1] = 1; env.sunDir[2] = -0.28
    if (cam) {
      env.sunTarget[0] = 0; env.sunTarget[1] = 0; env.sunTarget[2] = cam.position.z - 12
      GALLERY_FRAMES.forEach((f) => {
        const d = Math.abs(cam.position.z - f.z)
        const k = 1 - smoothstep(10, 20, d)
        sceneLights.push(f.side * (W - 0.7), f.y + f.h / 2 + 0.45, f.z, 4.6, 1, 0.82, 0.58, 2.4 * k * into)
      })
    }
    const beam = smoothstep(5.9, 6.8, u)
    sceneLights.push(0, 3.2, z1 + 5, 9, 1, 0.9, 0.75, 4.5 * beam)
    sceneLights.push(0, 7.4, z1 + 2, 6, 1, 0.92, 0.8, 3 * beam)

    // eyes: open in five waves from u≈4.2, all close as the beam finds the empty frame
    if (cam) eyes.update(u, film.clock, cam.position, clamp(flashSum * 1.2 + beam * 0.3, 0, 1.6), smoothstep(7.0, 7.6, u))

    // the empty frame grows into a doorway
    const grow = smoothstep(6.5, 8.0, u)
    // …until its opening is exactly the doorway in the end wall (2.2 × 2.5 m)
    emptyFrame.scale.set(1 + grow * 0.55, 1 + grow * 0.257, 1)
    emptyFrame.position.y = 2.45 - grow * 1.2

    GALLERY_FRAMES.forEach((f) => setAnchor(f.id, f.side * (W - 0.1), f.y + f.h / 2 + 0.05, f.z))
  }, { before: 2 })

  return (
    <SceneRoot range={r} before={2}>
      <primitive object={room} />
      {/* the frames */}
      {GALLERY_FRAMES.map((f, i) => (
        <group key={f.id} position={[f.side * (W - 0.06), f.y, f.z]} rotation-y={-f.side * Math.PI / 2}>
          <mesh material={photoMats[i]} position={[0, 0, 0.03]}>
            <planeGeometry args={[f.w, f.h]} />
          </mesh>
          {[
            [0, f.h / 2 + 0.07, f.w + 0.28, 0.14],
            [0, -f.h / 2 - 0.07, f.w + 0.28, 0.14],
            [-f.w / 2 - 0.07, 0, 0.14, f.h],
            [f.w / 2 + 0.07, 0, 0.14, f.h],
          ].map(([x, y, w, h], j) => (
            <mesh key={j} material={lacquer} position={[x, y, 0.05]}>
              <boxGeometry args={[w, h, 0.09]} />
            </mesh>
          ))}
          <mesh material={brass} position={[0, -f.h / 2 - 0.25, 0.04]}>
            <boxGeometry args={[0.5, 0.06, 0.02]} />
          </mesh>
          {/* the picture light: a brass hood on an arm, above the frame */}
          <mesh material={brass} position={[0, f.h / 2 + 0.42, 0.32]} rotation-x={0.5}>
            <boxGeometry args={[Math.min(1.2, f.w * 0.5), 0.07, 0.16]} />
          </mesh>
          <mesh material={brass} position={[0, f.h / 2 + 0.3, 0.16]} rotation-x={-0.9}>
            <boxGeometry args={[0.03, 0.03, 0.38]} />
          </mesh>
        </group>
      ))}
      {/* the empty frame that becomes a door */}
      <primitive object={emptyFrame} position={[0, 2.45, z1 + 0.16]}>
        {[
          [0, 0.98, 1.6, 0.14],
          [0, -0.98, 1.6, 0.14],
          [-0.73, 0, 0.14, 2.1],
          [0.73, 0, 0.14, 2.1],
        ].map(([x, y, w, h], j) => (
          <mesh key={j} material={lacquer} position={[x, y, 0]}>
            <boxGeometry args={[w, h, 0.12]} />
          </mesh>
        ))}
      </primitive>
      <primitive object={eyes.mesh} />
    </SceneRoot>
  )
}

export const gallerySpec: SceneSpec = {
  id: 'p1.gallery',
  Component: Gallery,
  camera: [
    // continuous with the frame scene: still walking, through the photograph
    { u: 0, pos: [0.15, 1.78, -62.6], at: [0.05, 2.0, -75], fov: 55 },
    { u: 0.95, pos: [0, 1.62, -69.9], at: [2.6, 3.3, -76.95] },
    { u: 1.9, pos: [0, 1.62, -75.9], at: [-2.6, 3.2, -82.95] },
    { u: 2.9, pos: [0, 1.62, -81.9], at: [2.6, 3.1, -88.95] },
    { u: 3.9, pos: [0, 1.62, -87.9], at: [-2.6, 3.4, -94.95] },
    { u: 4.85, pos: [0, 1.62, -93.9], at: [2.6, 3.2, -100.95] },
    { u: 5.8, pos: [0, 1.62, -99.9], at: [-1.6, 3.3, -106.95] },
    { u: 6.8, pos: [0, 1.6, -112], at: [0, 2.4, -140.4], tension: 0.4 },
    { u: 8.0, pos: [0, 1.5, -132.9], at: [0, 1.9, -142.4] },
  ],
  look: [
    { u: 0, exposure: 0.2, saturation: 0.7, contrast: 1.18, paint: 0.45, ink: 0.6, inkFar: 34, vignette: 0.65, tint: [1.0, 0.97, 0.93] },
    { u: 4.5, saturation: 0.6 },
    { u: 8, exposure: 0.1 },
  ],
  fog: { color: '#050506', near: 10, far: 52 },
}
