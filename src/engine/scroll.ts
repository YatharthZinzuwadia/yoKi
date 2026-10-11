// Scroll ↔ film time. Lenis smooths wheel/trackpad/touch identically across browsers;
// it is driven from the R3F frame loop (one rAF for the whole site).

import Lenis from 'lenis'
import { PHASE_STARTS, RANGES, TOTAL, UNIT_VH } from '../content/film'
import { view } from './anchors'
import { film, useUI } from './director'
import { clamp } from './math'

let lenis: Lenis | null = null
let track: HTMLDivElement | null = null
let veil: HTMLDivElement | null = null
let jumping = false

const unitPx = () => window.innerHeight * UNIT_VH

function sizeTrack() {
  if (!track) return
  track.style.height = `${Math.round(TOTAL * unitPx() + window.innerHeight)}px`
}

export function scrollToTime(t: number, immediate = true) {
  if (!lenis) return
  const y = (clamp(t, 0, TOTAL) / TOTAL) * lenis.limit
  lenis.scrollTo(y, { immediate, force: true })
}

export function initScroll() {
  if (lenis) return lenis
  track = document.getElementById('scroll-track') as HTMLDivElement
  veil = document.getElementById('cut-veil') as HTMLDivElement
  sizeTrack()
  history.scrollRestoration = 'manual'
  window.scrollTo(0, 0)

  lenis = new Lenis({
    autoRaf: false,
    lerp: 0.075,
    smoothWheel: true,
    wheelMultiplier: 0.85,
    touchMultiplier: 1.4,
  })
  lenis.stop()

  // dev / QA hook: window.__yoki.seek(t)
  if (import.meta.env.DEV || location.search.includes('debug')) {
    ;(window as unknown as { __yoki: unknown }).__yoki = {
      film,
      seek(t: number) {
        scrollToTime(t)
        film.snap(t)
      },
      ui: useUI,
      view,
    }
  }

  lenis.on('scroll', () => {
    film.lastInput = performance.now()
  })

  let resizeT = 0
  window.addEventListener('resize', () => {
    window.clearTimeout(resizeT)
    resizeT = window.setTimeout(() => {
      const t = film.target
      sizeTrack()
      lenis?.resize()
      scrollToTime(t)
      film.snap(t)
    }, 120)
  })

  window.addEventListener('keydown', (e) => {
    if (!useUI.getState().entered || e.metaKey || e.ctrlKey || e.altKey) return
    if (e.key === 'm' || e.key === 'M') {
      const s = useUI.getState()
      s.setMuted(!s.muted)
    } else if (e.key >= '1' && e.key <= '5') {
      jumpTo(PHASE_STARTS[Number(e.key) - 1])
    } else if (e.key === '0') {
      jumpTo(0)
    }
  })
  return lenis
}

/** Called once per frame before anything else reads film time. */
export function tickScroll(timeMs: number) {
  if (!lenis) return
  lenis.raf(timeMs)
  if (!jumping && lenis.limit > 0) film.target = clamp((lenis.animatedScroll / lenis.limit) * TOTAL, 0, TOTAL)
}

export function startScroll() {
  lenis?.start()
  // deep links (development + sharing): ?t=12.5 or ?scene=p2.court
  const q = new URLSearchParams(location.search)
  const sceneId = q.get('scene')
  const tParam = q.get('t')
  const t = sceneId ? RANGES.find((r) => r.id === sceneId)?.start : tParam ? Number(tParam) : undefined
  if (t !== undefined && !Number.isNaN(t)) {
    scrollToTime(t)
    film.snap(t)
  }
}

/** Editorial cut: fade to black, jump, fade in. Never fast-forwards through the take. */
export function jumpTo(t: number) {
  if (!lenis || !veil || jumping) return
  jumping = true
  veil.style.transition = 'opacity 420ms ease'
  veil.style.opacity = '1'
  window.setTimeout(() => {
    scrollToTime(t)
    film.snap(t)
    window.setTimeout(() => {
      if (veil) veil.style.opacity = '0'
      jumping = false
    }, 120)
  }, 440)
}
