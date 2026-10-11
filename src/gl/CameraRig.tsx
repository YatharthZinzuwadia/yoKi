// The one camera. Samples the global track, then adds the living layer:
// a damped glance toward the cursor, breathing sway, and scene shake.

import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { MathUtils, Quaternion, Vector3, type PerspectiveCamera } from 'three'
import { view } from '../engine/anchors'
import { film } from '../engine/director'
import { fx } from '../engine/fx'
import { damp, easeInOutCubic, smoothstep } from '../engine/math'
import { cameraTrack } from '../scenes'

export const pointer = { x: 0, y: 0 }
const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

const AUTHORED_ASPECT = 16 / 9
const MAX_YAW = MathUtils.degToRad(4.5)
const MAX_PITCH = MathUtils.degToRad(2.8)

export function CameraRig() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const scene = useThree((s) => s.scene)
  const sample = useRef<number[]>(new Array(8).fill(0))
  const state = useRef({ yaw: 0, pitch: 0, lastFov: 0, lastAspect: 0 })
  const pos = useRef(new Vector3())
  const at = useRef(new Vector3())
  const q = useRef(new Quaternion())
  const axis = useRef(new Vector3())

  useEffect(() => {
    view.camera = camera
    view.scene = scene
    const onMove = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  useFrame(() => {
    const s = cameraTrack.sampleArray(film.t, sample.current)
    const st = state.current
    const dt = film.dt
    pos.current.set(s[0], s[1], s[2])
    at.current.set(s[3], s[4], s[5])

    // breathing (sub-centimetre) + shake
    const k = film.clock
    const breathe = reduced ? 0 : 1
    pos.current.y += Math.sin(k * 1.05) * 0.006 * breathe
    pos.current.x += Math.sin(k * 0.53 + 1.3) * 0.004 * breathe
    if (fx.shake > 0) {
      const a = fx.shake
      pos.current.x += (Math.sin(k * 47.1) + Math.sin(k * 23.3)) * a * 0.5
      pos.current.y += (Math.sin(k * 41.7 + 2) + Math.sin(k * 19.1)) * a * 0.5
    }

    // entry transition (P1-02): start 4.5 m back and 0.9 m up in darkness, glide into the first key
    if (film.intro < 1) {
      const e = 1 - easeInOutCubic(film.intro)
      pos.current.z += 4.5 * e
      pos.current.y += 0.9 * e
      at.current.y -= 0.6 * e
      fx.black += 1 - smoothstep(0.2, 0.85, film.intro)
    }
    camera.position.copy(pos.current)
    camera.up.set(0, 1, 0)
    camera.lookAt(at.current)

    // damped glance toward the cursor
    st.yaw = damp(st.yaw, -pointer.x * MAX_YAW, 2.2, dt)
    st.pitch = damp(st.pitch, -pointer.y * MAX_PITCH, 2.2, dt)
    camera.quaternion.multiply(q.current.setFromAxisAngle(axis.current.set(0, 1, 0), st.yaw))
    camera.quaternion.multiply(q.current.setFromAxisAngle(axis.current.set(1, 0, 0), st.pitch))
    const roll = s[7] + (fx.shake > 0 ? Math.sin(k * 33.3) * fx.shake * 0.6 : 0)
    if (roll !== 0) camera.quaternion.multiply(q.current.setFromAxisAngle(axis.current.set(0, 0, 1), roll))

    // keep the authored horizontal framing on narrower-than-16:9 screens
    const aspect = camera.aspect
    let fov = s[6]
    if (aspect < AUTHORED_ASPECT) {
      const h = 2 * Math.atan(Math.tan(MathUtils.degToRad(fov) / 2) * AUTHORED_ASPECT)
      fov = Math.min(MathUtils.radToDeg(2 * Math.atan(Math.tan(h / 2) / aspect)), 100)
    }
    if (Math.abs(fov - st.lastFov) > 1e-3 || aspect !== st.lastAspect) {
      camera.fov = fov
      camera.updateProjectionMatrix()
      st.lastFov = fov
      st.lastAspect = aspect
    }
    camera.updateMatrixWorld()
  }, -50)

  return null
}
