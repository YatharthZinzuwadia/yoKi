// 01.3 — The gallery of the gaze. Frames hang in the dark and exist only when a
// flashbulb hits them. Then the walls open their eyes — hundreds, wet, all on us.

import { useMemo } from 'react'
import { Color, InstancedBufferAttribute, InstancedMesh, Object3D, ShaderMaterial, SphereGeometry, Vector3 } from 'three'
import { audio } from '../../audio/engine'
import type { SceneRange } from '../../content/film'
import { setAnchor, view } from '../../engine/anchors'
import { film } from '../../engine/director'
import { fx, sceneLights } from '../../engine/fx'
import { clamp, rng, smoothstep } from '../../engine/math'
import { makeTriggers } from '../../engine/triggers'
import { sepiaPortrait, useImage } from '../../gl/parts/images'
import { painted } from '../../gl/materials/painted'
import { SceneRoot, useSceneFrame } from '../SceneRoot'
import type { SceneSpec } from '../types'
import { GALLERY, GALLERY_FRAMES } from './world'

/** Flash times (scene-local units) → which frame they hit (-1 = a distant audience flash). */
const FLASHES: [number, number][] = [
  [0.7, 0], [1.25, -1], [1.7, 1], [2.25, -1], [2.65, 2], [3.05, -1], [3.6, 3], [3.95, -1],
  [4.5, 4], [4.8, -1], [5.15, -1], [5.45, 5], [5.75, -1], [6.05, -1],
]

const eyeVert = /* glsl */ `
attribute float aOpen;
attribute vec3 aIris;
varying vec3 vLocal;
varying vec3 vN;
varying vec3 vIris;
varying float vOpen;
varying vec3 vViewDir;
void main() {
  vLocal = position;
  vIris = aIris;
  vOpen = aOpen;
  vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * mat3(instanceMatrix) * normal);
  vViewDir = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`

const eyeFrag = /* glsl */ `
uniform float uLight;
varying vec3 vLocal;
varying vec3 vN;
varying vec3 vIris;
varying float vOpen;
varying vec3 vViewDir;
float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
void main() {
  vec3 p = normalize(vLocal);
  // eyelids: an almond opening that widens with vOpen
  float lid = vOpen * (0.62 - 0.38 * p.x * p.x);
  float inLid = step(lid, abs(p.y)) + step(p.z, 0.05);
  vec3 skin = vec3(0.09, 0.075, 0.07) * (0.55 + 0.45 * p.z) * (0.8 + 0.2 * n(p.xy * 30.0));
  // sclera with veins, iris with radial fibres, pupil
  float r = length(p.xy) * step(0.0, p.z);
  float veins = smoothstep(0.55, 0.9, n(vec2(atan(p.y, p.x + 1e-4) * 6.0, r * 14.0))) * smoothstep(0.3, 0.95, r);
  vec3 sclera = mix(vec3(0.92, 0.88, 0.84), vec3(0.75, 0.15, 0.12), veins * 0.55);
  float fib = 0.75 + 0.25 * n(vec2(atan(p.y, p.x + 1e-4) * 18.0, r * 30.0));
  vec3 iris = vIris * fib * (0.6 + 0.6 * smoothstep(0.38, 0.2, r));
  vec3 eye = mix(sclera, iris, smoothstep(0.43, 0.4, r));
  eye = mix(eye, vec3(0.01), smoothstep(0.19, 0.16, r));
  // wet highlight + fresnel
  float spec = pow(max(dot(reflect(-vViewDir, vN), normalize(vec3(0.3, 0.6, 0.7))), 0.0), 60.0);
  float fres = pow(clamp(1.0 - dot(vN, vViewDir), 0.0, 1.0), 3.0);
  vec3 col = mix(eye, skin, clamp(inLid, 0.0, 1.0));
  float lit = 0.12 + uLight;
  col = col * lit + (1.0 - clamp(inLid, 0.0, 1.0)) * (spec * 1.6 + fres * 0.15) * (0.4 + uLight);
  gl_FragColor = vec4(col, 1.0);
}`

const EYES = 260

function Gallery({ range: r }: { range: SceneRange }) {
  const imgs = GALLERY_FRAMES.map((f, i) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useImage(f.img, sepiaPortrait(20 + i, i === 2 ? 'stage' : i === 3 ? 'object' : 'child'), [768, 1024]),
  )
  const wall = useMemo(() => painted({ color: '#141317', roughness: 0.92, bands: 0.15 }), [])
  const floor = useMemo(() => painted({ color: '#0d0d10', roughness: 0.32, metalness: 0.1, bands: 0.1 }), [])
  const lacquer = useMemo(() => painted({ color: '#0b0a0c', roughness: 0.2, bands: 0.06, rim: [0.9, 0.8, 0.7, 0.2] }), [])
  const brass = useMemo(() => painted({ color: '#c99545', roughness: 0.35, metalness: 1 }), [])
  const photoMats = useMemo(() => imgs.map((map) => painted({ map, roughness: 0.55, bands: 0.05 })), [imgs])
  const trig = useMemo(() => makeTriggers(), [])

  // the eyes
  const eyes = useMemo(() => {
    const R = rng(404)
    const geo = new SphereGeometry(1, 28, 18)
    const mat = new ShaderMaterial({ uniforms: { uLight: { value: 0 } }, vertexShader: eyeVert, fragmentShader: eyeFrag })
    const mesh = new InstancedMesh(geo, mat, EYES)
    mesh.frustumCulled = false
    const open = new Float32Array(EYES)
    const iris = new Float32Array(EYES * 3)
    const palette = [new Color('#4a2c1a'), new Color('#2e1c12'), new Color('#5a3b22'), new Color('#3d4a3a'), new Color('#24324a')]
    const data = Array.from({ length: EYES }, (_, i) => {
      const onEnd = i < 40
      const side = R() > 0.5 ? 1 : -1
      let pos: Vector3
      if (onEnd) {
        let x = (R() - 0.5) * 8.6
        if (Math.abs(x) < 1.7) x = Math.sign(x || 1) * (1.7 + R() * 2.4)
        pos = new Vector3(x, 0.5 + R() * 7, GALLERY.z1 + 0.12)
      } else pos = new Vector3(side * (GALLERY.halfW - 0.08), 0.5 + R() * 7, -232 - R() * 37)
      const c = palette[Math.floor(R() * palette.length)]
      iris.set([c.r, c.g, c.b], i * 3)
      return { pos, s: 0.05 + R() ** 1.6 * 0.2, start: 4.3 + R() * 1.8, blink: R() * 9, rate: 3 + R() * 5 }
    })
    mesh.geometry.setAttribute('aOpen', new InstancedBufferAttribute(open, 1))
    mesh.geometry.setAttribute('aIris', new InstancedBufferAttribute(iris, 3))
    return { mesh, mat, open, data, o: new Object3D() }
  }, [])

  const z0 = GALLERY.z0, z1 = GALLERY.z1, W = GALLERY.halfW, H = GALLERY.height
  const len = z0 - z1 + 8
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
        const zz = -205 - k * 3.5
        sceneLights.push((k % 2 ? 1 : -1) * 3, 4.5, zz, 9, 1, 0.97, 0.92, 9 * e)
        flashSum += e * 0.35
      }
    })
    fx.flash += clamp(flashSum * 0.16, 0, 0.22)
    // ambient + the steady beam on the last, empty frame
    sceneLights.push(0, 6, z0 - 6, 14, 0.4, 0.42, 0.5, 0.8)
    const beam = smoothstep(5.9, 6.8, u)
    sceneLights.push(0, 3.2, z1 + 5, 9, 1, 0.9, 0.75, 4.5 * beam)
    sceneLights.push(0, 7.4, z1 + 2, 6, 1, 0.92, 0.8, 3 * beam)

    // eyes
    const cam = view.camera
    const { mesh, mat, open, data, o } = eyes
    mat.uniforms.uLight.value = clamp(flashSum * 1.2 + beam * 0.25, 0, 1.6)
    const closeAll = smoothstep(7.0, 7.6, u)
    data.forEach((d, i) => {
      const blink = Math.max(0, Math.sin(film.clock * d.rate * 0.13 + d.blink) - 0.985) * 66
      const k = smoothstep(d.start, d.start + 0.7, u) * (1 - closeAll)
      open[i] = clamp(k * (1 - blink))
      o.position.copy(d.pos)
      if (cam) o.lookAt(cam.position)
      o.scale.setScalar(d.s * (0.05 + 0.95 * k))
      o.updateMatrix()
      mesh.setMatrixAt(i, o.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
    ;(mesh.geometry.getAttribute('aOpen') as InstancedBufferAttribute).needsUpdate = true

    // the empty frame grows into a doorway
    const grow = smoothstep(6.5, 8.0, u)
    emptyFrame.scale.set(1 + grow * 1.0, 1 + grow * 1.35, 1)
    emptyFrame.position.y = 2.45 - grow * 0.45

    GALLERY_FRAMES.forEach((f) => setAnchor(f.id, f.side * (W - 0.1), f.y + f.h / 2 + 0.05, f.z))
  })

  return (
    <SceneRoot range={r}>
      {/* room */}
      <mesh material={floor} rotation-x={-Math.PI / 2} position={[0, 0, z0 - len / 2 + 4]} receiveShadow>
        <planeGeometry args={[W * 2, len]} />
      </mesh>
      <mesh material={wall} rotation-x={Math.PI / 2} position={[0, H, z0 - len / 2 + 4]}>
        <planeGeometry args={[W * 2, len]} />
      </mesh>
      <mesh material={wall} rotation-y={Math.PI / 2} position={[-W, H / 2, z0 - len / 2 + 4]}>
        <planeGeometry args={[len, H]} />
      </mesh>
      <mesh material={wall} rotation-y={-Math.PI / 2} position={[W, H / 2, z0 - len / 2 + 4]}>
        <planeGeometry args={[len, H]} />
      </mesh>
      <mesh material={wall} position={[0, H / 2, z0 + 4]} rotation-y={Math.PI}>
        <planeGeometry args={[W * 2, H]} />
      </mesh>
      {/* end wall with the doorway opening (x ±1.3, y 0..4) */}
      <mesh material={wall} position={[-(W + 1.3) / 2, H / 2, z1]}>
        <boxGeometry args={[W - 1.3, H, 0.2]} />
      </mesh>
      <mesh material={wall} position={[(W + 1.3) / 2, H / 2, z1]}>
        <boxGeometry args={[W - 1.3, H, 0.2]} />
      </mesh>
      <mesh material={wall} position={[0, 4 + (H - 4) / 2, z1]}>
        <boxGeometry args={[2.6, H - 4, 0.2]} />
      </mesh>
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
    { u: 0, pos: [0, 1.62, -197], at: [0, 1.85, -210], fov: 55, cut: true },
    { u: 0.95, pos: [0, 1.62, -204.5], at: [2.6, 2.4, -212] },
    { u: 1.9, pos: [0, 1.62, -211.5], at: [-2.6, 2.3, -219] },
    { u: 2.9, pos: [0, 1.62, -218.5], at: [2.6, 2.2, -226] },
    { u: 3.9, pos: [0, 1.62, -226.5], at: [-2.6, 2.6, -234] },
    { u: 4.85, pos: [0, 1.62, -234.5], at: [2.6, 2.3, -242] },
    { u: 5.8, pos: [0, 1.62, -242.5], at: [-1.2, 2.6, -252] },
    { u: 6.8, pos: [0, 1.6, -251], at: [0, 2.4, -270], tension: 0.4 },
    { u: 8.0, pos: [0, 1.5, -262.5], at: [0, 1.9, -272] },
  ],
  look: [
    { u: 0, veilWhite: 1, exposure: 0.2, saturation: 0.7, contrast: 1.18, paint: 0.45, ink: 0.6, inkFar: 34, vignette: 0.65, tint: [1.0, 0.97, 0.93] },
    { u: 0.55, veilWhite: 0 },
    { u: 4.5, saturation: 0.6 },
    { u: 8, exposure: 0.1 },
  ],
  fog: { color: '#040405', near: 6, far: 34 },
}
