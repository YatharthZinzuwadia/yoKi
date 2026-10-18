// P1-06 — the studio around the first frame. The chamber stops being a black void: two
// softboxes on stands light the print, contact sheets and negative strips hang from lines
// overhead like laundry, test polaroids lie where the filament runs, and a director's chair
// waits beside an apple box with the model release clipped to it (signed by: guardian).
//
// Everything is built from boxes/cylinders/planes in code; the paper props are canvas
// textures made from the generated photographs (gl/parts/studioProps.ts).

import { use, useMemo } from 'react'
import { BoxGeometry, DoubleSide, Group, InstancedMesh, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry, Vector3 } from 'three'
import type { SceneRange } from '../../content/film'
import { setAnchor } from '../../engine/anchors'
import { film } from '../../engine/director'
import { env, sceneLights } from '../../engine/fx'
import { rng, smoothstep } from '../../engine/math'
import { sepiaPortrait, useImage } from '../../gl/parts/images'
import { contactSheetTexture, negativeStripTexture, polaroidTexture, releaseFormTexture } from '../../gl/parts/studioProps'
import { painted } from '../../gl/materials/painted'
import { useSceneFrame } from '../SceneRoot'
import { FRAME } from './world'

// canvas text needs the web fonts first (else the props print in a fallback face)
const fontsReady: Promise<void> =
  typeof document === 'undefined'
    ? new Promise(() => {})
    : Promise.all([document.fonts.load('600 16px "IBM Plex Mono"'), document.fonts.load('italic 30px "Fraunces Variable"')]).then(() => undefined)

/** Positions (world, metres). The camera walks x≈0–1, z −35 → −62. */
const SOFTBOXES = [
  { x: -5.4, z: -59.2, h: 4.6 },
  { x: 5.8, z: -58.6, h: 4.2 },
]
const LINES = [
  { z: -45, y: 7.4, x0: -9, x1: 9 },
  { z: -57.4, y: 6.6, x0: -9.5, x1: 9.5 },
]
const CHAIR = new Vector3(-2.5, 0, -57.2)
const BULBS = [
  { x: -3.8, y: 5.8, z: -57.4 },
  { x: 4.6, y: 6.7, z: -45 },
]

export function Studio({ range: r }: { range: SceneRange }) {
  use(fontsReady)
  const photos = [
    useImage('p1/modelling', sepiaPortrait(3, 'child'), [768, 1024]),
    useImage('p1/modelling2', sepiaPortrait(5, 'child'), [768, 1024]),
    useImage('p1/smile', sepiaPortrait(7, 'child'), [768, 1024]),
    useImage('p1/stage', sepiaPortrait(9, 'stage'), [768, 1024]),
  ]

  const metal = useMemo(() => painted({ color: '#1c1c1f', roughness: 0.35, metalness: 0.8, rim: [0.8, 0.85, 0.9, 0.25] }), [])
  const black = useMemo(() => painted({ color: '#0d0d0f', roughness: 0.8 }), [])
  const canvas = useMemo(() => painted({ color: '#2a2724', roughness: 0.9, side: DoubleSide }), [])
  const woodMat = useMemo(() => painted({ color: '#7a5a3a', roughness: 0.7, bands: 0.08 }), [])
  const diffuser = useMemo(() => new MeshBasicMaterial({ color: '#fff2dc', toneMapped: false }), [])
  const bulbMat = useMemo(() => new MeshBasicMaterial({ color: '#ffd9a0', toneMapped: false }), [])

  // hung prints: contact sheets and negative strips, alternating along each line
  const hung = useMemo(() => {
    const R = rng(55)
    const items: { mesh: Group; phase: number }[] = []
    const pinGeo = new BoxGeometry(0.03, 0.09, 0.025)
    const pinMat = painted({ color: '#b08a5c', roughness: 0.7 })
    const sheets = [0, 1, 2].map((k) => contactSheetTexture(photos, 4 + k, [13, 6, 17][k]))
    const strips = [0, 1, 2].map((k) => negativeStripTexture(photos, k * 3))
    LINES.forEach((L, li) => {
      const n = 9
      for (let i = 0; i < n; i++) {
        const x = L.x0 + ((i + 0.5) / n) * (L.x1 - L.x0) + (R() - 0.5) * 0.6
        if (Math.abs(x) < 1.0) continue // keep the walking line clear overhead
        const sheet = (i + li) % 2 === 0
        const w = sheet ? 0.86 : 0.22, h = sheet ? 1.09 : 0.95
        const g = new Group()
        g.position.set(x, L.y, L.z)
        g.rotation.y = (R() - 0.5) * 0.5
        const m = painted({ map: sheet ? sheets[(i + li) % 3] : strips[i % 3], roughness: 0.8, side: DoubleSide })
        const plane = new PlaneGeometry(w, h)
        plane.translate(0, -h / 2 - 0.04, 0)
        const quad = new Mesh(plane, m)
        quad.frustumCulled = false
        g.add(quad)
        const pin = new Mesh(pinGeo, pinMat) // a wooden clothespin on the line
        g.add(pin)
        items.push({ mesh: g, phase: R() * 6 })
      }
    })
    return items
  }, [photos])

  // polaroids on the floor, where the filament runs to the frame's corner
  const polaroids = useMemo(() => {
    const R = rng(9)
    const caps = ['portfolio · ’04', 'retake 9', 'smile!!', 'too stiff', 'this one']
    const geo = new PlaneGeometry(0.3, 0.36)
    geo.rotateX(-Math.PI / 2)
    return caps.map((cap, k) => {
      const mat = painted({ map: polaroidTexture(photos[k % photos.length], cap, 10 + k), roughness: 0.6 })
      const n = 4
      const im = new InstancedMesh(geo, mat, n)
      const o = new Object3D()
      for (let i = 0; i < n; i++) {
        o.position.set(-2.4 + R() * 6.2, 0.006 + (k * n + i) * 0.0008, -57.2 - R() * 5.6)
        o.rotation.set(0, R() * Math.PI * 2, 0)
        o.updateMatrix()
        im.setMatrixAt(i, o.matrix)
      }
      im.frustumCulled = false
      im.receiveShadow = true
      return im
    })
  }, [photos])

  const form = useMemo(() => painted({ map: releaseFormTexture(), roughness: 0.85 }), [])

  useSceneFrame(
    r,
    (u) => {
      const k = smoothstep(-3.0, 0.3, u) * (1 - smoothstep(4.6, 5.6, u))
      // the chamber's own bounce light (warm, from the softboxes off the rock)
      env.hemiSky[0] = Math.max(env.hemiSky[0], 0.2 * k); env.hemiSky[1] = Math.max(env.hemiSky[1], 0.17 * k); env.hemiSky[2] = Math.max(env.hemiSky[2], 0.14 * k)
      env.hemiGround[0] = Math.max(env.hemiGround[0], 0.09 * k); env.hemiGround[1] = Math.max(env.hemiGround[1], 0.075 * k); env.hemiGround[2] = Math.max(env.hemiGround[2], 0.06 * k)
      // two bare bulbs hanging on the print lines
      BULBS.forEach((b) => sceneLights.push(b.x, b.y - 0.15, b.z, 6.5, 1, 0.78, 0.5, 2.2 * k))
      // the softboxes are the print's key light: soft, warm-white, wide
      SOFTBOXES.forEach((s) => {
        const dir = new Vector3(FRAME.center.x - s.x, 0, FRAME.center.z - s.z).normalize()
        sceneLights.push(s.x + dir.x * 1.0, s.h, s.z + dir.z * 1.0, 13, 1, 0.94, 0.86, 3.2 * k)
      })
      // the hung prints sway a little in the air the camera pushes
      hung.forEach((it) => {
        it.mesh.rotation.x = Math.sin(film.clock * 0.7 + it.phase) * 0.06
        it.mesh.rotation.z = Math.sin(film.clock * 0.45 + it.phase * 1.7) * 0.025
      })
      setAnchor('p1.release', CHAIR.x + 0.75, 0.62, CHAIR.z + 0.15)
      setAnchor('p1.contact', -3.1, LINES[1].y - 0.4, LINES[1].z)
      setAnchor('p1.polaroids', 1.6, 0.05, -58.8)
    },
    { before: 3.5, after: 1.8 },
  )

  return (
    <group>
      {/* softboxes: tripod, pole, black box, glowing diffuser facing the frame */}
      {SOFTBOXES.map((s, i) => {
        const yaw = Math.atan2(FRAME.center.x - s.x, FRAME.center.z - s.z)
        return (
          <group key={i} position={[s.x, 0, s.z]}>
            {[0, 1, 2].map((l) => (
              <mesh key={l} material={metal} position={[Math.sin(l * 2.1) * 0.45, 0.55, Math.cos(l * 2.1) * 0.45]} rotation={[Math.cos(l * 2.1) * -0.55, 0, Math.sin(l * 2.1) * 0.55]}>
                <cylinderGeometry args={[0.018, 0.018, 1.25, 6]} />
              </mesh>
            ))}
            <mesh material={metal} position={[0, s.h / 2 + 0.4, 0]}>
              <cylinderGeometry args={[0.025, 0.03, s.h - 0.2, 8]} />
            </mesh>
            <group position={[0, s.h, 0]} rotation={[0.18, yaw, 0]}>
              <mesh material={black} position={[0, 0, -0.32]}>
                <boxGeometry args={[1.5, 1.1, 0.6]} />
              </mesh>
              <mesh material={diffuser} position={[0, 0, 0.0]}>
                <planeGeometry args={[1.42, 1.02]} />
              </mesh>
            </group>
          </group>
        )
      })}
      {/* bare bulbs on short cords */}
      {BULBS.map((b, i) => (
        <group key={i} position={[b.x, b.y, b.z]}>
          <mesh material={metal} position={[0, 0.25, 0]}>
            <cylinderGeometry args={[0.006, 0.006, 0.5, 4]} />
          </mesh>
          <mesh material={bulbMat}>
            <sphereGeometry args={[0.06, 12, 10]} />
          </mesh>
        </group>
      ))}
      {/* the lines, and what hangs from them */}
      {LINES.map((L, i) => (
        <mesh key={i} material={metal} position={[(L.x0 + L.x1) / 2, L.y, L.z]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.008, 0.008, L.x1 - L.x0, 4]} />
        </mesh>
      ))}
      {hung.map((it, i) => (
        <primitive key={i} object={it.mesh} />
      ))}
      {polaroids.map((p, i) => (
        <primitive key={i} object={p} />
      ))}
      {/* the director's chair, empty, and an apple box with the release on a clipboard */}
      <group position={CHAIR} rotation-y={2.6}>
        <mesh material={canvas} position={[0, 0.62, 0]}>
          <boxGeometry args={[0.56, 0.04, 0.46]} />
        </mesh>
        <mesh material={canvas} position={[0, 0.98, -0.24]}>
          <boxGeometry args={[0.56, 0.24, 0.02]} />
        </mesh>
        {[-1, 1].map((sx) =>
          [-1, 1].map((sz) => (
            <mesh key={`${sx}${sz}`} material={woodMat} position={[sx * 0.27, 0.42, sz * 0.2]} rotation-z={sx * sz * 0.0}>
              <boxGeometry args={[0.035, 0.84, 0.035]} />
            </mesh>
          )),
        )}
        {[-1, 1].map((sx) => (
          <mesh key={sx} material={woodMat} position={[sx * 0.27, 0.32, 0]} rotation-x={0.75}>
            <boxGeometry args={[0.03, 0.03, 0.62]} />
          </mesh>
        ))}
      </group>
      <group position={[CHAIR.x + 0.75, 0, CHAIR.z + 0.15]} rotation-y={0.2}>
        <mesh material={woodMat} position={[0, 0.2, 0]}>
          <boxGeometry args={[0.5, 0.4, 0.3]} />
        </mesh>
        <mesh material={black} position={[0, 0.41, 0]} rotation-x={-Math.PI / 2}>
          <boxGeometry args={[0.24, 0.33, 0.012]} />
        </mesh>
        <mesh material={form} position={[0, 0.418, 0.01]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[0.21, 0.29]} />
        </mesh>
      </group>
    </group>
  )
}
