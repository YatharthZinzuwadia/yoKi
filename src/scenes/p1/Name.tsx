// 01.5 — The name. A pane of black glass in the dark. A teenager's hand (the
// kada on the wrist) writes `yoKi` in light, stroke by stroke, following the
// scroll. The glass reflects him. Then the kada sigil, and the paper world.

import { useMemo } from 'react'
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, CatmullRomCurve3, ShaderMaterial, TubeGeometry, Vector3 } from 'three'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { audio } from '../../audio/engine'
import type { SceneRange } from '../../content/film'
import { setAnchor, view } from '../../engine/anchors'
import { sceneLights } from '../../engine/fx'
import { clamp, range, smoothstep } from '../../engine/math'
import { makeTriggers } from '../../engine/triggers'
import { makeHand, mixPose, POSES, type HandPose } from '../../gl/parts/hand'
import { sigilTexture } from '../../gl/parts/sigilTexture'
import { painted } from '../../gl/materials/painted'
import { WORDMARK } from '../../ui/sigil/paths'
import { SceneRoot, useSceneFrame } from '../SceneRoot'
import type { SceneSpec } from '../types'
import { GLASS } from './world'

const WRITE = { from: 1.35, to: 3.75 }

/** Wordmark strokes → world-space polylines on the glass, with cumulative arc length. */
function buildStrokes() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 250 150">${WORDMARK.map((d) => `<path d="${d}"/>`).join('')}</svg>`
  const data = new SVGLoader().parse(svg)
  const sx = 0.88 / 250, sy = 0.528 / 150
  const strokes: Vector3[][] = []
  for (const p of data.paths)
    for (const sp of p.subPaths) {
      const pts = sp.getSpacedPoints(80).map((q) => new Vector3(GLASS.center.x + (q.x - 125) * sx, GLASS.center.y + (75 - q.y) * sy, GLASS.center.z + 0.012))
      strokes.push(pts)
    }
  const lengths = strokes.map((s) => s.reduce((a, q, i) => (i ? a + q.distanceTo(s[i - 1]) : 0), 0))
  const total = lengths.reduce((a, b) => a + b, 0)
  return { strokes, lengths, total }
}

const strokeVert = /* glsl */ `
attribute float aS;
varying float vS;
void main() { vS = aS; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`
const strokeFrag = /* glsl */ `
uniform float uDraw, uFade;
uniform vec3 uColor;
varying float vS;
void main() {
  if (vS > uDraw) discard;
  float head = smoothstep(uDraw - 0.025, uDraw, vS);
  gl_FragColor = vec4(uColor * (2.2 + head * 6.0) * uFade, 1.0);
}`

const glassFrag = /* glsl */ `
uniform sampler2D uGhost;
uniform float uGhostA, uFade;
varying vec2 vUv;
void main() {
  vec4 g = texture2D(uGhost, vec2((vUv.x - 0.5) * 2.4 + 0.5, (vUv.y - 0.5) * 1.6 + 0.47));
  float edge = smoothstep(0.0, 0.01, vUv.x) * smoothstep(1.0, 0.99, vUv.x) * smoothstep(0.0, 0.015, vUv.y) * smoothstep(1.0, 0.985, vUv.y);
  float sheen = 0.0;
  vec3 col = vec3(0.012) + vec3(0.62, 0.66, 0.72) * g.a * uGhostA + sheen;
  gl_FragColor = vec4(col * uFade, edge * uFade);
}`

function Name({ range: r }: { range: SceneRange }) {
  const S = useMemo(buildStrokes, [])
  const strokeMesh = useMemo(() => {
    let acc = 0
    const geos: BufferGeometry[] = []
    S.strokes.forEach((pts, i) => {
      const tube = new TubeGeometry(new CatmullRomCurve3(pts), 160, 0.0036, 6, false)
      const n = tube.attributes.position.count
      const aS = new Float32Array(n)
      const uv = tube.attributes.uv
      for (let k = 0; k < n; k++) aS[k] = (acc + uv.getX(k) * S.lengths[i]) / S.total
      tube.setAttribute('aS', new BufferAttribute(aS, 1))
      tube.deleteAttribute('uv')
      tube.deleteAttribute('normal')
      geos.push(tube)
      acc += S.lengths[i]
    })
    const material = new ShaderMaterial({
      vertexShader: strokeVert,
      fragmentShader: strokeFrag,
      uniforms: { uDraw: { value: 0 }, uFade: { value: 1 }, uColor: { value: new Color('#ffd9a0') } },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      toneMapped: false,
    })
    return { geometry: mergeGeometries(geos), material }
  }, [S])
  const glassMat = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uGhost: { value: sigilTexture(['contour'], { size: 512, stroke: 18, blur: 6 }) },
          uGhostA: { value: 0 },
          uFade: { value: 1 },
        },
        vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: glassFrag,
        transparent: true,
        depthWrite: false,
      }),
    [],
  )
  const standMat = useMemo(() => painted({ color: '#0a0a0b', roughness: 0.25, bands: 0.06, rim: [0.8, 0.8, 0.9, 0.2] }), [])
  const hand = useMemo(() => makeHand({ skin: '#8e5d3f', kada: true, sleeve: '#16161a', scale: 0.9 }), [])
  const pose = useMemo<HandPose>(() => ({ curl: [0, 0, 0, 0], thumb: 0, spread: 0 }), [])
  const trig = useMemo(() => makeTriggers(), [])
  const tmp = useMemo(() => ({ p: new Vector3(), q: new Vector3() }), [])

  /** Point along all strokes at fraction s (0..1). */
  const at = (s: number, out: Vector3) => {
    let d = clamp(s) * S.total
    for (let i = 0; i < S.strokes.length; i++) {
      if (d <= S.lengths[i] || i === S.strokes.length - 1) {
        const pts = S.strokes[i]
        let acc = 0
        for (let k = 1; k < pts.length; k++) {
          const seg = pts[k].distanceTo(pts[k - 1])
          if (acc + seg >= d) return out.copy(pts[k - 1]).lerp(pts[k], (d - acc) / seg)
          acc += seg
        }
        return out.copy(pts[pts.length - 1])
      }
      d -= S.lengths[i]
    }
    return out
  }

  useSceneFrame(r, (u) => {
    const p = trig.step(u)
    const w = range(u, WRITE.from, WRITE.to)
    const draw = w * w * (3 - 2 * w)
    strokeMesh.material.uniforms.uDraw.value = draw
    const fade = 1 - smoothstep(4.9, 5.9, u)
    strokeMesh.material.uniforms.uFade.value = fade
    glassMat.uniforms.uFade.value = fade
    glassMat.uniforms.uGhostA.value = smoothstep(2.6, 3.4, u) * 0.2
    if (trig.crossed(p, u, WRITE.from + 0.05)) audio.cue('squeak', { gain: 0.35 })
    if (trig.crossed(p, u, WRITE.from + 1.2)) audio.cue('squeak', { gain: 0.3, rate: 1.1 })

    // the glow of the name lights the hand and the dark
    const head = at(draw, tmp.p)
    sceneLights.push(head.x, head.y, head.z + 0.12, 1.2, 1, 0.8, 0.55, 2.4 * (draw > 0 && draw < 1 ? 1 : 0.4) * fade)
    sceneLights.push(GLASS.center.x, GLASS.center.y + 0.2, GLASS.center.z + 0.8, 4, 1, 0.82, 0.6, 1.4 * smoothstep(1.2, 2.4, u) * fade)
    setAnchor('p1.glass', GLASS.center.x + GLASS.w / 2 - 0.1, GLASS.center.y + GLASS.h / 2 - 0.1, GLASS.center.z)

    // the hand: rises, writes with the index fingertip on the stroke head, lowers
    const cam = view.camera
    const show = smoothstep(0.9, 1.4, u) * (1 - smoothstep(4.0, 4.6, u))
    hand.root.visible = show > 0.001
    if (cam && show > 0.001) {
      mixPose(POSES.relaxed, POSES.point, smoothstep(1.0, 1.4, u), pose)
      hand.pose(pose)
      hand.root.quaternion.copy(cam.quaternion)
      hand.root.rotateX(0.18)
      hand.root.rotateY(0.32)
      hand.root.rotateZ(-0.25)
      // fingertip target: on the stroke head while writing, resting below otherwise
      const target = tmp.q.copy(head)
      target.z += 0.02
      const rest = tmp.p.set(0.14, -0.3, -0.45).applyQuaternion(cam.quaternion).add(cam.position)
      const writing = smoothstep(1.15, 1.45, u) * (1 - smoothstep(3.75, 4.1, u))
      target.lerp(rest, 1 - writing)
      const tipW = hand.tipLocal.clone().applyQuaternion(hand.root.quaternion)
      hand.root.position.copy(target).sub(tipW)
      // drop away
      hand.root.position.addScaledVector(cam.up, -(1 - show) * 0.25)
    }
  })

  const g = GLASS
  return (
    <SceneRoot range={r} after={0.6}>
      <mesh material={glassMat} position={g.center} renderOrder={2}>
        <planeGeometry args={[g.w, g.h]} />
      </mesh>
      <mesh material={standMat} position={[g.center.x, g.center.y - g.h / 2 - 0.04, g.center.z - 0.02]}>
        <boxGeometry args={[g.w + 0.05, 0.05, 0.08]} />
      </mesh>
      <mesh geometry={strokeMesh.geometry} material={strokeMesh.material} frustumCulled={false} renderOrder={4} />
      <primitive object={hand.root} />
    </SceneRoot>
  )
}

export const nameSpec: SceneSpec = {
  id: 'p1.name',
  Component: Name,
  camera: [
    { u: 0, pos: [0, 1.2, -290.5], at: [0, 1.32, -304] },
    { u: 1.2, pos: [0.04, 1.48, -302.85], at: [0, 1.42, -304] },
    { u: 3.9, pos: [0.06, 1.49, -303.05], at: [0.02, 1.42, -304], tension: 1 },
    { u: 6.0, pos: [0, 1.46, -303.55], at: [0, 1.44, -306] },
  ],
  look: [
    { u: 0, exposure: -0.2, saturation: 0.7, paint: 0.35, ink: 0.3, inkFar: 12, vignette: 0.75, bloom: 1.3 },
    { u: 1.2, exposure: 0.25 },
    { u: 5.6, exposure: 0.25 },
  ],
  fog: { color: '#030304', near: 2, far: 14 },
}

