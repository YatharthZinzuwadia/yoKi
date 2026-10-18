// 01.1 — The cave (v2). A sandstone passage, like the Bhimbetka rock shelters. A filament
// of warm light runs ahead on the floor; water drips from the tips of stalactites and
// rings out in a puddle that mirrors the light. On the walls, five ochre paintings tell
// the earliest myth of him — born, watched, posed, home, and the one signed work in the
// cave: a stencil of his own right hand, with a ring of bare stone at the wrist (the kada).
//
// HOW (learning notes):
//  • Stone = a procedural tunnel (caveGeometry.ts) + a CC0 photo-texture (ambientCG
//    Rock061) applied TRIPLANAR in the painted material, so it has no UV seams.
//  • Paintings = canvas-drawn pictographs (pictographs.ts) projected onto the rock with
//    three's DecalGeometry: the decal copies the tunnel triangles inside a box and gives
//    them UVs, so the paint hugs every bump.
//  • Puddle = three's Reflector, but its mirror camera only sees layer 1 (the filament and
//    the drips): cheap, and it never has to re-light the rock from the mirrored view.
//  • Formations = one lumpy lathe shape, instanced; their tips are found by raycasting the
//    tunnel so they always touch the rock.

import { useEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending, CircleGeometry, DoubleSide, InstancedMesh, LatheGeometry, Matrix4, MeshBasicMaterial, Object3D,
  CustomBlending, OneFactor, OneMinusSrcAlphaFactor, Raycaster, RingGeometry, ShaderMaterial, SphereGeometry, Vector2, Vector3,
} from 'three'
import { DecalGeometry } from 'three/examples/jsm/geometries/DecalGeometry.js'
import { Reflector } from 'three/examples/jsm/objects/Reflector.js'
import { audio } from '../../audio/engine'
import { sceneRange, type SceneRange } from '../../content/film'
import { setAnchor, view } from '../../engine/anchors'
import { film } from '../../engine/director'
import { env, sceneLights } from '../../engine/fx'
import { clamp, fbm3, range, rng, smoothstep } from '../../engine/math'
import { makeDust } from '../../gl/parts/Dust'
import { makeFilament } from '../../gl/parts/Filament'
import { pictographTexture } from '../../gl/parts/pictographs'
import { painted, triSet } from '../../gl/materials/painted'
import { SceneRoot, useSceneFrame } from '../SceneRoot'
import type { SceneSpec } from '../types'
import { PAINTINGS, TUNNEL, TUNNEL_PROBE, paintingKeys } from './caveLayout'
import { CAVE_CURVE, FILAMENT_CURVE } from './world'

/** When the camera holds on each painting (scene-local units). Used by keys, lights, text. */
export const PAINTING_HOLDS = [1.15, 2.6, 4.05, 5.5, 6.95] as const

/** Filament reveal (0..1) as a function of film time, shared with the frame scene. */
export function filamentReveal(t: number) {
  const cave = sceneRange('p1.cave')
  const frame = sceneRange('p1.frame')
  return 0.09 + 0.91 * smoothstep(cave.start - 0.2, frame.start + 1.4, t) ** 0.92
}

// ── formations (computed once) ────────────────────────────────────────────────
const MIRROR_LAYER = 1
const PUDDLE = { x: 0.62, z: -20.9, rx: 1.15, rz: 0.75 } // the filament runs right through it

/** A lumpy, tapering spike: a lathe profile with noise bulges (tip at y=0, base at y=1). */
function spikeGeometry(seed: number) {
  const pts: Vector2[] = []
  for (let i = 0; i <= 14; i++) {
    const y = i / 14
    const r = 0.01 + Math.pow(y, 1.8) * (0.85 + 0.2 * Math.sin(y * 9 + seed)) * 0.09
    pts.push(new Vector2(r, y))
  }
  const g = new LatheGeometry(pts, 10)
  const p = g.attributes.position
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i)
    const n = 1 + fbm3(x * 9 + seed, y * 6, z * 9, 3) * 0.18
    p.setXYZ(i, x * n, y, z * n)
  }
  g.computeVertexNormals()
  return g
}

const FORMATIONS = (() => {
  const R = rng(41)
  const ray = new Raycaster()
  const down = new Vector3(0, -1, 0), up = new Vector3(0, 1, 0)
  const hang: { x: number; z: number; len: number; tip: number }[] = []
  const rise: { x: number; z: number; floor: number; len: number }[] = []
  // the first eight hang exactly where the water drips from (one over the puddle)
  const DRIPS: [number, number][] = [[0.9, -3.5], [-0.6, -9], [0.4, -13.2], [-0.8, -17.8], [0.5, -20.7], [-0.3, -27.4], [0.7, -32], [-0.5, -35.5]]
  const spots: [number, number][] = [...DRIPS]
  // only near the crown of the tunnel, where the ceiling is roughly flat — on the curved
  // walls a vertical spike would stick out sideways and read as a floating blob
  for (let i = 0; i < 36; i++) {
    const p = CAVE_CURVE.getPointAt(0.04 + R() * 0.8)
    spots.push([p.x + (R() - 0.5) * 1.6, p.z + (R() - 0.5) * 1.5])
  }
  for (const [x, z] of spots) {
    ray.set(new Vector3(x, 1.4, z), up)
    const hit = ray.intersectObject(TUNNEL_PROBE)[0]
    if (!hit) continue
    const len = 0.18 + R() * R() * 0.75
    hang.push({ x, z, len, tip: hit.point.y + 0.05 - len })
  }
  for (let i = 0; i < 26; i++) {
    const p = CAVE_CURVE.getPointAt(0.05 + R() * 0.78)
    const side = R() > 0.5 ? 1 : -1
    const x = p.x + side * (1.25 + R() * 0.6), z = p.z + (R() - 0.5) * 2
    ray.set(new Vector3(x, 1.2, z), down)
    const hit = ray.intersectObject(TUNNEL_PROBE)[0]
    if (!hit) continue
    rise.push({ x, z, floor: hit.point.y - 0.03, len: 0.15 + R() * R() * 0.6 })
  }
  return { hang, rise, drips: hang.slice(0, DRIPS.length) }
})()

// ── puddle shader: mirrored filament with ripples from the drip that falls into it ──
const PuddleShader = {
  name: 'PuddleShader',
  uniforms: {
    color: { value: null },
    tDiffuse: { value: null },
    textureMatrix: { value: null },
    uTime: { value: 0 },
    uRipple: { value: 1 },
  },
  vertexShader: /* glsl */ `
    uniform mat4 textureMatrix;
    varying vec4 vUv;
    varying vec2 vLocal;
    void main() {
      vUv = textureMatrix * vec4(position, 1.0);
      vLocal = position.xy;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime, uRipple;
    varying vec4 vUv;
    varying vec2 vLocal;
    void main() {
      float d = length(vLocal);
      // one expanding ring per drip (uRipple 0→1), plus a slow idle shimmer
      float front = uRipple * 0.9;
      float ring = sin((d - front) * 60.0) * exp(-abs(d - front) * 14.0) * (1.0 - uRipple);
      vec2 dir2 = vLocal / max(d, 1e-3);
      vec2 wob = vec2(sin(vLocal.y * 23.0 + uTime * 1.3), cos(vLocal.x * 19.0 + uTime * 1.1)) * 0.0012 + dir2 * ring * 0.016;
      vec4 uv = vUv;
      uv.xy += wob * uv.w;
      vec3 refl = texture2DProj(tDiffuse, uv).rgb;
      // shallow water is see-through: premultiplied output = the reflection ADDED on top,
      // while alpha darkens the stone underneath (wet rock is darker). Soft shoreline.
      float edge = smoothstep(1.0, 0.7, d);
      gl_FragColor = vec4(refl * 0.85 * edge, 0.55 * edge);
    }`,
}

function Cave({ range: r }: { range: SceneRange }) {
  const frameLen = sceneRange('p1.frame').length

  // stone: real CC0 sandstone, triplanar; matte (roughness from the texture)
  const rock = useMemo(() => triSet('rock061'), [])
  const rockMat = useMemo(
    () =>
      painted({
        vertexColors: true,
        roughness: 0.95,
        side: DoubleSide,
        tri: { set: rock, scale: 0.42, normal: 1.15, rough: 0.6, tint: [1.55, 1.42, 1.3] },
        detail: [0.1, 1.3, 0.22, 0.18],
        rim: [0.55, 0.6, 0.7, 0.05],
      }),
    [rock],
  )
  const spikeMat = useMemo(
    () => painted({ color: '#c2b6a8', roughness: 0.55, tri: { set: rock, scale: 1.4, normal: 0.7, rough: 0.4, tint: [1.4, 1.32, 1.22] } }),
    [rock],
  )

  const formations = useMemo(() => {
    const geo = spikeGeometry(3)
    const hang = new InstancedMesh(geo, spikeMat, FORMATIONS.hang.length)
    const rise = new InstancedMesh(geo, spikeMat, FORMATIONS.rise.length)
    const o = new Object3D()
    FORMATIONS.hang.forEach((f, i) => {
      o.position.set(f.x, f.tip, f.z)
      o.rotation.set(0, i * 1.7, 0)
      o.scale.set(1 + (i % 3) * 0.3, f.len, 1 + (i % 2) * 0.25)
      o.updateMatrix()
      hang.setMatrixAt(i, o.matrix)
    })
    FORMATIONS.rise.forEach((f, i) => {
      o.position.set(f.x, f.floor + f.len, f.z)
      o.rotation.set(Math.PI, i * 2.3, 0)
      o.scale.set(1.5 + (i % 3) * 0.4, f.len, 1.4)
      o.updateMatrix()
      rise.setMatrixAt(i, o.matrix)
    })
    hang.frustumCulled = rise.frustumCulled = false
    return { hang, rise }
  }, [spikeMat])

  // the five paintings, projected onto the rock
  const paintings = useMemo(
    () =>
      PAINTINGS.map((p) => {
        const helper = new Object3D()
        helper.position.copy(p.point)
        helper.lookAt(p.point.clone().add(p.normal))
        const geometry = new DecalGeometry(TUNNEL_PROBE, p.point, helper.rotation, new Vector3(p.size, p.size, 0.9))
        const material = painted({
          map: pictographTexture(p),
          transparent: true,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -4,
          polygonOffsetUnits: -4,
          roughness: 0.96,
          detail: [0.08, 7, 0.12, 0],
        })
        return { p, geometry, material }
      }),
    [],
  )

  // filament + dust
  const fil = useMemo(() => makeFilament(FILAMENT_CURVE, { radius: 0.011, segments: 900, color: '#ffc77a', intensity: 7 }), [])
  const dust = useMemo(() => makeDust({ count: 1100, center: [0.2, 1.4, -18], size: [4.4, 2.8, 50], seed: 9, brightness: 0.9 }), [])

  // drips: they fall from the stalactite tips
  const drips = useMemo(() => {
    const n = FORMATIONS.drips.length
    const drop = new InstancedMesh(
      new SphereGeometry(0.011, 8, 6),
      new MeshBasicMaterial({ color: '#ffe2b0', transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false }),
      n,
    )
    const ringMat = new MeshBasicMaterial({ color: '#ffd9a0', transparent: true, opacity: 0.45, blending: AdditiveBlending, depthWrite: false, side: DoubleSide, toneMapped: false })
    const ring = new InstancedMesh(new RingGeometry(0.85, 1, 40), ringMat, n)
    drop.frustumCulled = ring.frustumCulled = false
    drop.layers.enable(MIRROR_LAYER)
    const R = rng(77)
    const st = FORMATIONS.drips.map((d) => ({ x: d.x, z: d.z, top: d.tip, period: 1.5 + R() * 2.4, phase: R() * 4, last: -1 }))
    return { drop, ring, st }
  }, [])

  // the puddle (a mirror that only sees layer 1)
  const puddle = useMemo(() => {
    const refl = new Reflector(new CircleGeometry(1, 48), { textureWidth: 512, textureHeight: 512, clipBias: 0.003, multisample: 0, shader: PuddleShader })
    const getCam = refl.getReflectionCamera.bind(refl)
    refl.getReflectionCamera = (cam) => {
      const c = getCam(cam)
      c.layers.set(MIRROR_LAYER)
      return c
    }
    // premultiplied blending: dst = src.rgb + dst * (1 - src.a)
    const pm = refl.material as ShaderMaterial
    pm.transparent = true
    pm.depthWrite = false
    pm.blending = CustomBlending
    pm.blendSrc = OneFactor
    pm.blendDst = OneMinusSrcAlphaFactor
    refl.renderOrder = 1
    refl.rotation.x = -Math.PI / 2
    refl.position.set(PUDDLE.x, 0.045, PUDDLE.z)
    refl.scale.set(PUDDLE.rx, PUDDLE.rz, 1)
    return refl
  }, [])

  const tmp = useRef({ m: new Matrix4(), o: new Object3D(), v: new Vector3(), L: new Vector3(), ripple: 1 })
  useEffect(
    () => () => {
      paintings.forEach((x) => x.geometry.dispose())
    },
    [paintings],
  )

  useSceneFrame(
    r,
    (u) => {
      const t = film.t
      // once you're deep in the chamber the cave's lights stop mattering — fade them out so
      // the shared light pool (12 slots) is free for the frame and the gallery behind it
      const away = 1 - smoothstep(r.length + 1.5, r.length + 3, u)
      if (away <= 0) return
      // a faint warm fill (the light that bounces around any cave): the walls never
      // fall to pure black between paintings, but the filament still owns the frame
      if (u < r.length) {
        env.hemiSky[0] = 0.32; env.hemiSky[1] = 0.27; env.hemiSky[2] = 0.22
        env.hemiGround[0] = 0.14; env.hemiGround[1] = 0.11; env.hemiGround[2] = 0.09
      }
      // the filament's glow spilling back around the visitor: a soft light that travels
      // just ahead of and below the camera, so the walls beside you are always readable
      const cam0 = view.camera
      if (cam0 && u < r.length + 0.5) {
        const f = tmp.current.L.set(0, -0.45, -1.4).applyQuaternion(cam0.quaternion).add(cam0.position)
        sceneLights.push(f.x, Math.max(0.35, f.y), f.z, 5.6, 1, 0.74, 0.46, 3.0 * (1 - smoothstep(r.length - 0.6, r.length + 0.5, u)))
      }
      const reveal = filamentReveal(t)
      fil.material.uniforms.uReveal.value = reveal
      fil.material.uniforms.uTime.value = film.clock
      // the filament lights the world: a hot head and a soft glow behind it
      const head = FILAMENT_CURVE.getPointAt(clamp(reveal - 0.004))
      sceneLights.push(head.x, head.y + 0.25, head.z, 6, 1, 0.7, 0.38, 6 * away)
      const mid = FILAMENT_CURVE.getPointAt(clamp(reveal - 0.05))
      sceneLights.push(mid.x, mid.y + 0.2, mid.z, 4.5, 1, 0.7, 0.38, 2.4 * away)
      const near = FILAMENT_CURVE.getPointAt(clamp(reveal - 0.1))
      sceneLights.push(near.x, near.y + 0.2, near.z, 4, 1, 0.68, 0.36, 2.2 * away)
      // a cold grazing light far ahead on the stone
      const ahead = CAVE_CURVE.getPointAt(clamp(0.18 + range(u, 0, 8) * 0.75))
      sceneLights.push(ahead.x - 1.6, 2.5, ahead.z - 5, 7, 0.5, 0.58, 0.78, 1.4 * away)

      // each painting is warmed by a low light while the camera holds on it — like a
      // torch held up to the rock. Faded on u, never switched (no pops).
      PAINTINGS.forEach((p, i) => {
        const h = PAINTING_HOLDS[i]
        const k = smoothstep(h - 1.0, h - 0.25, u) * (1 - smoothstep(h + 0.5, h + 1.2, u))
        const L = tmp.current.L.copy(p.point).addScaledVector(p.normal, 1.8)
        sceneLights.push(L.x, p.point.y - 0.25, L.z, 4.6, 1, 0.78, 0.52, 2.3 * k)
        setAnchor(p.id, p.point.x, p.point.y + p.size * 0.42, p.point.z)
      })

      // drips (wall-clock, so the cave is alive even when you stop scrolling)
      const { m, o } = tmp.current
      const cam = view.camera
      drips.st.forEach((d, i) => {
        const k = ((film.clock + d.phase) % d.period) / d.period
        const fall = Math.min(1, k / 0.42)
        const y = d.top - (d.top - 0.03) * fall * fall
        o.position.set(d.x, y, d.z)
        o.scale.set(1, 1 + fall * 2.2, 1)
        o.rotation.set(0, 0, 0)
        o.updateMatrix()
        drips.drop.setMatrixAt(i, fall < 1 ? o.matrix : m.makeScale(0, 0, 0))
        const rk = clamp((k - 0.42) / 0.3)
        o.position.set(d.x, i === 4 ? 0.05 : 0.045, d.z)
        o.rotation.set(-Math.PI / 2, 0, 0)
        o.scale.setScalar(0.02 + rk * 0.22)
        o.updateMatrix()
        drips.ring.setMatrixAt(i, rk > 0 && rk < 1 ? o.matrix : m.makeScale(0, 0, 0))
        const cycle = Math.floor((film.clock + d.phase) / d.period)
        if (k > 0.42 && d.last !== cycle) {
          d.last = cycle
          if (i === 4) tmp.current.ripple = 0 // this one falls into the puddle
          if (cam) {
            const dist = cam.position.distanceTo(tmp.current.v.set(d.x, 0, d.z))
            if (dist < 11) audio.cue((['drip0', 'drip1', 'drip2'] as const)[i % 3], { gain: 0.5 * (1 - dist / 11), pan: clamp((d.x - cam.position.x) / 2, -0.8, 0.8), wet: 0.8 })
          }
        }
      })
      drips.drop.instanceMatrix.needsUpdate = true
      drips.ring.instanceMatrix.needsUpdate = true
      tmp.current.ripple = Math.min(1, tmp.current.ripple + film.dt * 0.9)
      const pu = (puddle.material as unknown as { uniforms: Record<string, { value: number }> }).uniforms
      pu.uTime.value = film.clock
      pu.uRipple.value = tmp.current.ripple
    },
    { after: frameLen + 1.25 },
  )

  return (
    <SceneRoot range={r} after={frameLen + 1.25}>
      <mesh geometry={TUNNEL} material={rockMat} receiveShadow />
      <primitive object={formations.hang} />
      <primitive object={formations.rise} />
      {paintings.map(({ p, geometry, material }) => (
        <mesh key={p.id} geometry={geometry} material={material} renderOrder={2} />
      ))}
      <primitive object={puddle} />
      {/* layer 0 for the camera, layer 1 for the puddle's mirror */}
      <mesh geometry={fil.geometry} material={fil.material} frustumCulled={false} renderOrder={5} layers-mask={0b11} />
      <primitive object={dust} />
      <primitive object={drips.drop} />
      <primitive object={drips.ring} />
    </SceneRoot>
  )
}

const H = PAINTING_HOLDS
export const caveSpec: SceneSpec = {
  id: 'p1.cave',
  Component: Cave,
  camera: [
    { u: 0, pos: [0.05, 1.56, 3.2], at: [0.15, 1.3, -6], fov: 54 },
    ...paintingKeys(0, H[0]),
    ...paintingKeys(1, H[1]),
    ...paintingKeys(2, H[2]),
    ...paintingKeys(3, H[3]),
    ...paintingKeys(4, H[4]),
    { u: 8.0, pos: [0.05, 1.68, -35], at: [0.5, 2.6, -55] },
  ],
  look: [
    {
      u: 0,
      exposure: -0.05,
      contrast: 1.16,
      saturation: 0.92,
      tint: [1.0, 0.97, 0.92],
      lift: 0.012,
      liftTint: [0.18, 0.2, 0.28],
      paint: 0.42,
      paintRadius: 3,
      ink: 0.3,
      inkColor: [0.05, 0.04, 0.035],
      inkFar: 22,
      bloom: 0.75,
      vignette: 0.6,
      grain: 0.38,
      paper: 0.26,
      veilBlack: 0.35,
    },
    { u: 0.8, veilBlack: 0 },
    { u: 8, exposure: 0.0 },
  ],
  // far enough that the chamber's back-lit frame reads as a silhouette from inside the tunnel (P1-05)
  fog: { color: '#060608', near: 6, far: 52 },
}
