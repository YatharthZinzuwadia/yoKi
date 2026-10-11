// The line of light: an emissive tube along a curve that is "drawn" up to a
// reveal fraction, with a hot head and a gently pulsing body.

import { useMemo } from 'react'
import { AdditiveBlending, Color, ShaderMaterial, TubeGeometry, type Curve, type Vector3 } from 'three'

export interface FilamentHandle {
  material: ShaderMaterial
}

export function makeFilament(curve: Curve<Vector3>, { radius = 0.012, segments = 600, color = '#ffcf8a', intensity = 6 } = {}) {
  const geometry = new TubeGeometry(curve, segments, radius, 6, false)
  const material = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
    uniforms: {
      uReveal: { value: 0 },
      uStart: { value: 0 },
      uColor: { value: new Color(color) },
      uIntensity: { value: intensity },
      uTime: { value: 0 },
      uFade: { value: 1 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uReveal, uStart, uIntensity, uTime, uFade;
      uniform vec3 uColor;
      varying vec2 vUv;
      void main() {
        float s = vUv.x;
        if (s > uReveal || s < uStart) discard;
        float head = smoothstep(uReveal - 0.012, uReveal, s);
        float tail = smoothstep(uStart, uStart + 0.02, s);
        float pulse = 0.85 + 0.15 * sin(s * 420.0 - uTime * 2.2);
        float e = (0.55 + 2.8 * head) * pulse * tail;
        gl_FragColor = vec4(uColor * uIntensity * e * uFade, 1.0);
      }`,
  })
  return { geometry, material }
}

export function Filament({ curve, ...opts }: { curve: Curve<Vector3> } & Parameters<typeof makeFilament>[1]) {
  const f = useMemo(() => makeFilament(curve, opts), [curve]) // eslint-disable-line
  return <mesh geometry={f.geometry} material={f.material} frustumCulled={false} renderOrder={5} />
}
