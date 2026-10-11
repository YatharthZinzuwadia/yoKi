// 01.2 — The first frame. A picture frame three storeys tall in a dark chamber.
// The filament reaches its corner; a scan of light reveals a child's smile;
// the glass reflects a grown man with moustache tips. Then: a flash.

import { useMemo } from 'react'
import { AdditiveBlending, DoubleSide, ShaderMaterial } from 'three'
import { audio } from '../../audio/engine'
import type { SceneRange } from '../../content/film'
import { setAnchor } from '../../engine/anchors'
import { film } from '../../engine/director'
import { fx, sceneLights } from '../../engine/fx'
import { range, smoothstep } from '../../engine/math'
import { makeTriggers } from '../../engine/triggers'
import { domeGeometry } from '../../gl/parts/caveGeometry'
import { makeDust } from '../../gl/parts/Dust'
import { sepiaPortrait, useImage } from '../../gl/parts/images'
import { sigilTexture } from '../../gl/parts/sigilTexture'
import { painted } from '../../gl/materials/painted'
import { SceneRoot, useSceneFrame } from '../SceneRoot'
import type { SceneSpec } from '../types'
import { CHAMBER, FRAME } from './world'

const photoVert = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`

const photoFrag = /* glsl */ `
uniform sampler2D uMap;
uniform float uScan, uLight, uTime;
varying vec2 vUv;
float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
void main() {
  vec3 c = texture2D(uMap, vUv).rgb;
  // warm it toward an old print
  float l = dot(c, vec3(0.3, 0.59, 0.11));
  vec3 sepia = vec3(l * 1.08, l * 0.9, l * 0.68);
  c = mix(c, sepia, 0.55);
  float revealed = smoothstep(uScan, uScan - 0.06, vUv.x);
  float bd = (vUv.x - uScan) * 34.0;
  float bar = exp(-bd * bd) * step(0.001, uScan) * step(uScan, 0.999);
  float grain = (h(vUv * 900.0 + fract(uTime) * 50.0) - 0.5) * 0.06;
  vec3 col = c * (0.08 + uLight * revealed) + vec3(1.0, 0.82, 0.55) * bar * 2.4 + grain * revealed;
  gl_FragColor = vec4(col, 1.0);
}`

const glassFrag = /* glsl */ `
uniform sampler2D uGhost;
uniform float uGhostA, uTime;
varying vec2 vUv;
float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
void main() {
  // dust, fingerprints (swirled ridges), scratches
  float dust = smoothstep(0.62, 0.95, n(vUv * 60.0)) * 0.25 + smoothstep(0.985, 1.0, h(floor(vUv * 700.0))) * 0.6;
  vec2 fp = (vUv - vec2(0.72, 0.3)) * vec2(9.0, 7.0);
  float ridge = 0.5 + 0.5 * sin(length(fp) * 38.0 + n(vUv * 20.0) * 3.0);
  float print = ridge * smoothstep(1.0, 0.2, length(fp)) * 0.18;
  float scratch = smoothstep(0.996, 1.0, n(vec2(vUv.x * 4.0 + vUv.y * 40.0, 1.0))) * 0.5;
  vec4 g = texture2D(uGhost, vec2(vUv.x * 1.25 - 0.12, vUv.y * 1.12 - 0.06));
  float ghost = g.a * uGhostA;
  vec3 col = vec3(0.85, 0.82, 0.78) * (dust + print + scratch) * 0.35 + vec3(0.55, 0.6, 0.66) * ghost;
  gl_FragColor = vec4(col, 1.0);
}`

function Frame({ range: r }: { range: SceneRange }) {
  // the anchor is the modelling portfolio portrait (creator, 2026-10-12); Colgate lives on the gallery wall
  const photo = useImage('p1/modelling', sepiaPortrait(3, 'child'), [768, 1024])
  const dome = useMemo(() => domeGeometry({ radius: CHAMBER.radius, center: CHAMBER.center, seed: 9, floorY: 0, rough: 2.4, mouth: 0.22 }), [])
  const domeMat = useMemo(() => painted({ vertexColors: true, roughness: 0.8, side: DoubleSide, detail: [1.0, 0.9, 0.55, 0.4] }), [])
  const lacquer = useMemo(() => painted({ color: '#0d0c0e', roughness: 0.16, metalness: 0.1, bands: 0.06, rim: [0.9, 0.8, 0.7, 0.25] }), [])
  const brass = useMemo(() => painted({ color: '#c99545', roughness: 0.33, metalness: 1, rim: [1, 0.8, 0.5, 0.4] }), [])
  const dust = useMemo(() => makeDust({ count: 1200, center: [0.5, 4.5, -55], size: [12, 9, 22], seed: 12, brightness: 1.2 }), [])
  const trig = useMemo(() => makeTriggers(), [])

  const { W, H, B, D, inW, inH } = useMemo(() => {
    const W = FRAME.outerW, H = FRAME.outerH, B = FRAME.bar, D = FRAME.depth
    return { W, H, B, D, inW: W - B * 2, inH: H - B * 2 }
  }, [])

  const photoMat = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: { uMap: { value: photo }, uScan: { value: 0 }, uLight: { value: 0 }, uTime: { value: 0 } },
        vertexShader: photoVert,
        fragmentShader: photoFrag,
        toneMapped: false,
      }),
    [photo],
  )
  const glassMat = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: { uGhost: { value: sigilTexture(['contour', 'beard', 'moustache'], { size: 512, stroke: 22, blur: 7 }) }, uGhostA: { value: 0 }, uTime: { value: 0 } },
        vertexShader: photoVert,
        fragmentShader: glassFrag,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
      }),
    [],
  )

  const c = FRAME.center
  const z = c.z

  // P1-05: nothing may switch on at a visibility margin. Everything here fades in on u
  // over the same 3.5 units the chamber is visible before the scene starts.
  useSceneFrame(r, (u) => {
    const pre = smoothstep(-3.5, 0, u)
    const p = trig.step(u)
    const scan = range(u, 0.9, 3.1)
    photoMat.uniforms.uScan.value = scan
    photoMat.uniforms.uLight.value = (0.12 + 0.23 * pre) + 0.75 * smoothstep(0.9, 2.2, u)
    photoMat.uniforms.uTime.value = film.clock
    glassMat.uniforms.uGhostA.value = smoothstep(2.9, 3.6, u) * (1 - smoothstep(4.3, 4.7, u)) * 0.16
    // light: the filament's warm pool at the frame's foot, a scan glow, a high cold key
    // a cool backlight behind the frame: from deep in the tunnel the frame reads first as a silhouette
    sceneLights.push(c.x, c.y + 1, z - 3, 16, 0.6, 0.66, 0.8, 2.4 * pre * (1 - smoothstep(1.5, 3, u) * 0.6))
    sceneLights.push(3.0, 0.6, z + 1.2, 8, 1, 0.72, 0.42, 3.2 * pre)
    if (scan > 0 && scan < 1) sceneLights.push(c.x - inW / 2 + inW * scan, c.y, z + 0.8, 6, 1, 0.8, 0.55, 4)
    sceneLights.push(-4, 13, z + 6, 26, 0.55, 0.6, 0.72, 1.2 * pre + smoothstep(0, 2, u) * 1.4)
    sceneLights.push(0, 4.5, z + 9, 14, 1, 0.86, 0.66, smoothstep(1.6, 3, u) * 1.6)
    setAnchor('p1.frame.tl', c.x - W / 2, c.y + H / 2, z + 0.2)
    setAnchor('p1.frame.smile', c.x + 0.25, c.y - 0.15, z + 0.2)
    // the flash behind us (white-out → the gallery)
    const flash = u <= r.length ? smoothstep(4.5, 4.95, u) : 0
    fx.flash += flash
    if (trig.crossed(p, u, 4.5)) audio.cue('flash', { gain: 0.9, pan: 0.2 })
  }, { before: 3.5 })

  return (
    <SceneRoot range={r} before={3.5}>
      <mesh geometry={dome} material={domeMat} receiveShadow />
      <group position={[c.x, c.y, z]}>
        {/* bars */}
        <mesh material={lacquer} position={[0, H / 2 - B / 2, 0]}>
          <boxGeometry args={[W, B, D]} />
        </mesh>
        <mesh material={lacquer} position={[0, -H / 2 + B / 2, 0]}>
          <boxGeometry args={[W, B, D]} />
        </mesh>
        <mesh material={lacquer} position={[-W / 2 + B / 2, 0, 0]}>
          <boxGeometry args={[B, H - B * 2, D]} />
        </mesh>
        <mesh material={lacquer} position={[W / 2 - B / 2, 0, 0]}>
          <boxGeometry args={[B, H - B * 2, D]} />
        </mesh>
        {/* brass inner lip */}
        {[
          [0, inH / 2, inW + 0.08, 0.06],
          [0, -inH / 2, inW + 0.08, 0.06],
          [-inW / 2, 0, 0.06, inH],
          [inW / 2, 0, 0.06, inH],
        ].map(([x, y, w, h], i) => (
          <mesh key={i} material={brass} position={[x, y, D / 2 - 0.02]}>
            <boxGeometry args={[w, h, 0.06]} />
          </mesh>
        ))}
        {/* the photograph and the glass */}
        <mesh material={photoMat} position={[0, 0, -0.02]}>
          <planeGeometry args={[inW, inH]} />
        </mesh>
        <mesh material={glassMat} position={[0, 0, D / 2 - 0.05]}>
          <planeGeometry args={[inW, inH]} />
        </mesh>
        {/* legs / stand */}
        <mesh material={lacquer} position={[-W / 2 + 0.6, -H / 2 - 0.4, -0.4]} rotation-x={0.2}>
          <boxGeometry args={[0.2, 1.0, 0.2]} />
        </mesh>
        <mesh material={lacquer} position={[W / 2 - 0.6, -H / 2 - 0.4, -0.4]} rotation-x={0.2}>
          <boxGeometry args={[0.2, 1.0, 0.2]} />
        </mesh>
      </group>
      <primitive object={dust} />
    </SceneRoot>
  )
}

export const frameSpec: SceneSpec = {
  id: 'p1.frame',
  Component: Frame,
  camera: [
    { u: 0, pos: [0.05, 1.68, -35], at: [0.5, 2.6, -55] },
    { u: 1.3, pos: [0.3, 1.9, -43.5], at: [0.3, 4.6, -64] },
    { u: 2.7, pos: [0.55, 2.35, -50.5], at: [0.05, 5.0, -64], tension: 0.35 },
    { u: 4.0, pos: [1.05, 2.55, -54], at: [-0.25, 5.0, -64], tension: 0.7 },
    { u: 5.0, pos: [1.15, 2.6, -54.6], at: [-0.3, 5.0, -64] },
  ],
  look: [
    { u: 0, exposure: 0.35, saturation: 0.85, inkFar: 40, paint: 0.5 },
    { u: 2.4, exposure: 0.45, saturation: 0.95, tint: [1.02, 0.98, 0.92] },
    { u: 4.4, veilWhite: 0 },
    { u: 5.0, veilWhite: 0.2 },
  ],
  fog: { color: '#050507', near: 8, far: 46 },
}
