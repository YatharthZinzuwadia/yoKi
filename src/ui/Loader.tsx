// The loader: a point of light traces the sigil with REAL loading progress,
// `yoKi` signs itself, then one click enters (and unlocks sound — on by default).

import { useEffect, useRef, useState } from 'react'
import { audio } from '../audio/engine'
import { film, useUI } from '../engine/director'
import { easeInOutCubic, range } from '../engine/math'
import { startScroll } from '../engine/scroll'
import { Sigil, Wordmark, type SigilHandle, type WordmarkHandle } from './sigil/Sigil'

const FIGURE = ['contour', 'beard', 'moustache'] as const

export function Loader() {
  const progress = useUI((s) => s.progress)
  const ready = useUI((s) => s.ready)
  const muted = useUI((s) => s.muted)
  const [phase, setPhase] = useState<'loading' | 'signing' | 'waiting' | 'entering' | 'gone'>('loading')
  const sig = useRef<SigilHandle>(null)
  const word = useRef<WordmarkHandle>(null)
  const shown = useRef(0)
  const root = useRef<HTMLDivElement>(null)

  // trace the figure at (smoothed) loading progress
  useEffect(() => {
    let raf = 0
    const tick = () => {
      const target = useUI.getState().progress
      shown.current += (target - shown.current) * 0.08
      const p = shown.current
      FIGURE.forEach((part, i) => {
        const local = easeInOutCubic(range(p, i * 0.22, 0.6 + i * 0.2))
        sig.current?.set(part, { draw: local, alpha: 1, glow: 0.15 + 0.15 * Math.sin(performance.now() / 600) })
      })
      if (phase === 'loading' || phase === 'signing') raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [phase])

  // once everything is compiled: sign the name, then wait for the click
  useEffect(() => {
    if (ready && phase === 'loading') setPhase('signing')
  }, [ready, phase])

  const signing = phase === 'signing'
  useEffect(() => {
    if (!signing) return
    let raf = 0
    let start = 0
    const sign = (now: number) => {
      if (!start) start = now
      const k = Math.min(1, (now - start) / 1700)
      word.current?.draw(easeInOutCubic(k))
      if (k < 1) raf = requestAnimationFrame(sign)
      else setPhase('waiting')
    }
    const delay = window.setTimeout(() => (raf = requestAnimationFrame(sign)), 450)
    return () => {
      window.clearTimeout(delay)
      cancelAnimationFrame(raf)
    }
  }, [signing])

  const enter = async () => {
    if (phase !== 'waiting') return
    // P1-02 — "through the sigil's eye": CSS zooms the sigil around its left eye while
    // film.intro (0 → 1 over 3 s) lifts the black and settles the camera into the cave.
    // Scroll stays locked until the camera has arrived, so the take never starts mid-move.
    setPhase('entering')
    film.intro = 0
    await audio.unlock(useUI.getState().muted)
    audio.cue('enter')
    audio.cue('breath', { gain: 0.5, delay: 1.3 })
    useUI.getState().enter()
    const DUR = 3000
    let start = 0
    const step = (now: number) => {
      if (!start) start = now
      film.intro = Math.min(1, (now - start) / DUR)
      if (film.intro < 1) requestAnimationFrame(step)
      else startScroll()
    }
    requestAnimationFrame(step)
    window.setTimeout(() => setPhase('gone'), 2600)
  }

  useEffect(() => {
    if (phase !== 'waiting') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        enter()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (phase === 'gone') return null
  return (
    <div
      ref={root}
      className={`loader is-${phase}`}
      onClick={enter}
      role="button"
      tabIndex={0}
      aria-label="Enter yoKi"
      data-cursor="enter"
    >
      <div className="loader-figure">
        <Sigil ref={sig} className="loader-sigil" stroke={2.2} />
        <Wordmark ref={word} className="loader-word" />
      </div>
      <div className="loader-prompt">
        <span>click anywhere to enter · sound {muted ? 'off' : 'on'}</span>
        <small>18+ · violence · gore · sexuality · psychosis · death</small>
      </div>
      <div className="loader-progress" aria-hidden="true">
        {Math.round(progress * 100)
          .toString()
          .padStart(3, '0')}
      </div>
    </div>
  )
}
