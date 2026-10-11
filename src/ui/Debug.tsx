// ?debug overlay: frame time, quality tier, film time, scene.

import { useEffect, useRef } from 'react'
import { film, useUI } from '../engine/director'

export function Debug() {
  const debug = useUI((s) => s.debug)
  const el = useRef<HTMLPreElement>(null)
  useEffect(() => {
    if (!debug) return
    let frames = 0, acc = 0, ms = 0
    return film.onAfterFrame((f) => {
      frames++
      acc += f.dt
      if (acc >= 0.5) {
        ms = (acc / frames) * 1000
        frames = 0
        acc = 0
      }
      if (el.current)
        el.current.textContent = `${ms.toFixed(1)} ms · ${(1000 / Math.max(ms, 0.01)).toFixed(0)} fps · q${useUI.getState().quality}\nt ${f.t.toFixed(2)} / ${f.total} · ${f.scene.id} · u ${(f.t - f.scene.start).toFixed(2)}`
    })
  }, [debug])
  if (!debug) return null
  return <pre ref={el} className="debug" />
}
