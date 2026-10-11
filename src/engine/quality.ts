// Adaptive quality: hold the frame rate by trading resolution first, effects second.
// Never more than one change every 2 seconds; never a visible pop beyond resolution.

import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { useUI, type Quality } from './director'

/** Pixel budget at full quality (~2560×1440). Large/HiDPI screens start below native. */
const PIXEL_BUDGET = 3.7e6

export function initialDpr() {
  const native = Math.min(window.devicePixelRatio || 1, 2)
  const css = window.innerWidth * window.innerHeight
  return Math.max(0.6, Math.min(native, Math.sqrt(PIXEL_BUDGET / css)))
}

export function tierFromDpr(dpr: number, max: number): Quality {
  const r = dpr / max
  if (r > 0.92) return 3
  if (r > 0.75) return 2
  if (r > 0.6) return 1
  return 0
}

export function useAdaptiveQuality() {
  const setDpr = useThree((s) => s.setDpr)
  const st = useRef({ acc: 0, frames: 0, lastChange: 0, good: 0, dpr: 1, max: 1 })

  useEffect(() => {
    const d = initialDpr()
    st.current.dpr = d
    st.current.max = d
    setDpr(d)
    useUI.getState().setQuality(3)
  }, [setDpr])

  useFrame((_, delta) => {
    const s = st.current
    if (delta > 0.25) return // tab switch / hitch spike, ignore
    s.acc += delta
    s.frames++
    if (s.acc < 1) return
    const avg = s.acc / s.frames
    s.acc = 0
    s.frames = 0
    const now = performance.now()
    if (now - s.lastChange < 2000) return
    if (avg > 1 / 48 && s.dpr > 0.5) {
      s.dpr = Math.max(0.5, s.dpr - (avg > 1 / 30 ? 0.25 : 0.12))
      s.good = 0
    } else if (avg < 1 / 58 && s.dpr < s.max) {
      if (++s.good < 3) return
      s.dpr = Math.min(s.max, s.dpr + 0.1)
      s.good = 0
    } else return
    s.lastChange = now
    setDpr(s.dpr)
    useUI.getState().setQuality(tierFromDpr(s.dpr, s.max))
  })
}
