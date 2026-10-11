// "Painted" material: three's MeshStandardMaterial + our fixed pool of scene
// lights (no light-count recompiles), optional soft toon banding and rim light,
// procedural surface detail, and TRIPLANAR texturing.
//
// Triplanar (how it works): instead of UV coordinates, the texture is projected three
// times along the world X, Y and Z axes and the three samples are blended by how much
// the surface faces each axis (|normal|^6). Procedural geometry (caves, rocks) has no
// good UVs, so this is how real CC0 photo-textures (ambientCG) can sit on it without
// seams or stretching. Normal maps use Ben Golus's "whiteout" triplanar blend.

import { Color, MeshStandardMaterial, RepeatWrapping, SRGBColorSpace, TextureLoader, Vector3, Vector4, type MeshStandardMaterialParameters, type Texture } from 'three'
import { MAX_SCENE_LIGHTS, sceneLights } from '../../engine/fx'

export const sharedUniforms = {
  uYLPos: { value: sceneLights.view },
  uYLCol: { value: sceneLights.col },
  uTime: { value: 0 },
}

const DECL = /* glsl */ `
#define MAX_YL ${MAX_SCENE_LIGHTS}
uniform vec4 uYLPos[MAX_YL];
uniform vec4 uYLCol[MAX_YL];
uniform float uBands;
uniform vec4 uRim;
uniform vec4 uDetail; // bump amount, scale, crevice darkening, colour variation
uniform sampler2D uTriMap;
uniform sampler2D uTriNor;
uniform sampler2D uTriRgh;
uniform vec4 uTri; // scale (repeats per metre), normal strength, roughness influence, on
uniform vec3 uTriTint;
varying vec3 vYWorld;
varying vec3 vYWorldN;
float yh3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float yn3(vec3 x) {
  vec3 i = floor(x), f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(yh3(i), yh3(i + vec3(1,0,0)), f.x), mix(yh3(i + vec3(0,1,0)), yh3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(yh3(i + vec3(0,0,1)), yh3(i + vec3(1,0,1)), f.x), mix(yh3(i + vec3(0,1,1)), yh3(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float yfbm(vec3 p) { return yn3(p) * 0.5 + yn3(p * 2.03) * 0.28 + yn3(p * 4.11) * 0.14 + yn3(p * 8.3) * 0.08; }
`

const VDECL = /* glsl */ `
varying vec3 vYWorld;
varying vec3 vYWorldN;
`

const VCHUNK = /* glsl */ `
{
  vec4 yW = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
    yW = instanceMatrix * yW;
  #endif
  vYWorld = (modelMatrix * yW).xyz;
  vec3 yN = objectNormal;
  #ifdef USE_INSTANCING
    yN = mat3(instanceMatrix) * yN;
  #endif
  vYWorldN = normalize(mat3(modelMatrix) * yN);
}
`

const BUMP = /* glsl */ `
if (uTri.w > 0.5) {
  vec3 wn = normalize(vYWorldN) * faceDirection;
  vec3 bw = pow(abs(wn), vec3(6.0));
  bw /= (bw.x + bw.y + bw.z + 1e-5);
  vec3 tp = vYWorld * uTri.x;
  vec2 uvX = tp.zy, uvY = tp.xz, uvZ = tp.xy;
  vec3 alb = texture2D(uTriMap, uvX).rgb * bw.x + texture2D(uTriMap, uvY).rgb * bw.y + texture2D(uTriMap, uvZ).rgb * bw.z;
  diffuseColor.rgb *= alb * uTriTint;
  vec3 tnX = texture2D(uTriNor, uvX).xyz * 2.0 - 1.0;
  vec3 tnY = texture2D(uTriNor, uvY).xyz * 2.0 - 1.0;
  vec3 tnZ = texture2D(uTriNor, uvZ).xyz * 2.0 - 1.0;
  tnX.xy *= uTri.y; tnY.xy *= uTri.y; tnZ.xy *= uTri.y;
  tnX = vec3(tnX.xy + wn.zy, abs(tnX.z) * wn.x);
  tnY = vec3(tnY.xy + wn.xz, abs(tnY.z) * wn.y);
  tnZ = vec3(tnZ.xy + wn.xy, abs(tnZ.z) * wn.z);
  vec3 triN = normalize(tnX.zyx * bw.x + tnY.xzy * bw.y + tnZ.xyz * bw.z);
  normal = normalize((viewMatrix * vec4(triN, 0.0)).xyz);
  float rg = texture2D(uTriRgh, uvX).r * bw.x + texture2D(uTriRgh, uvY).r * bw.y + texture2D(uTriRgh, uvZ).r * bw.z;
  roughnessFactor = clamp(mix(roughnessFactor, rg, uTri.z), 0.04, 1.0);
}
if (uDetail.x > 0.0) {
  vec3 wp = vYWorld * uDetail.y;
  float e = 0.06;
  float n0 = yfbm(wp);
  vec3 g = vec3(yfbm(wp + vec3(e, 0, 0)) - n0, yfbm(wp + vec3(0, e, 0)) - n0, yfbm(wp + vec3(0, 0, e)) - n0) / e;
  vec3 gv = (viewMatrix * vec4(g, 0.0)).xyz;
  normal = normalize(normal - gv * uDetail.x);
  float crev = smoothstep(0.62, 0.3, n0);
  diffuseColor.rgb *= 1.0 - crev * uDetail.z;
  diffuseColor.rgb *= 1.0 + (yn3(vYWorld * uDetail.y * 0.23) - 0.5) * uDetail.w;
}
`

const CHUNK = /* glsl */ `
{
  vec3 yPos = -vViewPosition;
  vec3 yView = normalize(vViewPosition);
  for (int i = 0; i < MAX_YL; i++) {
    vec4 lc = uYLCol[i];
    if (lc.w <= 0.0) continue;
    vec4 lp = uYLPos[i];
    vec3 L = lp.xyz - yPos;
    float d = length(L);
    if (d > lp.w) continue;
    L /= max(d, 1e-4);
    float x = d / lp.w;
    float win = (1.0 - x * x);
    float att = win * win / (1.0 + d * d * 0.25);
    float ndl = dot(normal, L);
    float diff = uBands > 0.0
      ? smoothstep(-0.05, uBands, ndl) * 0.6 + smoothstep(0.42, 0.42 + uBands, ndl) * 0.4
      : clamp(ndl * 0.85 + 0.15, 0.0, 1.0);
    vec3 radiance = lc.rgb * lc.w * att;
    reflectedLight.directDiffuse += radiance * diff * BRDF_Lambert(diffuseColor.rgb);
    vec3 H = normalize(L + yView);
    float shin = 2.0 / max(roughnessFactor * roughnessFactor * roughnessFactor, 0.004);
    float spec = pow(clamp(dot(normal, H), 0.0, 1.0), shin) * (1.0 - roughnessFactor * 0.85);
    reflectedLight.directSpecular += radiance * spec * 0.35 * step(0.0, ndl);
  }
  if (uRim.w > 0.0) {
    float rim = pow(1.0 - clamp(dot(normal, yView), 0.0, 1.0), 3.0);
    reflectedLight.directDiffuse += uRim.rgb * uRim.w * rim * diffuseColor.rgb;
  }
}
`

export interface PaintedParams extends MeshStandardMaterialParameters {
  /** 0 = smooth shading, >0 (e.g. 0.12) = soft painted banding. */
  bands?: number
  /** Rim light colour + strength. */
  rim?: [number, number, number, number]
  /** Procedural surface detail: [bump, scale, crevice, colour variation] (stone, plaster, skin). */
  detail?: [number, number, number, number]
  /** Triplanar photo-texture (see header). `scale` = repeats per metre. */
  tri?: { set: TriSet; scale?: number; normal?: number; rough?: number; tint?: [number, number, number] }
}

/** A CC0 texture set in /public/textures: <name>_color.webp, _normal.webp, _rough.webp */
export interface TriSet {
  map: Texture
  nor: Texture
  rgh: Texture
}

const triCache = new Map<string, TriSet>()
const loader = new TextureLoader()
/** Load (once) a texture set by name, e.g. triSet('rock030'). */
export function triSet(name: string): TriSet {
  let s = triCache.get(name)
  if (!s) {
    const load = (suffix: string, srgb: boolean) => {
      const t = loader.load(`/textures/${name}_${suffix}.webp`)
      t.wrapS = t.wrapT = RepeatWrapping
      t.anisotropy = 8
      if (srgb) t.colorSpace = SRGBColorSpace
      return t
    }
    s = { map: load('color', true), nor: load('normal', false), rgh: load('rough', false) }
    triCache.set(name, s)
  }
  return s
}

export class PaintedMaterial extends MeshStandardMaterial {
  readonly uBands: { value: number }
  readonly uRim: { value: Vector4 }
  readonly uDetail: { value: Vector4 }
  readonly uTri: { value: Vector4 }
  readonly uTriTint: { value: Vector3 }
  readonly tri: TriSet | null

  constructor({ bands = 0, rim = [0, 0, 0, 0], detail = [0, 1, 0, 0], tri, ...params }: PaintedParams = {}) {
    super(params)
    this.uBands = { value: bands }
    this.uRim = { value: new Vector4(...rim) }
    this.uDetail = { value: new Vector4(...detail) }
    this.tri = tri?.set ?? null
    this.uTri = { value: new Vector4(tri?.scale ?? 1, tri?.normal ?? 1, tri?.rough ?? 0.8, tri ? 1 : 0) }
    this.uTriTint = { value: new Vector3(...(tri?.tint ?? [1, 1, 1])) }
    this.onBeforeCompile = (s) => {
      s.uniforms.uYLPos = sharedUniforms.uYLPos
      s.uniforms.uYLCol = sharedUniforms.uYLCol
      s.uniforms.uBands = this.uBands
      s.uniforms.uRim = this.uRim
      s.uniforms.uDetail = this.uDetail
      s.uniforms.uTri = this.uTri
      s.uniforms.uTriTint = this.uTriTint
      s.uniforms.uTriMap = { value: this.tri?.map ?? null }
      s.uniforms.uTriNor = { value: this.tri?.nor ?? null }
      s.uniforms.uTriRgh = { value: this.tri?.rgh ?? null }
      s.vertexShader = s.vertexShader
        .replace('#include <common>', `#include <common>\n${VDECL}`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>\n${VCHUNK}`)
      s.fragmentShader = s.fragmentShader
        .replace('#include <common>', `#include <common>\n${DECL}`)
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n${BUMP}`)
        .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>\n${CHUNK}`)
    }
  }

  // All painted materials share one program per three.js variant.
  customProgramCacheKey() {
    return 'yoki-painted'
  }
}

export const painted = (p?: PaintedParams) => new PaintedMaterial(p)

export const col = (hex: string) => new Color(hex)
