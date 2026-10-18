// 01.5 — The name (v2, P1-13): the steamed mirror.
// A small bathroom at night, age 14–15. The mirror is fogged with steam. The camera
// is LOCKED (one slow push, no orbit). His right hand (kada on the wrist) rises and
// writes `yoKi` with a fingertip in the condensation; the cleared strokes reveal his
// reflection behind the fog. Drips run down from the letters. Then the kada sigil.
//
// How it works:
//  • The wordmark's SVG paths are sampled into 2D polylines (pen order).
//  • A 2D canvas is the "wipe mask": strokes are drawn into it up to the current
//    writing progress (white = fog wiped away), plus drips that grow after writing.
//    It is redrawn only when progress changes, then uploaded as a texture.
//  • The mirror shader mixes a blurred, milky version of the reflection (fog) with
//    the sharp reflection where the mask is white. Blur = sampling a lower mipmap
//    level via texture bias.
//  • The hand is the real teen arm (arm.ts). `solveTip` pins the index fingertip on the
//    stroke head every frame (IK on the wrist, corrected by the measured fingertip miss).
//  • THE REFLECTION: the mirror is a hole in the tiled wall. Behind it is a "world behind
//    the glass": the teen photo as the reflected face, and a SECOND copy of the arm inside
//    a group whose matrix is a reflection across the mirror plane (scale z = −1 about the
//    glass). Each frame the second arm copies the first arm's bone rotations, so it is an
//    exact mirror image. The fog is a transparent milky layer on top; where the finger
//    wipes, the fog's alpha drops and you see the sharp reflection — hand included.

import { useEffect, useMemo } from 'react'
import { CanvasTexture, DoubleSide, Group, LinearFilter, Matrix4, RepeatWrapping, ShaderMaterial, SRGBColorSpace, Vector2, Vector3, type Bone } from 'three'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'
import { audio } from '../../audio/engine'
import type { SceneRange } from '../../content/film'
import { setAnchor } from '../../engine/anchors'
import { film } from '../../engine/director'
import { sceneLights } from '../../engine/fx'
import { clamp, range, rng, smoothstep } from '../../engine/math'
import { makeTriggers } from '../../engine/triggers'
import { makeDust } from '../../gl/parts/Dust'
import { mixPose, newPose, POSES, preloadArms, useArm } from '../../gl/parts/arm'
import { sepiaPortrait, useImage } from '../../gl/parts/images'
import { painted } from '../../gl/materials/painted'
import { WORDMARK } from '../../ui/sigil/paths'
import { SceneRoot, useSceneFrame } from '../SceneRoot'
import type { SceneSpec } from '../types'
import { GLASS } from './world'

/** Writing happens across these scene-local units. */
const WRITE = { from: 1.6, to: 3.9 }
/** Mask canvas size (mirror aspect ≈ 1.6). */
const MW = 1024, MH = 640
/** The wordmark occupies this part of the mirror (uv): ~42% wide ≈ 52 cm — within arm's reach. */
const WM = { x0: 0.27, x1: 0.69, yMid: 0.5 }
/** Where the camera stands: at the sink, ~0.5 m from the glass. */
const EYE = { x: 0.03, y: 1.5, dz: 0.5 }
/** The reflected face sits as far behind the glass as the eye is in front of it. */
const REFL_DEPTH = 0.55

preloadArms(['teen'])

/** Wordmark strokes as 2D polylines in mask-canvas pixels, with arc lengths. */
function buildStrokes() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 250 150">${WORDMARK.map((d) => `<path d="${d}"/>`).join('')}</svg>`
  const data = new SVGLoader().parse(svg)
  const scale = ((WM.x1 - WM.x0) * MW) / 250
  const ox = WM.x0 * MW, oy = (1 - WM.yMid) * MH - 75 * scale
  const strokes: Vector2[][] = []
  for (const p of data.paths)
    for (const sp of p.subPaths) strokes.push(sp.getSpacedPoints(90).map((q) => new Vector2(ox + q.x * scale, oy + q.y * scale)))
  const lengths = strokes.map((s) => s.reduce((a, q, i) => (i ? a + q.distanceTo(s[i - 1]) : 0), 0))
  const total = lengths.reduce((a, b) => a + b, 0)
  // drip seeds: the lowest points of each stroke, where water would gather
  const R = rng(15)
  const drips = strokes.flatMap((s, si) =>
    s
      .filter((_, i) => i % 11 === 5)
      .filter(() => R() > 0.35)
      .map((q) => ({ x: q.x + (R() - 0.5) * 4, y: q.y, len: 40 + R() * 160, w: 4 + R() * 5, delay: R() * 0.8, stroke: si })),
  )
  return { strokes, lengths, total, drips }
}

const vert = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`
// The fog layer (transparent). Behind it, the real "world behind the glass".
const fogFrag = /* glsl */ `
uniform sampler2D uMask;
uniform float uFog, uLight, uTime, uFade;
varying vec2 vUv;
float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
void main() {
  float wipe = texture2D(uMask, vUv).r;
  // condensation: milky veil, denser toward the bottom and edges, micro-beads
  float edge = smoothstep(0.3, 0.0, min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y))) * 0.25;
  float beads = smoothstep(0.7, 0.95, n(vUv * vec2(300.0, 190.0))) * 0.5 + smoothstep(0.86, 1.0, h(floor(vUv * vec2(480.0, 300.0)))) * 0.35;
  float fog = clamp(uFog * (0.8 + 0.2 * n(vUv * 5.0 + uTime * 0.02) + edge - vUv.y * 0.12), 0.0, 1.0);
  float a = fog * (1.0 - wipe) * 0.9;
  vec3 milky = vec3(0.42, 0.41, 0.4) * (0.55 + 0.45 * uLight) + beads * 0.08 * uLight;
  // a thin bright rim of water where the finger passed; beads re-form slightly inside strokes
  float rim = smoothstep(0.12, 0.5, wipe) * (1.0 - smoothstep(0.5, 0.95, wipe));
  vec3 col = milky + rim * 0.35 * uLight;
  a = max(a, rim * 0.35 + beads * wipe * 0.12);
  gl_FragColor = vec4(col * uFade, a * uFade);
}`

// The reflected face: the photo, lit by the bulb's reflection (unlit plane).
const reflFrag = /* glsl */ `
uniform sampler2D uRefl;
uniform float uLight, uFade;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(uRefl, vUv).rgb;
  // silvered glass loses a little light and warms it
  gl_FragColor = vec4(c * (0.25 + 0.7 * uLight) * vec3(1.0, 0.97, 0.93) * uFade, 1.0);
}`

/** Bathroom tiles drawn on a canvas (white glazed tiles, grey grout, a little grime). */
function tileTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 512
  const g = c.getContext('2d')!
  g.fillStyle = '#7d7f80'
  g.fillRect(0, 0, 512, 512)
  const R = rng(4)
  for (let y = 0; y < 4; y++)
    for (let x = 0; x < 4; x++) {
      const v = 228 + Math.floor(R() * 18)
      g.fillStyle = `rgb(${v},${v},${v - 4})`
      g.fillRect(x * 128 + 3, y * 128 + 3, 122, 122)
      g.fillStyle = 'rgba(255,255,255,0.35)'
      g.fillRect(x * 128 + 8, y * 128 + 8, 60, 6)
    }
  for (let i = 0; i < 900; i++) {
    g.fillStyle = `rgba(70,60,40,${R() * 0.05})`
    g.fillRect(R() * 512, R() * 512, 2 + R() * 10, 2 + R() * 10)
  }
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  t.wrapS = t.wrapT = RepeatWrapping
  t.repeat.set(8, 6)
  t.anisotropy = 8
  return t
}

function Name({ range: r }: { range: SceneRange }) {
  // PLACEHOLDER(creator): generated teenager; swap with a real photo at the same filename if wanted
  const refl = useImage('p1/teen-mirror', sepiaPortrait(15, 'teen'), [1216, 768])
  const S = useMemo(buildStrokes, [])
  const mask = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = MW
    c.height = MH
    const t = new CanvasTexture(c)
    t.minFilter = LinearFilter
    t.generateMipmaps = false
    return { c, g: c.getContext('2d')!, t, last: -1 }
  }, [])
  const fogMat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: vert,
        fragmentShader: fogFrag,
        uniforms: { uMask: { value: mask.t }, uFog: { value: 1 }, uLight: { value: 1 }, uTime: { value: 0 }, uFade: { value: 1 } },
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      }),
    [mask],
  )
  const reflMat = useMemo(
    () => new ShaderMaterial({ vertexShader: vert, fragmentShader: reflFrag, uniforms: { uRefl: { value: refl }, uLight: { value: 1 }, uFade: { value: 1 } }, toneMapped: false }),
    [refl],
  )
  const tiles = useMemo(() => painted({ map: tileTexture(), roughness: 0.25, bands: 0.06 }), [])
  const porcelain = useMemo(() => painted({ color: '#e8e6e0', roughness: 0.2, bands: 0.08, rim: [1, 0.9, 0.8, 0.2] }), [])
  const steel = useMemo(() => painted({ color: '#b8bcc0', roughness: 0.25, metalness: 1 }), [])
  const frameMat = useMemo(() => painted({ color: '#2a2622', roughness: 0.5, bands: 0.08 }), [])
  const steam = useMemo(() => makeDust({ count: 700, center: [GLASS.center.x, 1.3, GLASS.center.z + 1.0], size: [2.2, 1.6, 1.8], seed: 31, brightness: 2.2, pointSize: 2.2 }), [])

  // the real arm, and its mirror image living behind the glass
  const arm = useArm('teen')
  const mirrorArm = useArm('teen')
  const mirrorWorld = useMemo(() => {
    const g = new Group()
    const zm = GLASS.center.z
    // reflection across the plane z = zm:  z' = 2·zm − z
    g.matrixAutoUpdate = false
    g.matrix.copy(new Matrix4().makeTranslation(0, 0, 2 * zm).multiply(new Matrix4().makeScale(1, 1, -1)))
    return g
  }, [])
  const bonePairs = useMemo(() => {
    const pairs: [Bone, Bone][] = []
    for (const [name, b] of Object.entries(arm.bones)) if (mirrorArm.bones[name]) pairs.push([b, mirrorArm.bones[name]])
    return pairs
  }, [arm, mirrorArm])
  const pose = useMemo(newPose, [])
  const trig = useMemo(() => makeTriggers(), [])
  const tmp = useMemo(
    () => ({ p: new Vector2(), w: new Vector3(), shoulder: new Vector3(), pole: new Vector3(0.7, -1, 0.3), fingers: new Vector3(), palm: new Vector3() }),
    [],
  )
  useEffect(() => () => mask.t.dispose(), [mask])

  /** Point along all strokes at fraction s → canvas px. */
  const headAt = (s: number, out: Vector2) => {
    let d = clamp(s) * S.total
    for (let i = 0; i < S.strokes.length; i++) {
      if (d <= S.lengths[i] || i === S.strokes.length - 1) {
        const pts = S.strokes[i]
        let acc = 0
        for (let k = 1; k < pts.length; k++) {
          const seg = pts[k].distanceTo(pts[k - 1])
          if (acc + seg >= d) return out.copy(pts[k - 1]).lerp(pts[k], (d - acc) / Math.max(seg, 1e-6))
          acc += seg
        }
        return out.copy(pts[pts.length - 1])
      }
      d -= S.lengths[i]
    }
    return out
  }

  /** Canvas px → world point on the mirror. */
  const toWorld = (q: Vector2, out: Vector3) =>
    out.set(GLASS.center.x + (q.x / MW - 0.5) * GLASS.w, GLASS.center.y + (0.5 - q.y / MH) * GLASS.h, GLASS.center.z + 0.004)

  /** Redraw the wipe mask: strokes up to `draw`, drips grown to `drip`. */
  const paintMask = (draw: number, drip: number) => {
    const key = Math.round(draw * 400) * 1000 + Math.round(drip * 400)
    if (key === mask.last) return
    mask.last = key
    const g = mask.g
    g.fillStyle = '#000'
    g.fillRect(0, 0, MW, MH)
    g.strokeStyle = '#fff'
    g.lineCap = g.lineJoin = 'round'
    g.lineWidth = 19 // ≈ 2.3 cm: a fingertip
    g.shadowColor = '#fff'
    g.shadowBlur = 5
    let left = draw * S.total
    for (let i = 0; i < S.strokes.length && left > 0; i++) {
      const pts = S.strokes[i]
      g.beginPath()
      g.moveTo(pts[0].x, pts[0].y)
      let acc = 0
      for (let k = 1; k < pts.length; k++) {
        const seg = pts[k].distanceTo(pts[k - 1])
        if (acc + seg > left) {
          const f = (left - acc) / seg
          g.lineTo(pts[k - 1].x + (pts[k].x - pts[k - 1].x) * f, pts[k - 1].y + (pts[k].y - pts[k - 1].y) * f)
          break
        }
        g.lineTo(pts[k].x, pts[k].y)
        acc += seg
      }
      g.stroke()
      left -= S.lengths[i]
    }
    // drips: thin wiped trails running down from the letters, wobbling a little
    if (drip > 0) {
      g.shadowBlur = 2
      for (const d of S.drips) {
        const k = clamp((drip - d.delay) / (1 - d.delay))
        if (k <= 0) continue
        const L = d.len * 0.5 * k * k
        g.lineWidth = d.w * 0.55
        g.beginPath()
        g.moveTo(d.x, d.y)
        for (let y = 0; y <= L; y += 6) g.lineTo(d.x + Math.sin((d.y + y) * 0.05) * 1.5, d.y + y)
        g.stroke()
        g.beginPath()
        g.arc(d.x, d.y + L, d.w * 0.55, 0, Math.PI * 2)
        g.fillStyle = '#fff'
        g.fill()
      }
    }
    mask.t.needsUpdate = true
  }

  useSceneFrame(r, (u) => {
    const p = trig.step(u)
    const w = range(u, WRITE.from, WRITE.to)
    const draw = w * w * (3 - 2 * w)
    const drip = range(u, WRITE.to - 0.6, WRITE.to + 1.6)
    paintMask(draw, drip)
    const fade = 1 - smoothstep(5.1, 6.0, u)
    const bulb = smoothstep(0.2, 1.2, u) * fade
    fogMat.uniforms.uTime.value = film.clock
    fogMat.uniforms.uLight.value = 0.35 + 0.65 * bulb
    const vis = 0.15 + 0.85 * smoothstep(0, 0.8, u) * fade
    fogMat.uniforms.uFade.value = vis
    reflMat.uniforms.uLight.value = 0.3 + 0.7 * bulb
    reflMat.uniforms.uFade.value = vis
    if (trig.crossed(p, u, WRITE.from + 0.05)) audio.cue('squeak', { gain: 0.32 })
    if (trig.crossed(p, u, WRITE.from + 1.0)) audio.cue('squeak', { gain: 0.28, rate: 1.12 })
    if (trig.crossed(p, u, WRITE.from + 1.8)) audio.cue('squeak', { gain: 0.25, rate: 0.92 })

    // one warm bulb above the mirror, its reflection behind the glass, and the bounce off the tiles
    const zm = GLASS.center.z
    sceneLights.push(GLASS.center.x, GLASS.center.y + 0.62, zm + 0.42, 4.5, 1, 0.8, 0.55, 2.6 * bulb)
    sceneLights.push(GLASS.center.x, GLASS.center.y + 0.62, zm - 0.42, 3.0, 1, 0.8, 0.55, 1.6 * bulb)
    sceneLights.push(GLASS.center.x + 0.4, 0.9, zm + 1.2, 3.5, 0.9, 0.85, 0.78, 0.8 * bulb)
    setAnchor('p1.glass', GLASS.center.x + GLASS.w / 2 - 0.05, GLASS.center.y + GLASS.h / 2 - 0.06, zm)

    // THE HAND. Shoulder sits just below-right of the eye; the fingertip follows the stroke
    // head while writing, and the hand rests low (out of frame) before and after.
    const writing = smoothstep(WRITE.from - 0.4, WRITE.from, u) * (1 - smoothstep(WRITE.to, WRITE.to + 0.5, u))
    const show = smoothstep(0.9, 1.4, u) * (1 - smoothstep(4.4, 4.9, u))
    arm.root.visible = mirrorArm.root.visible = show > 0.001
    if (show > 0.001) {
      mixPose(POSES.relaxed, POSES.point, smoothstep(1.0, 1.5, u), pose)
      arm.setPose(pose)
      // you lean in to write on a mirror: the shoulder comes ~16 cm forward while writing
      tmp.shoulder.set(EYE.x + 0.17, EYE.y - 0.25, zm + EYE.dz + 0.04 - 0.2 * writing)
      toWorld(headAt(draw, tmp.p), tmp.w)
      // rest: low right, 20 cm off the glass; blend toward the stroke head while writing
      const rx = EYE.x + 0.22, ry = EYE.y - 0.62 + show * 0.18, rz = zm + 0.26
      tmp.w.set(tmp.w.x + (rx - tmp.w.x) * (1 - writing), tmp.w.y + (ry - tmp.w.y) * (1 - writing), tmp.w.z + (rz - tmp.w.z) * (1 - writing))
      // fingers reach toward the glass and a little up; the pad of the finger faces it
      tmp.fingers.set(-0.18 - (tmp.w.x - EYE.x) * 0.4, 0.42, -1).normalize()
      tmp.palm.set(-0.25, -0.35, -1).normalize()
      arm.solveTip('index', tmp.w, { shoulder: tmp.shoulder, pole: tmp.pole, fingers: tmp.fingers, palm: tmp.palm })
      // mirror image: same root transform + same bone rotations, inside the reflected group
      mirrorArm.root.position.copy(arm.root.position)
      mirrorArm.root.quaternion.copy(arm.root.quaternion)
      for (const [a, b] of bonePairs) b.quaternion.copy(a.quaternion)
      mirrorWorld.updateMatrixWorld(true)
    }
  })

  const g = GLASS
  const z = g.center.z
  // tiled wall WITH A HOLE where the mirror is (the reflection lives behind it)
  const W = 2.4, H = 2.8, cx = g.center.x, cy = 1.3
  const top = cy + H / 2, bot = cy - H / 2
  const mt = g.center.y + g.h / 2, mb = g.center.y - g.h / 2, ml = cx - g.w / 2, mr = cx + g.w / 2
  return (
    <SceneRoot range={r} after={0.6}>
      <mesh material={tiles} position={[cx, (top + mt) / 2, z - 0.01]}>
        <planeGeometry args={[W, top - mt]} />
      </mesh>
      <mesh material={tiles} position={[cx, (mb + bot) / 2, z - 0.01]}>
        <planeGeometry args={[W, mb - bot]} />
      </mesh>
      <mesh material={tiles} position={[(cx - W / 2 + ml) / 2, g.center.y, z - 0.01]}>
        <planeGeometry args={[ml - (cx - W / 2), g.h]} />
      </mesh>
      <mesh material={tiles} position={[(mr + cx + W / 2) / 2, g.center.y, z - 0.01]}>
        <planeGeometry args={[cx + W / 2 - mr, g.h]} />
      </mesh>
      <mesh material={tiles} position={[cx - 1.2, 1.3, z + 1.6]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[3.2, 2.8]} />
      </mesh>
      <mesh material={tiles} position={[cx + 1.2, 1.3, z + 1.6]} rotation-y={-Math.PI / 2}>
        <planeGeometry args={[3.2, 2.8]} />
      </mesh>
      <mesh material={tiles} position={[cx, 2.7, z + 1.6]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[2.4, 3.2]} />
      </mesh>
      <mesh material={porcelain} position={[cx, -0.05, z + 1.6]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[2.4, 3.2]} />
      </mesh>
      {/* the world behind the glass: the reflected face, and the reflected arm */}
      <mesh material={reflMat} position={[cx, g.center.y + 0.02, z - REFL_DEPTH]}>
        <planeGeometry args={[2.0, 2.0 / 1.583]} />
      </mesh>
      {/* a box behind the hole so nothing but the reflection is ever seen through it */}
      <mesh position={[cx, g.center.y, z - REFL_DEPTH - 0.02]}>
        <planeGeometry args={[3, 2.4]} />
        <meshBasicMaterial color="#0a0908" />
      </mesh>
      <primitive object={mirrorWorld}>
        <primitive object={mirrorArm.root} />
      </primitive>
      {/* the fog on the glass */}
      <mesh material={fogMat} position={[cx, g.center.y, z]} renderOrder={3}>
        <planeGeometry args={[g.w, g.h]} />
      </mesh>
      {[
        [0, g.h / 2 + 0.02, g.w + 0.08, 0.04],
        [0, -g.h / 2 - 0.02, g.w + 0.08, 0.04],
        [-g.w / 2 - 0.02, 0, 0.04, g.h],
        [g.w / 2 + 0.02, 0, 0.04, g.h],
      ].map(([x, y, w, h], i) => (
        <mesh key={i} material={frameMat} position={[cx + x, g.center.y + y, z + 0.01]}>
          <boxGeometry args={[w, h, 0.03]} />
        </mesh>
      ))}
      {/* the sink and tap below the mirror; a bare bulb above */}
      <mesh material={porcelain} position={[cx, g.center.y - g.h / 2 - 0.32, z + 0.26]}>
        <boxGeometry args={[0.62, 0.14, 0.46]} />
      </mesh>
      <mesh material={steel} position={[cx, g.center.y - g.h / 2 - 0.18, z + 0.1]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.012, 0.012, 0.16, 10]} />
      </mesh>
      <mesh position={[cx, g.center.y + 0.62, z + 0.42]}>
        <sphereGeometry args={[0.045, 16, 12]} />
        <meshBasicMaterial color="#ffd9a0" toneMapped={false} side={DoubleSide} />
      </mesh>
      <primitive object={steam} />
      <primitive object={arm.root} />
    </SceneRoot>
  )
}

// The camera arrives from the house corridor, stops at the sink, and is then LOCKED.
// Every arrival key has tension 1 (zero velocity) so the Hermite curve cannot overshoot.
const EZ = -174.4 + EYE.dz
export const nameSpec: SceneSpec = {
  id: 'p1.name',
  Component: Name,
  camera: [
    { u: 0, pos: [0, 1.2, -160.9], at: [0, 1.32, -174.4] },
    { u: 0.8, pos: [0.01, 1.42, -168.6], at: [0, 1.42, -174.4] },
    { u: 1.5, pos: [EYE.x, EYE.y, EZ], at: [0, 1.43, -174.4], fov: 58, tension: 1 },
    { u: 4.2, pos: [EYE.x, EYE.y, EZ - 0.02], at: [0, 1.43, -174.4], fov: 58, tension: 1 },
    { u: 6.0, pos: [EYE.x, EYE.y - 0.01, EZ - 0.06], at: [0, 1.43, -174.4], fov: 58, tension: 1 },
  ],
  look: [
    { u: 0, exposure: -0.3, saturation: 0.7, paint: 0.3, ink: 0.25, inkFar: 8, vignette: 0.7, bloom: 0.9, tint: [1.02, 0.98, 0.93] },
    { u: 1.3, exposure: -0.05, saturation: 0.82 },
    { u: 5.6, exposure: -0.05 },
  ],
  fog: { color: '#050505', near: 3, far: 16 },
}
