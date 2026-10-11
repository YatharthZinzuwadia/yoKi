// The painted-cinema post stack. Four custom effects:
//   PaintEffect  — rotated 4-sector Kuwahara: light becomes brush patches.
//   InkEffect    — depth + luminance edges with hand-drawn wobble: ink lines.
//   GradeEffect  — exposure/tonemap/contrast/saturation/lift, paper, vignette,
//                  veils (flash, black, the left-eye blood), invert, CA, grain.

import { BlendFunction, Effect, EffectAttribute } from 'postprocessing'
import { Uniform, Vector3 } from 'three'

const NOISE = /* glsl */ `
float yHash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float yNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(yHash(i), yHash(i + vec2(1.0, 0.0)), f.x),
             mix(yHash(i + vec2(0.0, 1.0)), yHash(i + vec2(1.0, 1.0)), f.x), f.y);
}
`

// ── Sanitize ──────────────────────────────────────────────────────────────
// One bad pixel (NaN/Inf from any shader on any GPU) would be smeared across the
// whole frame by bloom. This pass zeroes them before anything samples the image.
const sanitizeFrag = /* glsl */ `
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 c = inputColor.rgb;
  // bit test: exponent all ones = NaN or Inf (immune to fast-math optimisation)
  uvec3 b = floatBitsToUint(c) & uvec3(0x7f800000u);
  bool bad = any(equal(b, uvec3(0x7f800000u)));
  outputColor = bad ? vec4(0.0, 0.0, 0.0, 1.0) : vec4(clamp(c, vec3(0.0), vec3(16.0)), 1.0);
}
`
export class SanitizeEffect extends Effect {
  constructor() {
    super('SanitizeEffect', sanitizeFrag, { blendFunction: BlendFunction.NORMAL })
  }
}

// ── Paint ─────────────────────────────────────────────────────────────────
const paintFrag = /* glsl */ `
uniform float uStrength;
uniform float uRadius;
${NOISE}
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  if (uStrength < 0.002) { outputColor = inputColor; return; }
  float ang = yNoise(uv * resolution / 110.0) * 6.2831 + yNoise(uv * resolution / 23.0) * 0.8;
  float ca = cos(ang), sa = sin(ang);
  mat2 rot = mat2(ca, -sa, sa, ca);
  int r = int(clamp(floor(uRadius + 0.5), 1.0, 5.0));
  vec3 m0 = vec3(0.0), m1 = vec3(0.0), m2 = vec3(0.0), m3 = vec3(0.0);
  vec3 s0 = vec3(0.0), s1 = vec3(0.0), s2 = vec3(0.0), s3 = vec3(0.0);
  for (int j = -5; j <= 5; j++) {
    if (j < -r || j > r) continue;
    for (int i = -5; i <= 5; i++) {
      if (i < -r || i > r) continue;
      vec2 o = rot * vec2(float(i), float(j) * 0.7);
      vec3 c = min(texture2D(inputBuffer, uv + o * texelSize).rgb, vec3(6.0));
      vec3 c2 = c * c;
      if (i <= 0 && j <= 0) { m0 += c; s0 += c2; }
      if (i >= 0 && j <= 0) { m1 += c; s1 += c2; }
      if (i <= 0 && j >= 0) { m2 += c; s2 += c2; }
      if (i >= 0 && j >= 0) { m3 += c; s3 += c2; }
    }
  }
  float n = float((r + 1) * (r + 1));
  m0 /= n; m1 /= n; m2 /= n; m3 /= n;
  vec3 v0 = abs(s0 / n - m0 * m0), v1 = abs(s1 / n - m1 * m1), v2 = abs(s2 / n - m2 * m2), v3 = abs(s3 / n - m3 * m3);
  float q0 = v0.r + v0.g + v0.b, q1 = v1.r + v1.g + v1.b, q2 = v2.r + v2.g + v2.b, q3 = v3.r + v3.g + v3.b;
  vec3 res = m0; float best = q0;
  if (q1 < best) { best = q1; res = m1; }
  if (q2 < best) { best = q2; res = m2; }
  if (q3 < best) { best = q3; res = m3; }
  // keep true highlights (bloom sources, lines of light) crisp
  vec3 src = inputColor.rgb;
  float hi = smoothstep(2.0, 5.0, max(src.r, max(src.g, src.b)));
  outputColor = vec4(mix(src, mix(res, src, hi), uStrength), inputColor.a);
}
`

export class PaintEffect extends Effect {
  constructor() {
    super('PaintEffect', paintFrag, {
      attributes: EffectAttribute.CONVOLUTION,
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, Uniform>([
        ['uStrength', new Uniform(0.5)],
        ['uRadius', new Uniform(3)],
      ]),
    })
  }
  set(strength: number, radius: number) {
    this.uniforms.get('uStrength')!.value = strength
    this.uniforms.get('uRadius')!.value = radius
  }
}

// ── Ink ───────────────────────────────────────────────────────────────────
const inkFrag = /* glsl */ `
uniform float uStrength;
uniform vec3 uColor;
uniform float uFar;
uniform float uWidth;
${NOISE}
float yLin(float d) { return (cameraNear * cameraFar) / max(cameraFar - d * (cameraFar - cameraNear), 1e-5); }
float yLuma(vec3 c) { return dot(min(c, vec3(4.0)), vec3(0.299, 0.587, 0.114)); }
void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
  if (uStrength < 0.002) { outputColor = inputColor; return; }
  vec2 fc = uv * resolution;
  vec2 wob = (vec2(yNoise(fc * 0.05), yNoise(fc * 0.05 + 31.7)) - 0.5) * 2.2 * texelSize;
  vec2 c = uv + wob;
  vec2 px = texelSize * uWidth;
  float d0 = yLin(readDepth(c));
  float dl = yLin(readDepth(c - vec2(px.x, 0.0)));
  float dr = yLin(readDepth(c + vec2(px.x, 0.0)));
  float dd = yLin(readDepth(c - vec2(0.0, px.y)));
  float du = yLin(readDepth(c + vec2(0.0, px.y)));
  float inv = 1.0 / max(d0, 0.05);
  float lap = (abs(dl + dr - 2.0 * d0) + abs(dd + du - 2.0 * d0)) * inv;
  float jump = max(max(abs(dl - d0), abs(dr - d0)), max(abs(dd - d0), abs(du - d0))) * inv;
  float e = max(smoothstep(0.035, 0.1, lap), smoothstep(0.06, 0.16, jump));
  float lc = yLuma(texture2D(inputBuffer, c).rgb);
  float gx = yLuma(texture2D(inputBuffer, c + vec2(px.x, 0.0)).rgb) - yLuma(texture2D(inputBuffer, c - vec2(px.x, 0.0)).rgb);
  float gy = yLuma(texture2D(inputBuffer, c + vec2(0.0, px.y)).rgb) - yLuma(texture2D(inputBuffer, c - vec2(0.0, px.y)).rgb);
  float le = smoothstep(0.22, 0.55, length(vec2(gx, gy)) / (lc + 0.25));
  e = max(e, le * 0.55);
  // stroke texture: lines break up a little like a real pen
  e *= 0.75 + 0.25 * yNoise(fc * 0.35);
  e *= 1.0 - smoothstep(uFar * 0.55, uFar, d0);
  outputColor = vec4(mix(inputColor.rgb, uColor, clamp(e * uStrength, 0.0, 1.0)), inputColor.a);
}
`

export class InkEffect extends Effect {
  constructor() {
    super('InkEffect', inkFrag, {
      attributes: EffectAttribute.CONVOLUTION | EffectAttribute.DEPTH,
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, Uniform>([
        ['uStrength', new Uniform(0.5)],
        ['uColor', new Uniform(new Vector3(0.03, 0.03, 0.04))],
        ['uFar', new Uniform(60)],
        ['uWidth', new Uniform(1)],
      ]),
    })
  }
  set(strength: number, r: number, g: number, b: number, far: number, width: number) {
    this.uniforms.get('uStrength')!.value = strength
    ;(this.uniforms.get('uColor')!.value as Vector3).set(r, g, b)
    this.uniforms.get('uFar')!.value = far
    this.uniforms.get('uWidth')!.value = width
  }
}

// ── Grade ─────────────────────────────────────────────────────────────────
const gradeFrag = /* glsl */ `
uniform float uExposure;
uniform float uContrast;
uniform float uSaturation;
uniform vec3 uTint;
uniform float uLift;
uniform vec3 uLiftTint;
uniform float uVignette;
uniform float uGrain;
uniform float uPaper;
uniform float uCA;
uniform float uVeilWhite;
uniform float uVeilBlack;
uniform float uBloodLeft;
uniform float uInvert;
${NOISE}
vec3 yAces(vec3 x) {
  const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 col = inputColor.rgb;
  if (uCA > 0.0005) {
    vec2 dir = (uv - 0.5);
    float tear = (yNoise(vec2(uv.y * 40.0, time * 9.0)) - 0.5) * uCA * 0.02;
    col.r = texture2D(inputBuffer, uv + dir * uCA * 0.012 + vec2(tear, 0.0)).r;
    col.b = texture2D(inputBuffer, uv - dir * uCA * 0.012 - vec2(tear, 0.0)).b;
  }
  col = col * exp2(uExposure) * uTint;
  col = yAces(col);
  vec3 g = pow(col, vec3(1.0 / 2.2));
  g = clamp((g - 0.5) * uContrast + 0.5, 0.0, 1.0);
  float l = dot(g, vec3(0.2126, 0.7152, 0.0722));
  g = mix(vec3(l), g, uSaturation);
  g += uLift * uLiftTint * (1.0 - l);
  vec2 fc = uv * resolution;
  // paper: large soft blotches + fine fibres, locked to the screen (never swims)
  float blot = yNoise(fc / 180.0) * 0.6 + yNoise(fc / 60.0) * 0.4;
  float fib = yNoise(vec2(fc.x * 0.9, fc.y * 0.12)) * 0.5 + yNoise(vec2(fc.x * 0.12, fc.y * 0.9)) * 0.5;
  g *= 1.0 - uPaper * (0.07 * blot + 0.05 * fib);
  g += uPaper * 0.012 * (fib - 0.5);
  // vignette
  vec2 q = uv - 0.5;
  q.x *= aspect;
  float vig = smoothstep(1.05, 0.25, length(q) * 1.15);
  g *= mix(1.0, vig, uVignette);
  // the left-eye blood veil (after the crash)
  float edge = uv.x + (yNoise(vec2(uv.y * 6.0, 3.1)) - 0.5) * 0.12;
  float bl = smoothstep(0.42, 0.0, edge) * uBloodLeft;
  g = mix(g, g * vec3(0.55, 0.04, 0.04) + vec3(0.18, 0.0, 0.01), bl);
  g = mix(g, vec3(1.0), uVeilWhite);
  g = mix(g, vec3(0.0), uVeilBlack);
  g = mix(g, 1.0 - g, uInvert);
  float n = yHash(fc + fract(time * 13.7) * 197.0) - 0.5;
  g += n * uGrain * 0.09;
  outputColor = vec4(pow(max(g, 0.0), vec3(2.2)), inputColor.a);
}
`

export class GradeEffect extends Effect {
  constructor() {
    super('GradeEffect', gradeFrag, {
      attributes: EffectAttribute.CONVOLUTION,
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, Uniform>(
        (
          [
            ['uExposure', 0],
            ['uContrast', 1],
            ['uSaturation', 1],
            ['uTint', new Vector3(1, 1, 1)],
            ['uLift', 0],
            ['uLiftTint', new Vector3(0.1, 0.1, 0.12)],
            ['uVignette', 0.4],
            ['uGrain', 0.3],
            ['uPaper', 0.3],
            ['uCA', 0],
            ['uVeilWhite', 0],
            ['uVeilBlack', 0],
            ['uBloodLeft', 0],
            ['uInvert', 0],
          ] as [string, unknown][]
        ).map(([k, v]) => [k, new Uniform(v)]),
      ),
    })
  }
  u(name: string) {
    return this.uniforms.get(name)!
  }
}
