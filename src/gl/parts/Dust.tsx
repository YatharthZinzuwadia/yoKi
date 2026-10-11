// Dust that only exists where light exists: points lit by the scene-light pool.

import { useMemo } from 'react'
import { AdditiveBlending, BufferAttribute, BufferGeometry, Points, ShaderMaterial } from 'three'
import { MAX_SCENE_LIGHTS } from '../../engine/fx'
import { rng } from '../../engine/math'
import { sharedUniforms } from '../materials/painted'

export function makeDust({
  count = 1500,
  center = [0, 2, 0] as readonly [number, number, number],
  size = [6, 4, 30] as readonly [number, number, number],
  seed = 7,
  brightness = 1,
  pointSize = 1,
} = {}) {
  const r = rng(seed)
  const pos = new Float32Array(count * 3)
  const rnd = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    pos[i * 3] = center[0] + (r() - 0.5) * size[0]
    pos[i * 3 + 1] = center[1] + (r() - 0.5) * size[1]
    pos[i * 3 + 2] = center[2] + (r() - 0.5) * size[2]
    rnd[i] = r()
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(pos, 3))
  g.setAttribute('aRnd', new BufferAttribute(rnd, 1))
  const m = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: {
      uYLPos: sharedUniforms.uYLPos,
      uYLCol: sharedUniforms.uYLCol,
      uTime: sharedUniforms.uTime,
      uBright: { value: brightness },
      uSize: { value: pointSize },
    },
    vertexShader: /* glsl */ `
      #define MAX_YL ${MAX_SCENE_LIGHTS}
      uniform vec4 uYLPos[MAX_YL];
      uniform vec4 uYLCol[MAX_YL];
      uniform float uTime, uBright, uSize;
      attribute float aRnd;
      varying vec3 vCol;
      void main() {
        vec3 p = position;
        float t = uTime * (0.05 + aRnd * 0.08);
        p += vec3(sin(t + aRnd * 40.0), sin(t * 1.3 + aRnd * 17.0) * 0.6, cos(t * 0.7 + aRnd * 9.0)) * 0.35;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vec3 c = vec3(0.0);
        for (int i = 0; i < MAX_YL; i++) {
          vec4 lc = uYLCol[i];
          if (lc.w <= 0.0) continue;
          float d = distance(uYLPos[i].xyz, mv.xyz);
          float k = 1.0 - clamp(d / (uYLPos[i].w * 0.7), 0.0, 1.0);
          c += lc.rgb * lc.w * k * k * 0.035;
        }
        vCol = c * uBright * (0.5 + aRnd);
        gl_PointSize = min(uSize * (0.8 + aRnd * 1.6) * (14.0 / -mv.z), 6.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vCol;
      void main() {
        vec2 q = gl_PointCoord - 0.5;
        float a = smoothstep(0.5, 0.0, length(q));
        gl_FragColor = vec4(vCol * a, 1.0);
      }`,
  })
  const pts = new Points(g, m)
  pts.frustumCulled = false
  return pts
}

export function Dust(props: Parameters<typeof makeDust>[0]) {
  const pts = useMemo(() => makeDust(props), []) // eslint-disable-line
  return <primitive object={pts} />
}
