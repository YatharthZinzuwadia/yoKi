// 01.4 — The house of frosted glass. Child eye-level. Behind backlit frosted
// panes, two adults fight; a plate shatters against the glass; a woman slides
// down a wall. Pencil height marks with demands. A tiny hand takes our finger.

import { use, useMemo } from 'react'
import { CanvasTexture, SRGBColorSpace, ShaderMaterial, Vector4, type Texture } from 'three'
import { audio } from '../../audio/engine'
import type { SceneRange } from '../../content/film'
import { setAnchor, view } from '../../engine/anchors'
import { film } from '../../engine/director'
import { fx, sceneLights } from '../../engine/fx'
import { clamp, smoothstep } from '../../engine/math'
import { makeTriggers } from '../../engine/triggers'
import { makeHand, mixPose, POSES, type HandPose } from '../../gl/parts/hand'
import { painted } from '../../gl/materials/painted'
import { SceneRoot, useSceneFrame } from '../SceneRoot'
import type { SceneSpec } from '../types'
import { HOUSE } from './world'

// ── frosted pane with silhouettes (SDF) ─────────────────────────────────────
const paneFrag = /* glsl */ `
uniform float uTime, uGlow, uAspect;
uniform vec4 uFig[3];   // x, y(feet), height, blur
uniform vec4 uPose[3];  // armL, armR, lean, alpha
uniform vec4 uPlate;    // x, y, radius, blur
uniform vec4 uShard;    // originX, originY, t (since impact), alpha
uniform vec3 uLamp;     // lamp uv x, y, warmth
varying vec2 vUv;
float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
float cap(vec2 p, vec2 a, vec2 b, float r){ vec2 pa=p-a, ba=b-a; float k=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*k)-r; }
vec2 dir(float a){ return vec2(cos(a), sin(a)); }
float figure(vec2 p, vec4 f, vec4 q) {
  p = (p - f.xy) / f.z;          // feet at origin, height 1
  p.x -= q.z * p.y;              // lean
  float d = length(p - vec2(0.0, 0.885)) - 0.088;
  d = min(d, cap(p, vec2(0.0, 0.46), vec2(0.0, 0.73), 0.135));
  d = min(d, cap(p, vec2(0.0, 0.76), vec2(0.0, 0.83), 0.035));
  vec2 sl = vec2(-0.12, 0.72), sr = vec2(0.12, 0.72);
  vec2 el = sl + 0.2 * dir(q.x), er = sr + 0.2 * dir(q.y);
  vec2 hl = el + 0.19 * dir(q.x + 0.5), hr = er + 0.19 * dir(q.y - 0.5);
  d = min(d, min(cap(p, sl, el, 0.055), cap(p, el, hl, 0.048)));
  d = min(d, min(cap(p, sr, er, 0.055), cap(p, er, hr, 0.048)));
  d = min(d, min(cap(p, vec2(-0.06, 0.46), vec2(-0.08, 0.0), 0.07), cap(p, vec2(0.06, 0.46), vec2(0.08, 0.0), 0.07)));
  d = min(d, cap(p, vec2(-0.13, 0.69), vec2(0.13, 0.69), 0.07));
  return d * f.z;
}
void main() {
  vec2 p = vec2(vUv.x * uAspect, vUv.y);
  // backlight: a warm lamp behind the glass
  vec2 lp = vec2(uLamp.x * uAspect, uLamp.y);
  float lamp = exp(-length(p - lp) * 1.6) * 1.2 + 0.25;
  vec3 light = mix(vec3(1.0, 0.86, 0.66), vec3(1.0, 0.68, 0.38), uLamp.z) * lamp * uGlow;
  float shadow = 0.0;
  for (int i = 0; i < 3; i++) {
    if (uPose[i].w <= 0.0) continue;
    float d = figure(p, uFig[i], uPose[i]);
    shadow = max(shadow, smoothstep(uFig[i].w, -uFig[i].w, d) * uPose[i].w);
  }
  if (uPlate.z > 0.0) {
    float d = length((p - uPlate.xy) * vec2(1.0, 1.6)) - uPlate.z;
    shadow = max(shadow, smoothstep(uPlate.w, -uPlate.w, d) * 0.95);
  }
  if (uShard.w > 0.0) {
    for (int k = 0; k < 16; k++) {
      float fk = float(k);
      vec2 v0 = vec2(h(vec2(fk, 1.0)) - 0.5, h(vec2(fk, 2.0)) * 0.6) * 0.9;
      vec2 sp = uShard.xy + v0 * uShard.z + vec2(0.0, -2.2 * uShard.z * uShard.z);
      vec2 q = p - sp;
      float a = h(vec2(fk, 3.0)) * 6.28 + uShard.z * 4.0;
      q = mat2(cos(a), -sin(a), sin(a), cos(a)) * q;
      float s = 0.012 + h(vec2(fk, 4.0)) * 0.02;
      float tri = max(abs(q.x) * 0.866 + q.y * 0.5, -q.y) - s;
      shadow = max(shadow, smoothstep(0.004, -0.004, tri) * uShard.w);
    }
  }
  // frost: mottled diffusion and condensation
  float frost = 0.82 + 0.18 * n(p * 38.0) + 0.06 * n(p * 140.0);
  vec3 col = light * (1.0 - shadow * 0.93) * frost;
  // frame grime at the edges
  float edge = smoothstep(0.0, 0.03, vUv.x) * smoothstep(1.0, 0.97, vUv.x) * smoothstep(0.0, 0.04, vUv.y) * smoothstep(1.0, 0.96, vUv.y);
  gl_FragColor = vec4(col * edge, 1.0);
}`

const vert = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`

function makePane(aspect: number) {
  return new ShaderMaterial({
    vertexShader: vert,
    fragmentShader: paneFrag,
    toneMapped: false,
    uniforms: {
      uTime: { value: 0 },
      uGlow: { value: 0 },
      uAspect: { value: aspect },
      uFig: { value: [new Vector4(), new Vector4(), new Vector4()] },
      uPose: { value: [new Vector4(), new Vector4(), new Vector4()] },
      uPlate: { value: new Vector4() },
      uShard: { value: new Vector4() },
      uLamp: { value: [0.5, 0.75, 0.4] },
    },
  })
}

// ── the height-marks wall (pencil on plaster) ───────────────────────────────
const heightsPromise: Promise<Texture> =
  typeof document === 'undefined'
    ? new Promise(() => {})
    : document.fonts.load('italic 60px "Fraunces Variable"').then(() => {
        const w = 1024, h = 1536
        const c = document.createElement('canvas')
        c.width = w
        c.height = h
        const ctx = c.getContext('2d')!
        ctx.fillStyle = '#cbbfa8'
        ctx.fillRect(0, 0, w, h)
        for (let i = 0; i < 9000; i++) {
          ctx.fillStyle = `rgba(${90 + Math.random() * 60},${80 + Math.random() * 50},${60 + Math.random() * 40},${Math.random() * 0.08})`
          ctx.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 8, 2 + Math.random() * 8)
        }
        // marks: [height px from floor, label, demand]
        const marks: [number, string, string][] = [
          [520, '4\'1"', 'top 3'],
          [640, '4\'6"', 'engineer.'],
          [760, '5\'0"', 'be the elder'],
          [880, '5\'4"', 'don\'t cry'],
          [1010, '5\'8"', 'make us proud'],
          [1150, '6\'', '—'],
        ]
        // the creator's own marks: engineer; no 'doctor?' (2026-10-12)
        ctx.strokeStyle = 'rgba(40,36,34,0.85)'
        ctx.fillStyle = 'rgba(40,36,34,0.88)'
        ctx.lineCap = 'round'
        marks.forEach(([y, hgt, dem], i) => {
          const yy = h - y
          ctx.lineWidth = 3 + (i % 2)
          ctx.beginPath()
          ctx.moveTo(300 + Math.random() * 10, yy + Math.random() * 3)
          ctx.lineTo(620 + Math.random() * 20, yy - 2 + Math.random() * 4)
          ctx.stroke()
          ctx.font = 'italic 44px "Fraunces Variable"'
          ctx.fillText(hgt, 640, yy + 14)
          ctx.font = 'italic 56px "Fraunces Variable"'
          ctx.fillText(dem, 300, yy - 18)
        })
        // a second, lower column in blue pencil: the brother (8 years younger) and the
        // expectations handed down to him: commerce, then CA
        const bro: [number, string, string][] = [
          [380, '3\'4"', 'his turn'],
          [470, '3\'8"', 'commerce'],
          [560, '4\'0"', 'CA'],
        ]
        ctx.strokeStyle = 'rgba(38,58,96,0.85)'
        ctx.fillStyle = 'rgba(38,58,96,0.9)'
        bro.forEach(([y, hgt, dem]) => {
          const yy = h - y
          ctx.lineWidth = 3
          ctx.beginPath()
          ctx.moveTo(70, yy)
          ctx.lineTo(250, yy + 2)
          ctx.stroke()
          ctx.font = 'italic 36px "Fraunces Variable"'
          ctx.fillText(hgt, 160, yy + 34)
          ctx.font = 'italic 46px "Fraunces Variable"'
          ctx.fillText(dem, 70, yy - 14)
        })
        const t = new CanvasTexture(c)
        t.colorSpace = SRGBColorSpace
        t.anisotropy = 8
        return t
      })

// ── the scene ───────────────────────────────────────────────────────────────
const PANES = [
  // side, z centre, width — left panes show the fight; right panes the plate and the mother
  { side: -1, z: -145.4, w: 4.4, kind: 'fight' },
  { side: -1, z: -150.4, w: 4.4, kind: 'empty' },
  { side: 1, z: -147.9, w: 4.4, kind: 'plate' },
  { side: 1, z: -152.9, w: 4.4, kind: 'mother' },
] as const
const PANE_H = 2.4

function House({ range: r }: { range: SceneRange }) {
  const heights = use(heightsPromise)
  const panes = useMemo(() => PANES.map((p) => ({ ...p, mat: makePane(p.w / PANE_H) })), [])
  const floor = useMemo(() => painted({ color: '#2a211c', roughness: 0.5, bands: 0.1 }), [])
  const wall = useMemo(() => painted({ color: '#4a4038', roughness: 0.9, bands: 0.14 }), [])
  const wood = useMemo(() => painted({ color: '#24180f', roughness: 0.6, bands: 0.1 }), [])
  const heightsMat = useMemo(() => painted({ map: heights, roughness: 0.9, bands: 0.1 }), [heights])
  const trig = useMemo(() => makeTriggers(), [])
  const child = useMemo(() => makeHand({ skin: '#9b6a48', kada: false, sleeve: '#3c4a5c', scale: 0.62 }), [])
  const brother = useMemo(() => makeHand({ skin: '#a87452', kada: false, sleeve: '#c9a227', scale: 0.34 }), [])
  const pose = useMemo<HandPose>(() => ({ curl: [0, 0, 0, 0], thumb: 0, spread: 0 }), [])
  const bpose = useMemo<HandPose>(() => ({ curl: [0, 0, 0, 0], thumb: 0, spread: 0 }), [])

  const z0 = HOUSE.z0, z1 = HOUSE.z1, W = HOUSE.halfW
  const len = z0 - z1

  useSceneFrame(r, (u) => {
    const p = trig.step(u)
    const k = film.clock
    const glow = smoothstep(0.4, 1.4, u) * (1 - smoothstep(5.2, 5.9, u))
    // the fight: father jabbing, mother defending — then both freeze when the plate flies
    panes.forEach((pn) => {
      const U = pn.mat.uniforms
      U.uTime.value = k
      U.uGlow.value = glow * (pn.kind === 'empty' ? 0.7 : 1)
      const F = U.uFig.value as Vector4[], P = U.uPose.value as Vector4[]
      F.forEach((f) => f.set(0, 0, 0, 0))
      P.forEach((q) => q.set(0, 0, 0, 0))
      U.uPlate.value.set(0, 0, 0, 0)
      U.uShard.value.set(0, 0, 0, 0)
      const asp = pn.w / PANE_H
      if (pn.kind === 'fight') {
        const jab = Math.sin(k * 5.2) * 0.5 + 0.5
        const rage = smoothstep(1.2, 2.2, u)
        F[0].set(asp * 0.33, 0.02, 0.95, 0.075)
        P[0].set(-1.9, -0.2 + jab * 0.9 * rage, 0.08 * rage, 1)
        F[1].set(asp * 0.62, 0.02, 0.86, 0.1)
        P[1].set(-2.4 + Math.sin(k * 3.1) * 0.4 * rage, 2.2 - rage * 0.5, -0.06 * rage, 1)
      } else if (pn.kind === 'empty') {
        F[0].set(asp * 0.5, 0.02, 0.5, 0.25)
        P[0].set(-1.6, -1.5, 0, 0.45)
      } else if (pn.kind === 'plate') {
        // the plate flies from deep in the room to the glass, then shatters (u 2.6 → 3.0)
        const fly = smoothstep(2.55, 2.98, u)
        if (fly > 0 && fly < 1) U.uPlate.value.set(asp * (0.75 - fly * 0.25), 0.55 + Math.sin(fly * 3.14) * 0.15, 0.03 + fly * 0.09, 0.08 * (1 - fly) + 0.006)
        const ts = clamp((u - 2.98) / 1.2)
        if (u > 2.98) U.uShard.value.set(asp * 0.5, 0.6, ts * 0.55, 1 - smoothstep(0.7, 1, ts))
        F[0].set(asp * 0.3, 0.02, 0.9, 0.12)
        P[0].set(-0.4 + fly * 0.4, 0.2, 0.1, 0.9)
      } else {
        // the mother slides down the wall and cries; the child's small shadow goes to her
        const slide = smoothstep(3.3, 4.3, u)
        F[0].set(asp * 0.55, 0.02 - slide * 0.38, 0.9, 0.08)
        P[0].set(-2.0 + slide * 0.9, 1.9 - slide * 0.5, 0.15 * slide, 1)
        const go = smoothstep(4.0, 4.9, u)
        F[1].set(asp * (0.2 + go * 0.22), 0.02, 0.48, 0.06)
        P[1].set(-1.4, -0.4 + go * 1.2, 0.05, go)
      }
    })
    // the shouting, through glass
    ;[1.3, 1.75, 2.15, 2.45, 3.35, 3.8].forEach((at, i) => {
      if (trig.crossed(p, u, at)) audio.cue((['shout0', 'shout1', 'shout2'] as const)[i % 3], { gain: 0.55, pan: i % 2 ? -0.5 : 0.4, wet: 0.5 })
    })
    if (trig.crossed(p, u, 2.98)) {
      audio.cue('shatter', { gain: 0.8, pan: 0.5, wet: 0.5 })
      fx.shake += 0.004
    }
    if (u > 2.98 && u < 3.3) fx.shake += 0.006 * (1 - (u - 2.98) / 0.32)

    // lamps behind the glass spill onto the corridor floor
    panes.forEach((pn) => sceneLights.push(pn.side * (W + 0.6), 1.6, pn.z, 5, 1, 0.78, 0.5, 3.4 * glow))
    // a bare bulb over the height marks
    sceneLights.push(0.6, 2.3, -158.9, 5, 1, 0.84, 0.6, 3.5 * smoothstep(3.3, 4.0, u) * (1 - smoothstep(5.6, 6, u)))
    setAnchor('p1.heights', W - 0.05, 1.9, -158.8)

    // the hands: our child's hand rises; a tiny hand takes the finger
    const cam = view.camera
    const show = smoothstep(4.15, 4.7, u) * (1 - smoothstep(5.45, 5.95, u))
    child.root.visible = brother.root.visible = show > 0.001
    if (cam && show > 0.001) {
      mixPose(POSES.relaxed, POSES.point, smoothstep(4.2, 4.6, u), pose)
      child.pose(pose)
      const ox = 0.08, oy = -0.26 + show * 0.12, oz = -0.42
      child.root.position.set(ox, oy, oz).applyQuaternion(cam.quaternion).add(cam.position)
      child.root.quaternion.copy(cam.quaternion)
      child.root.rotateX(-0.75)
      child.root.rotateY(0.25)
      const grip = smoothstep(4.55, 4.95, u)
      mixPose(POSES.open, POSES.grip, grip, bpose)
      brother.pose(bpose)
      // the small hand wraps the index finger from below
      brother.root.position.copy(child.tipLocal).applyQuaternion(child.root.quaternion).add(child.root.position)
      brother.root.quaternion.copy(child.root.quaternion)
      brother.root.rotateZ(Math.PI * 0.55)
      brother.root.rotateX(0.6)
      brother.root.translateZ(0.075 - grip * 0.02)
      brother.root.translateY(-0.03)
      setAnchor('p1.brother', brother.root.position.x, brother.root.position.y, brother.root.position.z)
      // the warmest light in the house, close to the hands
      const hp = child.root.position
      sceneLights.push(hp.x + 0.3, hp.y + 0.4, hp.z + 0.2, 2.2, 1, 0.82, 0.62, 2.6 * show)
    }
  })

  return (
    <SceneRoot range={r}>
      <mesh material={floor} rotation-x={-Math.PI / 2} position={[0, 0, z0 - len / 2]} receiveShadow>
        <planeGeometry args={[W * 2, len + 2]} />
      </mesh>
      <mesh material={wall} rotation-x={Math.PI / 2} position={[0, 2.6, z0 - len / 2]}>
        <planeGeometry args={[W * 2, len + 2]} />
      </mesh>
      {panes.map((pn, i) => (
        <group key={i}>
          <mesh material={pn.mat} position={[pn.side * W, 1.32, pn.z]} rotation-y={-pn.side * Math.PI / 2}>
            <planeGeometry args={[pn.w, PANE_H]} />
          </mesh>
          {[-1, 1].map((e) => (
            <mesh key={e} material={wood} position={[pn.side * (W - 0.02), 1.3, pn.z + e * (pn.w / 2)]}>
              <boxGeometry args={[0.12, 2.6, 0.12]} />
            </mesh>
          ))}
        </group>
      ))}
      {/* plain walls between and after the panes */}
      <mesh material={wall} position={[-W, 1.3, -159.4]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[14, 2.6]} />
      </mesh>
      <mesh material={wall} position={[W, 1.3, -162.4]} rotation-y={-Math.PI / 2}>
        <planeGeometry args={[8, 2.6]} />
      </mesh>
      <mesh material={heightsMat} position={[W - 0.01, 1.3, -158.8]} rotation-y={-Math.PI / 2}>
        <planeGeometry args={[1.7, 2.55]} />
      </mesh>
      <primitive object={child.root} />
      <primitive object={brother.root} />
    </SceneRoot>
  )
}

export const houseSpec: SceneSpec = {
  id: 'p1.house',
  Component: House,
  camera: [
    { u: 0, pos: [0, 1.5, -132.9], at: [0, 1.9, -142.4] },
    { u: 1.0, pos: [0, 1.18, -141.2], at: [0, 1.1, -150.4] },
    { u: 1.9, pos: [0.1, 1.05, -144], at: [-1.6, 1.35, -145.9], tension: 0.3 },
    { u: 2.9, pos: [0, 1.05, -146.4], at: [1.6, 1.4, -148.2], tension: 0.3 },
    { u: 3.8, pos: [-0.1, 1.05, -150], at: [1.6, 1.15, -153.2] },
    { u: 4.55, pos: [-0.15, 1.05, -155], at: [0.45, 0.78, -156], tension: 0.6 },
    { u: 5.3, pos: [-0.2, 1.06, -156.8], at: [1.6, 1.7, -158.8], tension: 0.3 },
    { u: 6.0, pos: [0, 1.2, -160.9], at: [0, 1.32, -174.4] },
  ],
  look: [
    { u: 0, exposure: 0.15, saturation: 0.75, tint: [1.02, 0.97, 0.9], paint: 0.5, ink: 0.45, inkFar: 18, vignette: 0.7 },
    { u: 1.4, exposure: 0.35, saturation: 0.8 },
    { u: 5.4, exposure: 0.3 },
    { u: 6.0, exposure: -0.6, saturation: 0.6 },
  ],
  fog: { color: '#0b0908', near: 3, far: 16 },
}
