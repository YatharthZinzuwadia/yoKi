// The kada: a small steel ring that follows the pointer, tightens and labels
// meaningful things (any element with data-cursor="label").

import { useEffect, useRef } from 'react'

export function Cursor() {
  const ring = useRef<HTMLDivElement>(null)
  const label = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (matchMedia('(pointer: coarse)').matches) return
    document.documentElement.classList.add('has-kada')
    const st = { x: innerWidth / 2, y: innerHeight / 2, tx: innerWidth / 2, ty: innerHeight / 2, vy: 0, lastY: 0 }
    let raf = 0
    const onMove = (e: PointerEvent) => {
      st.tx = e.clientX
      st.ty = e.clientY
      const t = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-cursor]')
      const text = t?.dataset.cursor ?? ''
      ring.current?.classList.toggle('is-active', !!text)
      if (label.current && label.current.textContent !== text) label.current.textContent = text
    }
    const onLeave = () => ring.current?.classList.add('is-hidden')
    const onEnter = () => ring.current?.classList.remove('is-hidden')
    let check = 0
    const tick = () => {
      // re-check what's under the ring (things appear/disappear under a still pointer)
      if (++check % 20 === 0) {
        const el = document.elementFromPoint(st.tx, st.ty) as HTMLElement | null
        const text = el?.closest<HTMLElement>('[data-cursor]')?.dataset.cursor ?? ''
        ring.current?.classList.toggle('is-active', !!text)
        if (label.current && label.current.textContent !== text) label.current.textContent = text
      }
      st.x += (st.tx - st.x) * 0.22
      st.y += (st.ty - st.y) * 0.22
      const sy = window.scrollY
      st.vy += (Math.min(40, Math.abs(sy - st.lastY)) - st.vy) * 0.15
      st.lastY = sy
      const stretch = 1 + st.vy * 0.012
      if (ring.current)
        ring.current.style.transform = `translate3d(${st.x.toFixed(1)}px, ${st.y.toFixed(1)}px, 0) scale(${(1 / Math.sqrt(stretch)).toFixed(3)}, ${stretch.toFixed(3)})`
      raf = requestAnimationFrame(tick)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('pointerleave', onLeave)
    document.addEventListener('pointerenter', onEnter)
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerleave', onLeave)
      document.removeEventListener('pointerenter', onEnter)
      document.documentElement.classList.remove('has-kada')
    }
  }, [])

  return (
    <div ref={ring} className="kada" aria-hidden="true">
      <span ref={label} className="kada-label" />
    </div>
  )
}
