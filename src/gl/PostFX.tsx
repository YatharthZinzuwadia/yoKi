// Drives the post stack and the global atmosphere (fog, background, sun, hemi)
// from the look/fog tracks + per-frame fx overrides, then renders the frame.

import { useFrame, useThree } from '@react-three/fiber'
import { N8AOPostPass } from 'n8ao'
import { BloomEffect, EffectComposer, EffectPass, FXAAEffect, RenderPass } from 'postprocessing'
import { useEffect, useMemo, useRef } from 'react'
import { Color, Fog, HalfFloatType, type DirectionalLight, type HemisphereLight } from 'three'
import { LOOK_DIMS, LOOK_INDEX as I } from '../content/looks'
import { film, useUI } from '../engine/director'
import { env, fx, sceneLights } from '../engine/fx'
import { fogTrack, lookTrack } from '../scenes'
import { sharedUniforms } from './materials/painted'
import { GradeEffect, InkEffect, PaintEffect, SanitizeEffect } from './post/effects'

export const atmosphere = {
  hemi: null as HemisphereLight | null,
  sun: null as DirectionalLight | null,
}

export function PostFX() {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const dpr = useThree((s) => s.viewport.dpr)
  const quality = useUI((s) => s.quality)

  const look = useRef<number[]>(new Array(LOOK_DIMS).fill(0))
  const fogV = useRef<number[]>([0, 0, 0, 1, 10])

  const P = useMemo(() => {
    const composer = new EffectComposer(gl, { frameBufferType: HalfFloatType, multisampling: 0 })
    const paint = new PaintEffect()
    const bloom = new BloomEffect({
      mipmapBlur: true,
      luminanceThreshold: 0.82,
      luminanceSmoothing: 0.3,
      intensity: 0.9,
      radius: 0.78,
    })
    const ink = new InkEffect()
    const grade = new GradeEffect()
    composer.addPass(new RenderPass(scene, camera))
    // Ambient occlusion (N8AO, ISC licence): darkens creases, corners and contact points
    // from the depth buffer, so walls, floors and objects read as one connected space.
    const ao = new N8AOPostPass(scene, camera, 1280, 720)
    ao.configuration.gammaCorrection = false // we stay linear until the grade pass
    ao.configuration.aoSamples = 16
    ao.configuration.denoiseSamples = 8
    ao.configuration.denoiseRadius = 12
    ao.configuration.distanceFalloff = 1.0
    composer.addPass(ao)
    // FXAA on the raw render (MSAA + half-float + bloom is unreliable on some drivers),
    // then zero any NaN/Inf before anything blurs the image.
    composer.addPass(new EffectPass(camera, new FXAAEffect(), new SanitizeEffect()))
    composer.addPass(new EffectPass(camera, paint, bloom))
    composer.addPass(new EffectPass(camera, ink))
    composer.addPass(new EffectPass(camera, grade))
    return { composer, ao, paint, bloom, ink, grade }
  }, [gl, scene, camera])

  useEffect(() => {
    scene.fog = new Fog('#08080a', 5, 40)
    scene.background = new Color('#08080a')
    return () => {
      scene.fog = null
      scene.background = null
    }
  }, [scene])

  useEffect(() => {
    P.composer.setSize(size.width, size.height, false)
  }, [P, size.width, size.height, dpr])

  useEffect(() => {
    ;(window as unknown as { __post: unknown }).__post = P
    return () => P.composer.dispose()
  }, [P])

  useFrame((_, delta) => {
    const L = lookTrack.sample(film.t, look.current)
    const t = film.t

    // atmosphere
    const f = fogTrack.sample(t, fogV.current)
    const fog = scene.fog as Fog
    fog.color.setRGB(f[0], f[1], f[2])
    fog.near = f[3]
    fog.far = f[4]
    ;(scene.background as Color).setRGB(f[0], f[1], f[2])
    const { hemi, sun } = atmosphere
    if (hemi) {
      hemi.color.setRGB(...env.hemiSky)
      hemi.groundColor.setRGB(...env.hemiGround)
      hemi.intensity = env.hemiIntensity
    }
    if (sun) {
      sun.intensity = env.sunIntensity
      sun.color.setRGB(...env.sunColor)
      const [tx, ty, tz] = env.sunTarget
      sun.target.position.set(tx, ty, tz)
      sun.position.set(tx + env.sunDir[0] * 30, ty + env.sunDir[1] * 30, tz + env.sunDir[2] * 30)
      sun.target.updateMatrixWorld()
    }

    // scene lights → view space (after scenes have pushed theirs this frame)
    const m = camera.matrixWorldInverse
    sceneLights.select(camera.position.x, camera.position.y, camera.position.z)
    for (let i = 0; i < sceneLights.count; i++) {
      const p = sceneLights.pos[i]
      const v = sceneLights.view[i]
      v.set(p.x, p.y, p.z, 1).applyMatrix4(m)
      v.w = p.w
    }
    sharedUniforms.uTime.value = film.clock

    // post uniforms
    const radiusCap = quality >= 3 ? 5 : quality === 2 ? 3 : 2
    P.paint.set(quality === 0 ? 0 : L[I.paint], Math.min(L[I.paintRadius], radiusCap))
    P.bloom.intensity = L[I.bloom]
    P.ao.enabled = L[I.ao] > 0.01
    P.ao.configuration.intensity = L[I.ao]
    P.ao.configuration.aoRadius = L[I.aoRadius]
    P.ao.configuration.halfRes = quality < 3
    P.ink.set(L[I.ink], L[I.inkColor], L[I.inkColor + 1], L[I.inkColor + 2], L[I.inkFar], Math.max(1, dpr * 0.9))
    const g = P.grade
    g.u('uExposure').value = L[I.exposure] + fx.exposure
    g.u('uContrast').value = L[I.contrast]
    g.u('uSaturation').value = L[I.saturation]
    g.u('uTint').value.set(L[I.tint], L[I.tint + 1], L[I.tint + 2])
    g.u('uLift').value = L[I.lift]
    g.u('uLiftTint').value.set(L[I.liftTint], L[I.liftTint + 1], L[I.liftTint + 2])
    g.u('uVignette').value = L[I.vignette]
    g.u('uGrain').value = L[I.grain]
    g.u('uPaper').value = L[I.paper]
    g.u('uCA').value = L[I.ca] + fx.ca
    g.u('uVeilWhite').value = Math.min(1, L[I.veilWhite] + fx.flash)
    g.u('uVeilBlack').value = Math.min(1, L[I.veilBlack] + fx.black)
    g.u('uBloodLeft').value = Math.min(1, L[I.bloodLeft] + fx.blood)
    g.u('uInvert').value = L[I.invert]

    P.composer.render(delta)
    film.emitAfter()
  }, 1)

  return null
}
