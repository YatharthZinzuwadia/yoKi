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
//  • The hand's fingertip is placed exactly on the stroke head each frame.

import { useEffect, useMemo } from 'react'
import { CanvasTexture, DoubleSide, LinearFilter, RepeatWrapping, ShaderMaterial, SRGBColorSpace, Vector2, Vector3 } from 'three'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'
import { audio } from '../../audio/engine'
import type { SceneRange } from '../../content/film'
import { setAnchor } from '../../engine/anchors'
import { film } from '../../engine/director'
import { sceneLights } from '../../engine/fx'
import { clamp, range, rng, smoothstep } from '../../engine/math'
import { makeTriggers } from '../../engine/triggers'
import { makeDust } from '../../gl/parts/Dust'
import { makeHand, mixPose, POSES, type HandPose } from '../../gl/parts/hand'
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
/** The wordmark occupies this part of the mirror (uv): centred, ~70% wide. */
const WM = { x0: 0.15, x1: 0.85, yMid: 0.53 }

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
const mirrorFrag = /* glsl */ `
uniform sampler2D uRefl, uMask;
uniform float uFog, uLight, uTime, uFade;
varying vec2 vUv;
float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
void main() {
  float wipe = texture2D(uMask, vUv).r;
  vec3 sharp = texture2D(uRefl, vUv).rgb;
  vec3 blurred = texture2D(uRefl, vUv, 5.0).rgb;
  // condensation: milky veil, micro-droplets, denser toward the bottom and edges
  float edgeFog = smoothstep(0.35, 0.0, min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y))) * 0.35;
  float beads = smoothstep(0.72, 0.95, n(vUv * vec2(260.0, 160.0))) * 0.35 + smoothstep(0.86, 1.0, h(floor(vUv * vec2(420.0, 260.0)))) * 0.25;
  float fog = clamp(uFog * (0.82 + 0.18 * n(vUv * 6.0 + uTime * 0.03) + edgeFog - vUv.y * 0.15), 0.0, 1.0);
  // thick enough that he is only a shape until the finger wipes the glass
  vec3 milky = mix(blurred * 0.4, vec3(0.34, 0.33, 0.32) * uLight, 0.8) + beads * uLight * 0.16;
  vec3 col = mix(sharp * (0.7 + 0.3 * uLight), milky, fog * (1.0 - wipe));
  // the wiped edge holds a thin bright rim of water
  float rim = smoothstep(0.15, 0.5, wipe) * (1.0 - smoothstep(0.5, 0.95, wipe));
  col += rim * 0.18 * uLight;
  gl_FragColor = vec4(col * uFade, 1.0);
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
  const mirrorMat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: vert,
        fragmentShader: mirrorFrag,
        uniforms: { uRefl: { value: refl }, uMask: { value: mask.t }, uFog: { value: 1 }, uLight: { value: 1 }, uTime: { value: 0 }, uFade: { value: 1 } },
        toneMapped: false,
      }),
    [refl, mask],
  )
  const tiles = useMemo(() => painted({ map: tileTexture(), roughness: 0.25, bands: 0.06 }), [])
  const porcelain = useMemo(() => painted({ color: '#e8e6e0', roughness: 0.2, bands: 0.08, rim: [1, 0.9, 0.8, 0.2] }), [])
  const steel = useMemo(() => painted({ color: '#b8bcc0', roughness: 0.25, metalness: 1 }), [])
  const frameMat = useMemo(() => painted({ color: '#2a2622', roughness: 0.5, bands: 0.08 }), [])
  const steam = useMemo(() => makeDust({ count: 700, center: [GLASS.center.x, 1.3, GLASS.center.z + 1.0], size: [2.2, 1.6, 1.8], seed: 31, brightness: 2.2, pointSize: 2.2 }), [])
  const hand = useMemo(() => makeHand({ skin: '#d6a17a', kada: true, sleeve: '#16161a', scale: 0.95 }), [])
  const pose = useMemo<HandPose>(() => ({ curl: [0, 0, 0, 0], thumb: 0, spread: 0 }), [])
  const trig = useMemo(() => makeTriggers(), [])
  const tmp = useMemo(() => ({ p: new Vector2(), w: new Vector3(), tip: new Vector3() }), [])
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
    out.set(GLASS.center.x + (q.x / MW - 0.5) * GLASS.w, GLASS.center.y + (0.5 - q.y / MH) * GLASS.h, GLASS.center.z + 0.012)

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
    g.lineWidth = 40 // a fingertip-wide wipe
    g.shadowColor = '#fff'
    g.shadowBlur = 6
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
        const L = d.len * k * k
        g.lineWidth = d.w
        g.beginPath()
        g.moveTo(d.x, d.y)
        for (let y = 0; y <= L; y += 8) g.lineTo(d.x + Math.sin((d.y + y) * 0.05) * 2, d.y + y)
        g.stroke()
        g.beginPath()
        g.arc(d.x, d.y + L, d.w * 0.9, 0, Math.PI * 2)
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
    mirrorMat.uniforms.uTime.value = film.clock
    mirrorMat.uniforms.uLight.value = 0.3 + 0.6 * bulb
    mirrorMat.uniforms.uFade.value = 0.15 + 0.85 * smoothstep(0, 0.8, u) * fade
    if (trig.crossed(p, u, WRITE.from + 0.05)) audio.cue('squeak', { gain: 0.32 })
    if (trig.crossed(p, u, WRITE.from + 1.0)) audio.cue('squeak', { gain: 0.28, rate: 1.12 })
    if (trig.crossed(p, u, WRITE.from + 1.8)) audio.cue('squeak', { gain: 0.25, rate: 0.92 })

    // one warm bulb above the mirror, and its bounce off the tiles
    sceneLights.push(GLASS.center.x, GLASS.center.y + 0.75, GLASS.center.z + 0.45, 4.5, 1, 0.8, 0.55, 2.6 * bulb)
    sceneLights.push(GLASS.center.x, 0.9, GLASS.center.z + 1.6, 3.5, 0.9, 0.85, 0.78, 0.9 * bulb)
    setAnchor('p1.glass', GLASS.center.x + GLASS.w / 2 - 0.05, GLASS.center.y + GLASS.h / 2, GLASS.center.z)

    // the hand: a fixed world orientation (no per-frame camera coupling → no jitter),
    // fingertip pinned to the stroke head while writing, resting low before and after
    const writing = smoothstep(WRITE.from - 0.35, WRITE.from, u) * (1 - smoothstep(WRITE.to, WRITE.to + 0.45, u))
    const show = smoothstep(1.0, 1.5, u) * (1 - smoothstep(4.3, 4.8, u))
    hand.root.visible = show > 0.001
    if (show > 0.001) {
      mixPose(POSES.relaxed, POSES.point, smoothstep(1.1, 1.5, u), pose)
      hand.pose(pose)
      hand.root.rotation.set(0.42, 0.18, -0.22)
      hand.root.updateMatrixWorld()
      toWorld(headAt(draw, tmp.p), tmp.w)
      tmp.w.z += 0.006
      // rest pose: lower right, pulled back from the glass
      const rx = GLASS.center.x + 0.32, ry = GLASS.center.y - 0.5, rz = GLASS.center.z + 0.35
      tmp.w.x += (rx - tmp.w.x) * (1 - writing)
      tmp.w.y += (ry - tmp.w.y) * (1 - writing)
      tmp.w.z += (rz - tmp.w.z) * (1 - writing)
      tmp.tip.copy(hand.tipLocal).applyQuaternion(hand.root.quaternion)
      hand.root.position.copy(tmp.w).sub(tmp.tip)
      hand.root.position.y -= (1 - show) * 0.3
    }
  })

  const g = GLASS
  const z = g.center.z
  return (
    <SceneRoot range={r} after={0.6}>
      {/* the bathroom: back wall (mirror wall), side walls, floor */}
      <mesh material={tiles} position={[g.center.x, 1.3, z - 0.03]}>
        <planeGeometry args={[2.4, 2.8]} />
      </mesh>
      <mesh material={tiles} position={[g.center.x - 1.2, 1.3, z + 1.6]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[3.2, 2.8]} />
      </mesh>
      <mesh material={tiles} position={[g.center.x + 1.2, 1.3, z + 1.6]} rotation-y={-Math.PI / 2}>
        <planeGeometry args={[3.2, 2.8]} />
      </mesh>
      <mesh material={tiles} position={[g.center.x, 2.7, z + 1.6]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[2.4, 3.2]} />
      </mesh>
      <mesh material={porcelain} position={[g.center.x, -0.05, z + 1.6]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[2.4, 3.2]} />
      </mesh>
      {/* the mirror and its frame */}
      <mesh material={mirrorMat} position={g.center} renderOrder={2}>
        <planeGeometry args={[g.w, g.h]} />
      </mesh>
      {[
        [0, g.h / 2 + 0.02, g.w + 0.08, 0.04],
        [0, -g.h / 2 - 0.02, g.w + 0.08, 0.04],
        [-g.w / 2 - 0.02, 0, 0.04, g.h],
        [g.w / 2 + 0.02, 0, 0.04, g.h],
      ].map(([x, y, w, h], i) => (
        <mesh key={i} material={frameMat} position={[g.center.x + x, g.center.y + y, z + 0.01]}>
          <boxGeometry args={[w, h, 0.03]} />
        </mesh>
      ))}
      {/* the sink and tap below the mirror; a bare bulb above */}
      <mesh material={porcelain} position={[g.center.x, g.center.y - g.h / 2 - 0.32, z + 0.26]}>
        <boxGeometry args={[0.62, 0.14, 0.46]} />
      </mesh>
      <mesh material={steel} position={[g.center.x, g.center.y - g.h / 2 - 0.18, z + 0.1]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.012, 0.012, 0.16, 10]} />
      </mesh>
      <mesh position={[g.center.x, g.center.y + 0.72, z + 0.4]}>
        <sphereGeometry args={[0.045, 16, 12]} />
        <meshBasicMaterial color="#ffd9a0" toneMapped={false} side={DoubleSide} />
      </mesh>
      <primitive object={steam} />
      <primitive object={hand.root} />
    </SceneRoot>
  )
}

// The camera arrives from the house corridor and then is LOCKED in front of the mirror.
export const nameSpec: SceneSpec = {
  id: 'p1.name',
  Component: Name,
  camera: [
    { u: 0, pos: [0, 1.2, -290.5], at: [0, 1.32, -304] },
    { u: 0.7, pos: [0.01, 1.4, -297.2], at: [0, 1.4, -304] },
    { u: 1.5, pos: [0.02, 1.47, -302.6], at: [0, 1.42, -304], tension: 1 },
    { u: 4.2, pos: [0.02, 1.47, -302.66], at: [0, 1.42, -304], tension: 1 },
    { u: 6.0, pos: [0.02, 1.46, -302.82], at: [0, 1.42, -304], tension: 1 },
  ],
  look: [
    { u: 0, exposure: -0.3, saturation: 0.7, paint: 0.3, ink: 0.25, inkFar: 8, vignette: 0.7, bloom: 0.9, tint: [1.02, 0.98, 0.93] },
    { u: 1.3, exposure: -0.05, saturation: 0.82 },
    { u: 5.6, exposure: -0.05 },
  ],
  fog: { color: '#050505', near: 3, far: 16 },
}
