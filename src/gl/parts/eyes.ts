// The eyes in the walls (P1-10) — "somebody's watching me".
//
// HOW: every eye is a flat quad lying ON a surface (wall / end wall / ceiling), instanced.
// The fragment shader paints the whole thing — a skin socket that fades into the plaster
// (so the eye sits IN the wall instead of floating), the lids, the eyeball and one of five
// styles: 0 realistic (veins, fibrous iris, lashes, wet highlight), 1 anime (huge iris,
// gradient, two highlights, lash flick), 2 graphite sketch (hatched, like Phase 02's
// pencil), 3 a camera lens (aperture blades for a pupil), 4 a CCTV dome (with a red light).
// Pupils track the camera: the vertex shader measures the direction to the camera in the
// quad's own frame and passes it as the gaze; small saccades are added per eye.

import { Color, DoubleSide, InstancedBufferAttribute, InstancedMesh, Object3D, PlaneGeometry, ShaderMaterial, Vector3 } from 'three'
import { rng } from '../../engine/math'

export interface EyePlacement {
  pos: Vector3
  /** Rotation that turns the quad's +Z to face out of the surface. */
  rotY: number
  rotX: number
  size: number
  style: number
  /** When this eye opens (scene-local units). */
  opensAt: number
  seed: number
}

const vert = /* glsl */ `
attribute float aOpen;
attribute float aShow;
attribute vec4 aInfo; // style, seed, bloodshot, weep
attribute vec3 aIris;
uniform vec3 uCam;
uniform float uTime;
varying vec2 vP;
varying vec2 vGaze;
varying float vOpen;
varying float vShow;
varying vec4 vInfo;
varying vec3 vIris;
void main() {
  vP = position.xy * 2.0; // −1..1 across the quad
  vOpen = aOpen;
  vShow = aShow;
  vInfo = aInfo;
  vIris = aIris;
  mat4 m = modelMatrix * instanceMatrix;
  vec3 centre = (m * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  vec3 X = normalize(mat3(m) * vec3(1.0, 0.0, 0.0));
  vec3 Y = normalize(mat3(m) * vec3(0.0, 1.0, 0.0));
  vec3 toCam = normalize(uCam - centre);
  // saccades: small, sudden re-aims every ~0.7 s, different for every eye
  float k = floor(uTime * 1.4 + aInfo.y * 13.0);
  vec2 sac = vec2(fract(sin(k * 12.9898 + aInfo.y * 78.2) * 43758.5), fract(sin(k * 39.346 + aInfo.y * 11.1) * 24634.6)) - 0.5;
  vGaze = clamp(vec2(dot(toCam, X), dot(toCam, Y)) * 0.55 + sac * 0.12, -0.42, 0.42);
  gl_Position = projectionMatrix * viewMatrix * m * vec4(position, 1.0);
}`

const frag = /* glsl */ `
uniform float uLight, uTime, uAmb;
varying vec2 vP;
varying vec2 vGaze;
varying float vOpen;
varying float vShow;
varying vec4 vInfo;
varying vec3 vIris;
float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
void main() {
  int style = int(vInfo.x + 0.5);
  float seed = vInfo.y;
  vec2 p = vP;
  // ── the socket: skin that fades into the wall (soft alpha edge) ──
  float socket = length(p * vec2(0.82, 1.25));
  // the socket swells out of the wall as the eye first opens (vShow), and stays
  float skinA = smoothstep(1.0, 0.62, socket / max(vShow, 0.001)) * smoothstep(0.0, 0.25, vShow);
  if (skinA <= 0.002) discard;
  vec3 skin = mix(vec3(0.34, 0.24, 0.2), vec3(0.2, 0.13, 0.11), smoothstep(0.2, 0.9, socket));
  skin *= 0.82 + 0.18 * n(p * 9.0 + seed * 40.0);
  // lids: an almond opening that widens with vOpen; a crease above it
  float lidH = vOpen * (0.5 - 0.42 * p.x * p.x);
  float inEye = step(abs(p.y), lidH) * step(abs(p.x), 0.94);
  float crease = smoothstep(0.035, 0.0, abs(p.y - (lidH + 0.16) * (1.0 - 0.3 * p.x * p.x))) * step(0.02, vOpen) * 0.4;
  skin *= 1.0 - crease;
  // weeping: a streak running down from the lower lid (blood on some)
  float weep = vInfo.w * smoothstep(0.06, 0.0, abs(p.x - 0.25 - sin(p.y * 6.0) * 0.03)) * step(p.y, -lidH) * smoothstep(-1.0, -0.2, p.y);
  skin = mix(skin, vec3(0.38, 0.02, 0.02), clamp(weep, 0.0, 1.0));

  // ── the eye ──
  vec2 q = p - vGaze;         // iris space
  float r = length(q);
  vec3 col;
  float shade = 1.0 - 0.45 * smoothstep(0.3, 1.0, length(p * vec2(1.0, 1.6))); // the ball's roundness
  if (style == 0) {
    // realistic: veined sclera, fibrous iris, limbal ring, pupil, lashes
    float ang = atan(q.y, q.x + 1e-4);
    float veins = smoothstep(0.62, 0.95, n(vec2(ang * 5.0, r * 11.0) + seed * 9.0)) * smoothstep(0.25, 0.85, length(p));
    vec3 sclera = mix(vec3(0.9, 0.86, 0.8), vec3(0.72, 0.12, 0.1), veins * (0.35 + vInfo.z));
    float fib = 0.7 + 0.3 * n(vec2(ang * 16.0, r * 26.0) + seed * 3.0);
    vec3 iris = vIris * fib * (0.7 + 0.6 * smoothstep(0.32, 0.12, r));
    col = mix(sclera, iris, smoothstep(0.34, 0.31, r));
    col = mix(col, iris * 0.35, smoothstep(0.3, 0.34, r) * smoothstep(0.37, 0.33, r)); // limbal ring
    col = mix(col, vec3(0.01), smoothstep(0.13, 0.1, r));
    float hl = smoothstep(0.07, 0.0, length(q - vec2(-0.1, 0.11)));
    col += hl * 1.6;
    float lash = step(abs(abs(p.y) - lidH), 0.03) * step(0.0, p.y) * (0.6 + 0.4 * step(0.5, n(vec2(p.x * 60.0, seed))));
    col = mix(col, vec3(0.02), lash);
  } else if (style == 1) {
    // anime: big iris with a vertical gradient, cel ring, big pupil, two hard highlights
    vec3 top = vIris * 0.25, bot = vIris * 1.6 + vec3(0.05);
    vec3 iris = mix(top, bot, smoothstep(0.35, -0.35, q.y));
    col = mix(vec3(0.97), iris, step(r, 0.52));
    col = mix(col, iris * 0.15, step(0.47, r) * step(r, 0.52));
    col = mix(col, vec3(0.02), step(length(q * vec2(1.0, 0.8)), 0.2));
    col = mix(col, vec3(1.0), step(length(q - vec2(-0.16, 0.18)), 0.1));
    col = mix(col, vec3(1.0), step(length(q - vec2(0.15, -0.16)), 0.05));
    float upper = step(lidH - 0.07, p.y) * step(p.y, lidH + 0.01);
    float flick = step(0.8, p.x) * step(abs(p.y - lidH - (p.x - 0.8) * 0.9), 0.04);
    col = mix(col, vec3(0.03), max(upper, flick));
    shade = 1.0;
  } else if (style == 2) {
    // graphite sketch: paper sclera, hatched iris, pencil outline
    float hatch = step(0.5, fract((q.x + q.y) * 34.0)) * 0.55 + step(0.6, fract((q.x - q.y) * 28.0)) * 0.3;
    col = vec3(0.86, 0.84, 0.8);
    col = mix(col, vec3(0.86 - hatch * 0.6), step(r, 0.36));
    col = mix(col, vec3(0.12), smoothstep(0.03, 0.0, abs(r - 0.36)));
    col = mix(col, vec3(0.1), step(r, 0.12));
    col *= 0.85 + 0.15 * n(p * 40.0 + seed);
  } else if (style == 3) {
    // a camera lens: coated glass, rings, a hexagonal aperture as the pupil
    float ang = atan(q.y, q.x + 1e-4);
    float hex = cos(3.14159 / 6.0) / cos(mod(ang + uTime * 0.2, 1.0472) - 0.5236);
    float ap = r / (0.16 * hex);
    col = vec3(0.03, 0.035, 0.05);
    col += vec3(0.25, 0.1, 0.35) * smoothstep(0.02, 0.0, abs(r - 0.42)) + vec3(0.1, 0.3, 0.2) * smoothstep(0.015, 0.0, abs(r - 0.3));
    col = mix(col, vec3(0.08, 0.08, 0.09), step(0.44, r) * step(r, 0.62)); // the barrel
    col += vec3(0.5) * smoothstep(0.03, 0.0, abs(r - 0.53)) * 0.4;        // focus ring
    col = mix(col, vec3(0.0), step(ap, 1.0));
    col += smoothstep(0.1, 0.0, length(q - vec2(-0.15, 0.17))) * 1.4;
    shade = 1.0;
  } else {
    // CCTV dome: smoked glass hemisphere and a blinking red light
    col = vec3(0.04, 0.045, 0.05) + vec3(0.25) * smoothstep(0.5, 0.0, length(q - vec2(-0.14, 0.18)));
    col = mix(col, vec3(0.0), step(r, 0.14));
    float rec = step(length(p - vec2(0.5, 0.25)), 0.06) * step(0.5, fract(uTime * 0.8 + seed));
    col += vec3(2.2, 0.05, 0.05) * rec;
    shade = 1.0;
  }
  col *= shade;
  // light: the room is dark; flashes and the steady beam light the eyes
  float lit = uAmb + uLight;
  vec3 c = mix(skin * lit, col * (0.35 + lit), inEye);
  // a wet glint on the lid line, so open eyes catch the flash
  c += inEye * smoothstep(0.02, 0.0, abs(abs(p.y) - lidH)) * 0.25 * lit;
  gl_FragColor = vec4(c, skinA);
}`

const IRIS = ['#4a2c1a', '#2e1c12', '#5a3b22', '#3d4a3a', '#24324a', '#6b4a1f', '#1b1b1b']

export function makeEyes(placements: EyePlacement[]) {
  const n = placements.length
  const geo = new PlaneGeometry(1, 1)
  const mat = new ShaderMaterial({
    uniforms: { uCam: { value: new Vector3() }, uTime: { value: 0 }, uLight: { value: 0 }, uAmb: { value: 0.32 } },
    vertexShader: vert,
    fragmentShader: frag,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3,
  })
  const mesh = new InstancedMesh(geo, mat, n)
  mesh.frustumCulled = false
  const open = new Float32Array(n)
  const show = new Float32Array(n)
  const info = new Float32Array(n * 4)
  const iris = new Float32Array(n * 3)
  const R = rng(911)
  const o = new Object3D()
  const c = new Color()
  placements.forEach((e, i) => {
    o.position.copy(e.pos)
    o.rotation.set(e.rotX, e.rotY, 0, 'YXZ')
    o.scale.set(e.size * 1.6, e.size, 1)
    o.updateMatrix()
    mesh.setMatrixAt(i, o.matrix)
    info.set([e.style, e.seed, R() * R(), R() > 0.9 ? 1 : 0], i * 4)
    c.set(IRIS[Math.floor(R() * IRIS.length)])
    iris.set([c.r, c.g, c.b], i * 3)
  })
  geo.setAttribute('aOpen', new InstancedBufferAttribute(open, 1))
  geo.setAttribute('aShow', new InstancedBufferAttribute(show, 1))
  geo.setAttribute('aInfo', new InstancedBufferAttribute(info, 4))
  geo.setAttribute('aIris', new InstancedBufferAttribute(iris, 3))
  const blink = placements.map(() => ({ phase: R() * 9, rate: 0.12 + R() * 0.25 }))

  return {
    mesh,
    /** u = scene-local time, close = 0..1 all eyes closing, light = flash/beam light. */
    update(u: number, clock: number, cam: Vector3, light: number, close: number) {
      mat.uniforms.uCam.value.copy(cam)
      mat.uniforms.uTime.value = clock
      mat.uniforms.uLight.value = light
      placements.forEach((e, i) => {
        const k = Math.min(1, Math.max(0, (u - e.opensAt) / 0.55))
        const s = k * k * (3 - 2 * k)
        const b = blink[i]
        const bl = Math.max(0, Math.sin(clock * (b.rate * 6.283) + b.phase) - 0.982) * 55
        show[i] = s
        open[i] = Math.max(0, s * (1 - close) * (1 - Math.min(1, bl)))
      })
      ;(geo.getAttribute('aOpen') as InstancedBufferAttribute).needsUpdate = true
      ;(geo.getAttribute('aShow') as InstancedBufferAttribute).needsUpdate = true
    },
  }
}

