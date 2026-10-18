// 01.2 — The first frame. A picture frame three storeys tall, standing in a quarried rock
// wall at the back of the chamber. The filament reaches its corner; a scan of light reveals
// the modelling portrait (age 9, navy blazer). Then — P1-07, no cut — a flash fires BEHIND
// the portrait: it's a back-lit print on a scrim; the light shines through the child, and the
// scrim rolls up like a blind. The frame's opening is a doorway, and we walk through the
// photograph into the gallery that was behind it all along.
//
// HOW (learning notes):
//  • The chamber dome is cut behind the wall (domeGeometry `backCut`); the wall is four thick
//    boxes around the frame's opening, so the gallery behind is only visible through it.
//  • The scrim shader discards everything below `uRoll` (0 → 1), so the print disappears
//    upward; a cylinder that grows thicker as it climbs is the rolled-up fabric.
//  • `uBack` mixes in transmitted light (a print lit from behind glows warm and its darks
//    turn translucent), and lowers alpha so the gallery shows through the child.

import { useMemo } from 'react'
import { DoubleSide, Object3D, ShaderMaterial } from 'three'
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
import { painted, triSet } from '../../gl/materials/painted'
import { SceneRoot, useSceneFrame } from '../SceneRoot'
import type { SceneSpec } from '../types'
import { Studio } from './Studio'
import { CHAMBER, FRAME, STUDIO_WALL } from './world'

/** Scene-local timing of the walk-through (also used by the camera keys below). */
const T = { flash: 3.62, rollFrom: 3.8, rollTo: 4.65 }

const photoVert = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`

const scrimFrag = /* glsl */ `
uniform sampler2D uMap;
uniform float uScan, uLight, uTime, uBack, uRoll;
varying vec2 vUv;
float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
void main() {
  if (vUv.y < uRoll) discard;
  vec3 c = texture2D(uMap, vUv).rgb;
  // warm it toward an old print
  float l = dot(c, vec3(0.3, 0.59, 0.11));
  vec3 sepia = vec3(l * 1.08, l * 0.9, l * 0.68);
  c = mix(c, sepia, 0.5);
  float revealed = smoothstep(uScan, uScan - 0.06, vUv.x);
  float bd = (vUv.x - uScan) * 34.0;
  float bar = exp(-bd * bd) * step(0.001, uScan) * step(uScan, 0.999);
  float grain = (h(vUv * 900.0 + fract(uTime) * 50.0) - 0.5) * 0.04;
  vec3 col = c * (0.08 + uLight * revealed) + vec3(1.0, 0.82, 0.55) * bar * 2.4 + grain * revealed;
  // back-lit: transmitted light through the fabric (bright where the print is light)
  vec3 through = c * vec3(1.35, 1.12, 0.86) * 3.2 + vec3(0.6, 0.5, 0.36) * 0.4;
  col = mix(col, through, uBack);
  // the roll's curl: a soft shadow just above the rolling edge
  col *= 1.0 - 0.55 * smoothstep(0.05, 0.0, vUv.y - uRoll) * step(0.0001, uRoll);
  float alpha = 1.0 - uBack * (1.0 - l) * 0.55;
  gl_FragColor = vec4(col, alpha);
}`

function Frame({ range: r }: { range: SceneRange }) {
  // the anchor is the modelling portfolio portrait (creator, 2026-10-12); Colgate lives on the gallery wall
  const photo = useImage('p1/modelling', sepiaPortrait(3, 'child'), [768, 1024])
  const dome = useMemo(
    () => domeGeometry({ radius: CHAMBER.radius, center: CHAMBER.center, seed: 9, floorY: 0, rough: 2.4, mouth: 0.22, backCut: STUDIO_WALL.z - 0.3 }),
    [],
  )
  const rock = useMemo(() => triSet('rock061'), [])
  const domeMat = useMemo(
    () => painted({ vertexColors: true, roughness: 0.92, side: DoubleSide, tri: { set: rock, scale: 0.18, normal: 1.0, rough: 0.6, tint: [1.4, 1.3, 1.2] }, detail: [0.2, 0.5, 0.3, 0.3] }),
    [rock],
  )
  // the quarried face: the same sandstone, cut flat, a little darker
  const wallMat = useMemo(() => painted({ color: '#8a8076', roughness: 0.92, tri: { set: rock, scale: 0.35, normal: 0.9, rough: 0.6, tint: [1.3, 1.22, 1.12] } }), [rock])
  const lacquer = useMemo(() => painted({ color: '#0d0c0e', roughness: 0.16, metalness: 0.1, bands: 0.06, rim: [0.9, 0.8, 0.7, 0.25] }), [])
  const brass = useMemo(() => painted({ color: '#c99545', roughness: 0.33, metalness: 1, rim: [1, 0.8, 0.5, 0.4] }), [])
  const paper = useMemo(() => painted({ color: '#d9cdb8', roughness: 0.85, side: DoubleSide }), [])
  const dust = useMemo(() => makeDust({ count: 1200, center: [0.5, 4.5, -55], size: [12, 9, 22], seed: 12, brightness: 1.2 }), [])
  const trig = useMemo(() => makeTriggers(), [])
  const roll = useMemo(() => new Object3D(), [])

  const { W, H, B, D, inW, inH } = useMemo(() => {
    const W = FRAME.outerW, H = FRAME.outerH, B = FRAME.bar, D = FRAME.depth
    return { W, H, B, D, inW: W - B * 2, inH: H - B * 2 }
  }, [])

  const scrimMat = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uMap: { value: photo },
          uScan: { value: 0 },
          uLight: { value: 0 },
          uTime: { value: 0 },
          uBack: { value: 0 },
          uRoll: { value: 0 },
        },
        vertexShader: photoVert,
        fragmentShader: scrimFrag,
        transparent: true,
        toneMapped: false,
      }),
    [photo],
  )

  const c = FRAME.center
  const z = c.z
  const opening = { x0: c.x - inW / 2, x1: c.x + inW / 2, y0: c.y - inH / 2, y1: c.y + inH / 2 }
  const wz = STUDIO_WALL.z - 0.25

  // P1-05: nothing may switch on at a visibility margin. Everything here fades in on u
  // over the same 3.5 units the chamber is visible before the scene starts.
  useSceneFrame(
    r,
    (u) => {
      const pre = smoothstep(-3.5, 0, u)
      const p = trig.step(u)
      const scan = range(u, 0.9, 3.1)
      const U = scrimMat.uniforms
      U.uScan.value = scan
      U.uLight.value = 0.12 + 0.23 * pre + 0.75 * smoothstep(0.9, 2.2, u)
      U.uTime.value = film.clock
      // the flash behind the print, then the back-light holds while it rolls up
      const flashE = u >= T.flash ? Math.exp(-(u - T.flash) * 6) : 0
      U.uBack.value = Math.min(1, flashE * 1.4 + smoothstep(T.flash, T.rollFrom, u) * 0.55)
      const k = smoothstep(T.rollFrom, T.rollTo, u)
      U.uRoll.value = k
      roll.visible = k > 0.001 && k < 0.999
      roll.position.y = opening.y0 + k * inH
      roll.scale.setScalar(0.35 + k * 0.9)

      // lights: a cool backlight behind the frame (from the tunnel it reads first as a
      // silhouette); the filament's warm pool at its foot; the scan glow; a high cold key
      sceneLights.push(c.x, c.y + 1, z - 3, 16, 0.6, 0.66, 0.8, 2.4 * pre * (1 - smoothstep(1.5, 3, u) * 0.6))
      sceneLights.push(3.0, 0.6, z + 1.2, 8, 1, 0.72, 0.42, 3.2 * pre)
      if (scan > 0 && scan < 1) sceneLights.push(c.x - inW / 2 + inW * scan, c.y, z + 0.8, 6, 1, 0.8, 0.55, 4)
      sceneLights.push(-4, 13, z + 6, 26, 0.55, 0.6, 0.72, 1.2 * pre + smoothstep(0, 2, u) * 1.4)
      sceneLights.push(0, 4.5, z + 9, 14, 1, 0.86, 0.66, smoothstep(1.6, 3, u) * 1.6 * (1 - smoothstep(4.2, 5, u)))
      // the flash itself, just inside the gallery: it lights the back of the print and spills
      // through the opening onto the chamber floor
      sceneLights.push(0, 5.2, z - 3.5, 18, 1, 0.96, 0.9, 30 * flashE)
      fx.flash += flashE * 0.18
      if (trig.crossed(p, u, T.flash)) audio.cue('flash', { gain: 0.9, pan: 0 })

      setAnchor('p1.frame.tl', c.x - W / 2, c.y + H / 2, z + 0.2)
      setAnchor('p1.frame.smile', c.x + 0.25, c.y - 0.15, z + 0.2)
    },
    { before: 3.5, after: 1.8 },
  )

  return (
    <SceneRoot range={r} before={3.5} after={1.8}>
      <mesh geometry={dome} material={domeMat} receiveShadow />
      {/* the quarried wall with the frame's opening cut through it */}
      <group>
        <mesh material={wallMat} position={[(opening.x0 - STUDIO_WALL.halfW) / 2, STUDIO_WALL.height / 2, wz]}>
          <boxGeometry args={[STUDIO_WALL.halfW + opening.x0, STUDIO_WALL.height, 0.5]} />
        </mesh>
        <mesh material={wallMat} position={[(opening.x1 + STUDIO_WALL.halfW) / 2, STUDIO_WALL.height / 2, wz]}>
          <boxGeometry args={[STUDIO_WALL.halfW - opening.x1, STUDIO_WALL.height, 0.5]} />
        </mesh>
        <mesh material={wallMat} position={[c.x, (opening.y1 + STUDIO_WALL.height) / 2, wz]}>
          <boxGeometry args={[inW, STUDIO_WALL.height - opening.y1, 0.5]} />
        </mesh>
        <mesh material={wallMat} position={[c.x, opening.y0 / 2, wz]}>
          <boxGeometry args={[inW, opening.y0, 0.5]} />
        </mesh>
      </group>
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
        {/* the print, on a scrim */}
        <mesh material={scrimMat} position={[0, 0, 0]} renderOrder={3}>
          <planeGeometry args={[inW, inH]} />
        </mesh>
      </group>
      {/* the rolled-up scrim climbing to the top bar */}
      <primitive object={roll} position={[c.x, opening.y0, z + 0.06]}>
        <mesh material={paper} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.1, 0.1, inW, 20, 1]} />
        </mesh>
      </primitive>
      <Studio range={r} />
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
    { u: 3.7, pos: [0.85, 2.4, -53.2], at: [-0.1, 4.9, -64], tension: 0.8 },
    { u: 4.4, pos: [0.4, 2.0, -58.6], at: [0.05, 3.3, -67] },
    // u 5.0 is the gallery's first key: the camera keeps walking, through the frame
  ],
  look: [
    { u: 0, exposure: 0.35, saturation: 0.85, inkFar: 40, paint: 0.5 },
    { u: 2.4, exposure: 0.45, saturation: 0.95, tint: [1.02, 0.98, 0.92] },
    { u: 5.0, exposure: 0.3 },
  ],
  fog: { color: '#050507', near: 8, far: 46 },
}
