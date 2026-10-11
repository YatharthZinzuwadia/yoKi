// The director: one clock for the whole film.
// Per-frame values live on the `film` singleton (no React re-renders);
// slow UI state lives in the zustand store `useUI`.

import { create } from 'zustand'
import { PHASE_STARTS, RANGES, TOTAL, type SceneRange } from '../content/film'
import { clamp, damp } from './math'

type FrameListener = (f: typeof film) => void

export const film = {
  /** Smoothed film time, in units. Everything visual reads this. */
  t: 0,
  /** Unsmoothed target time from the scroll position. */
  target: 0,
  /** Film-time velocity (units / second), smoothed. */
  vel: 0,
  /** Last frame delta (seconds, clamped). */
  dt: 1 / 60,
  /** Seconds since the film was entered (wall-clock, for idle animation). */
  clock: 0,
  /** Index into RANGES of the scene at `t`. */
  sceneIndex: 0,
  scene: RANGES[0] as SceneRange,
  phase: 1 as 1 | 2 | 3 | 4 | 5,
  /** Entry transition 0 → 1 (P1-02). 1 = settled; the camera rig and veil read it. */
  intro: 1,
  /** true while the user is actively scrolling (for UI states). */
  scrolling: false,
  lastInput: 0,
  total: TOTAL,

  listeners: new Set<FrameListener>(),
  onFrame(fn: FrameListener) {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  },
  /** Called after the frame is rendered (camera final) — DOM overlays use this. */
  afterListeners: new Set<FrameListener>(),
  onAfterFrame(fn: FrameListener) {
    this.afterListeners.add(fn)
    return () => {
      this.afterListeners.delete(fn)
    }
  },
  emitAfter() {
    for (const fn of this.afterListeners) fn(this)
  },

  /** Advance the clock. Called once per frame, first thing. */
  update(rawDt: number) {
    const dt = clamp(rawDt, 1 / 240, 1 / 20)
    this.dt = dt
    this.clock += dt
    const prev = this.t
    // Lenis already smooths input; a light extra damping removes trackpad micro-jitter.
    this.t = damp(this.t, this.target, 14, dt)
    if (Math.abs(this.t - this.target) < 1e-5) this.t = this.target
    this.vel = damp(this.vel, (this.t - prev) / dt, 6, dt)
    this.scrolling = performance.now() - this.lastInput < 250

    // scene lookup (linear walk from the current index; scenes are few and t moves smoothly)
    let i = this.sceneIndex
    while (i < RANGES.length - 1 && this.t >= RANGES[i].end) i++
    while (i > 0 && this.t < RANGES[i].start) i--
    if (i !== this.sceneIndex) {
      this.sceneIndex = i
      this.scene = RANGES[i]
    }
    const ph = RANGES[i].phase
    if (ph !== this.phase) {
      this.phase = ph
      useUI.getState().setPhase(ph)
    }
    for (const fn of this.listeners) fn(this)
  },

  /** Local progress 0..1 of a scene range at the current time. */
  local(r: SceneRange) {
    return clamp((this.t - r.start) / (r.end - r.start))
  },
  /** Is time `t` within the scene (plus margins in units)? */
  near(r: SceneRange, before = 1.5, after = 1.5) {
    return this.t >= r.start - before && this.t <= r.end + after
  },
  /** Jump instantly (used by nav fade-cuts and deep links). */
  snap(t: number) {
    this.t = this.target = clamp(t, 0, TOTAL)
    this.vel = 0
  },
}

export type Quality = 0 | 1 | 2 | 3

interface UIState {
  progress: number // loading 0..1
  ready: boolean // assets + shaders done
  entered: boolean
  muted: boolean
  phase: 1 | 2 | 3 | 4 | 5
  quality: Quality
  debug: boolean
  setProgress: (p: number) => void
  setReady: () => void
  enter: () => void
  setMuted: (m: boolean) => void
  setPhase: (p: 1 | 2 | 3 | 4 | 5) => void
  setQuality: (q: Quality) => void
}

const storedMute = (() => {
  try {
    return localStorage.getItem('yoki.muted') === '1'
  } catch {
    return false
  }
})()

export const useUI = create<UIState>((set) => ({
  progress: 0,
  ready: false,
  entered: false,
  muted: storedMute,
  phase: 1,
  quality: 2,
  debug: typeof location !== 'undefined' && new URLSearchParams(location.search).has('debug'),
  setProgress: (p) => set((s) => ({ progress: Math.max(s.progress, p) })),
  setReady: () => set({ ready: true, progress: 1 }),
  enter: () => set({ entered: true }),
  setMuted: (m) => {
    try {
      localStorage.setItem('yoki.muted', m ? '1' : '0')
    } catch {
      /* private mode */
    }
    set({ muted: m })
  },
  setPhase: (p) => set({ phase: p }),
  setQuality: (q) => set({ quality: q }),
}))

export { PHASE_STARTS }
