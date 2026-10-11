// The canvas: one renderer, one camera, every scene mounted once, one frame loop.

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Suspense, useEffect, useRef } from 'react'
import { DefaultLoadingManager, NoToneMapping, PCFShadowMap, type DirectionalLight, type HemisphereLight, type Material, type Texture } from 'three'
import { film, useUI } from '../engine/director'
import { env, fx, sceneLights } from '../engine/fx'
import { useAdaptiveQuality } from '../engine/quality'
import { tickScroll } from '../engine/scroll'
import { SPECS } from '../scenes'
import { warmup } from '../scenes/SceneRoot'
import { CameraRig } from './CameraRig'
import { PostFX, atmosphere } from './PostFX'

function Director() {
  useAdaptiveQuality()
  useFrame((_, delta) => {
    tickScroll(performance.now())
    fx.reset()
    env.reset()
    sceneLights.reset()
    film.update(delta)
  }, -100)
  return null
}

function GlobalLights() {
  const hemi = useRef<HemisphereLight>(null)
  const sun = useRef<DirectionalLight>(null)
  useEffect(() => {
    atmosphere.hemi = hemi.current
    atmosphere.sun = sun.current
  }, [])
  return (
    <>
      <hemisphereLight ref={hemi} args={['#101014', '#030304', 1]} />
      <directionalLight
        ref={sun}
        intensity={0}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
        shadow-camera-near={1}
        shadow-camera-far={90}
      />
    </>
  )
}

/** Loading progress from three's default manager (textures, models, fonts). */
let assetFrac = 1
DefaultLoadingManager.onStart = () => (assetFrac = 0)
DefaultLoadingManager.onProgress = (_u, loaded, total) => {
  assetFrac = total ? loaded / total : 1
  useUI.getState().setProgress(assetFrac * 0.8)
}
DefaultLoadingManager.onLoad = () => (assetFrac = 1)

/** Mounted after every scene has resolved: uploads textures and compiles every shader. */
function Warmup() {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      // let all components create their objects
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
      while (assetFrac < 1 && !cancelled) await new Promise((r) => setTimeout(r, 50))
      useUI.getState().setProgress(0.82)
      warmup.all = true
      // make everything visible for compilation, then restore authored visibility
      const hidden: { visible: boolean }[] = []
      scene.traverse((o) => {
        if (!o.visible) {
          hidden.push(o)
          o.visible = true
        }
      })
      const seen = new Set<Texture>()
      scene.traverse((o) => {
        const mat = (o as { material?: Material | Material[] }).material
        const mats = Array.isArray(mat) ? mat : mat ? [mat] : []
        for (const m of mats)
          for (const v of Object.values(m)) if (v && (v as Texture).isTexture && !seen.has(v as Texture)) seen.add(v as Texture)
      })
      for (const t of seen) gl.initTexture(t)
      useUI.getState().setProgress(0.88)
      await gl.compileAsync(scene, camera)
      for (const o of hidden) o.visible = false
      useUI.getState().setProgress(0.97)
      warmup.all = false
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
      if (!cancelled) useUI.getState().setReady()
    }
    run()
    return () => {
      cancelled = true
    }
  }, [gl, scene, camera])
  return null
}

export function Stage() {
  return (
    <Canvas
      className="stage"
      flat
      shadows={{ type: PCFShadowMap }}
      gl={{ antialias: false, alpha: false, stencil: false, depth: true, powerPreference: 'high-performance' }}
      camera={{ fov: 55, near: 0.04, far: 900, position: [0, 1.6, 6] }}
      onCreated={({ gl }) => {
        gl.toneMapping = NoToneMapping
        gl.setClearColor('#08080a')
      }}
    >
      <Director />
      <GlobalLights />
      <CameraRig />
      <Suspense fallback={null}>
        {SPECS.map(({ spec, range }) => (
          <spec.Component key={range.id} range={range} />
        ))}
        <Warmup />
      </Suspense>
      <PostFX />
    </Canvas>
  )
}
