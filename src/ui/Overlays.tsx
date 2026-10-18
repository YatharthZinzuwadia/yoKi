// DOM layers above the canvas, updated after each rendered frame:
// first-person statements, 3D-pinned annotations, and the phase sigil thresholds.

import { useEffect, useRef } from 'react'
import { ANNOTATIONS, STATEMENTS, THRESHOLDS } from '../content/copy'
import { sceneRange } from '../content/film'
import { anchors, project } from '../engine/anchors'
import { film } from '../engine/director'
import { clamp, easeInOutCubic, range, smoothstep } from '../engine/math'
import { Sigil, Wordmark, type SigilHandle, type WordmarkHandle } from './sigil/Sigil'
import type { SigilPart } from './sigil/paths'

const fade = (u: number, from: number, to: number) => {
  const len = to - from
  const e = Math.min(0.6, len * 0.22)
  return smoothstep(from, from + e, u) * (1 - smoothstep(to - e, to, u))
}

// ── Statements ──────────────────────────────────────────────────────────────
export function Statements() {
  const els = useRef<(HTMLDivElement | null)[]>([])
  const last = useRef<number[]>([])
  useEffect(
    () =>
      film.onAfterFrame((f) => {
        STATEMENTS.forEach((s, i) => {
          const el = els.current[i]
          if (!el) return
          const r = sceneRange(s.scene)
          const u = f.t - r.start
          const o = u < s.from - 0.1 || u > s.to + 0.1 ? 0 : fade(u, s.from, s.to)
          if (Math.abs((last.current[i] ?? -1) - o) < 0.002) return
          last.current[i] = o
          el.style.opacity = o.toFixed(3)
          el.style.transform = `translate3d(0, ${((1 - o) * 10).toFixed(2)}px, 0)`
          el.style.visibility = o > 0.001 ? 'visible' : 'hidden'
          el.style.filter = o < 0.999 ? `blur(${((1 - o) * 6).toFixed(2)}px)` : 'none'
        })
      }),
    [],
  )
  return (
    <div className="statements" aria-live="polite">
      {STATEMENTS.map((s, i) => (
        <div
          key={i}
          ref={(el) => {
            els.current[i] = el
          }}
          className={`statement at-${s.at ?? 'low'}${s.quote ? ' is-quote' : ''}${s.script === 'devanagari' ? ' is-deva' : ''}${s.script === 'gujarati' ? ' is-guj' : ''}`}
        >
          {s.quote ? `“${s.text.replace(/^“|”$/g, '')}”` : s.text}
          {s.tr && <span className="tr">{s.tr}</span>}
        </div>
      ))}
    </div>
  )
}

// ── Annotations ─────────────────────────────────────────────────────────────
export function Annotations() {
  const els = useRef<(HTMLDivElement | null)[]>([])
  const labels = useRef<(HTMLSpanElement | null)[]>([])
  const pos = useRef({ x: 0, y: 0, z: 0 })
  useEffect(
    () =>
      film.onAfterFrame((f) => {
        ANNOTATIONS.forEach((a, i) => {
          const el = els.current[i]
          if (!el) return
          const r = sceneRange(a.scene)
          const u = f.t - r.start
          let o = u < a.from - 0.1 || u > a.to + 0.1 ? 0 : fade(u, a.from, a.to)
          if (o <= 0.001) {
            if (el.style.visibility !== 'hidden') el.style.visibility = 'hidden'
            return
          }
          if (a.anchor.startsWith('screen.')) {
            el.style.transform = ''
          } else {
            const p = anchors.get(a.anchor)
            const s = p ? project(p, pos.current) : null
            if (!s) o = 0
            else el.style.transform = `translate3d(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px, 0)`
          }
          el.style.visibility = o > 0.001 ? 'visible' : 'hidden'
          el.style.opacity = o.toFixed(3)
          el.style.setProperty('--draw', String(clamp(o * 1.4)))
          if (a.counter) {
            const k = easeInOutCubic(range(u, a.from, a.from + (a.to - a.from) * 0.8))
            const n = a.counter.from + (a.counter.to - a.counter.from) * k
            const txt = a.text.replace(
              '{n}',
              n.toLocaleString('en-IN', { maximumFractionDigits: a.counter.decimals ?? 0, minimumFractionDigits: a.counter.decimals ?? 0 }) +
                (k >= 0.999 ? (a.counter.suffix ?? '') : ''),
            )
            const lab = labels.current[i]
            // update only the first text node so an optional <small class="sub"> survives
            const node = lab?.firstChild
            if (node && node.nodeType === Node.TEXT_NODE && node.nodeValue !== txt) node.nodeValue = txt
          }
        })
      }),
    [],
  )
  return (
    <div className="annotations" aria-hidden="true">
      {ANNOTATIONS.map((a, i) => (
        <div
          key={i}
          ref={(el) => {
            els.current[i] = el
          }}
          className={`annotation side-${a.side ?? 'right'}${a.anchor.startsWith('screen.') ? ` ${a.anchor.replace('.', '-')}` : ''}`}
        >
          {!a.anchor.startsWith('screen.') && (
            <svg className="leader" width="72" height="44" viewBox="0 0 72 44">
              <circle cx={a.side === 'left' ? 70 : 2} cy="42" r="2" />
              <path d={a.side === 'left' ? 'M 70 42 L 46 8 L 0 8' : 'M 2 42 L 26 8 L 72 8'} pathLength={1} />
            </svg>
          )}
          <span
            ref={(el) => {
              labels.current[i] = el
            }}
            className="label"
          >
            {a.text.replace('{n}', String(a.counter?.from ?? ''))}
            {a.sub && <small className="sub">{a.sub}</small>}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Threshold (phase sigil) ─────────────────────────────────────────────────
const ALL_PARTS: SigilPart[] = ['contour', 'beard', 'moustache', 'kada', 'thread', 'capsule', 'scar', 'bite', 'moon']
const FIGURE: SigilPart[] = ['contour', 'beard', 'moustache']

export function Threshold() {
  const wrap = useRef<HTMLDivElement>(null)
  const back = useRef<HTMLDivElement>(null)
  const sig = useRef<SigilHandle>(null)
  const word = useRef<WordmarkHandle>(null)
  const ranges = useRef(THRESHOLDS.map((th) => ({ th, r: sceneRange(th.scene) })))
  const jitter = useRef({ next: 0 })

  useEffect(
    () =>
      film.onAfterFrame((f) => {
        const w = wrap.current, b = back.current, s = sig.current
        if (!w || !b || !s) return
        const hit = ranges.current.find(({ th, r }) => {
          const u = f.t - r.start
          return u >= th.from && u <= th.to
        })
        if (!hit) {
          if (w.style.visibility !== 'hidden') w.style.visibility = 'hidden'
          return
        }
        const { th, r } = hit
        const k = (f.t - r.start - th.from) / (th.to - th.from) // 0..1 through the threshold
        w.style.visibility = 'visible'
        w.classList.toggle('is-mini', !!th.mini)
        w.classList.toggle('is-shattered', !!th.shattered)

        // timeline: 0-.28 trace · .28-.5 ignite · .5-.74 hold · .74-1 dissolve into the scene
        const appear = smoothstep(0, 0.12, k)
        const dissolve = th.final ? 0 : smoothstep(0.74, 1, k)
        const trace = easeInOutCubic(range(k, 0.02, 0.3))
        const ignite = smoothstep(0.28, 0.42, k) * (1 - smoothstep(0.55, 0.8, k) * 0.5)
        const backAlpha = th.mini ? 0 : appear * (1 - dissolve) * 0.86
        b.style.opacity = backAlpha.toFixed(3)
        b.style.setProperty('--tint', th.backdrop)

        for (const p of ALL_PARTS) {
          const isFigure = FIGURE.includes(p)
          const lit = th.ignite.includes(p)
          const kept = th.keep.includes(p)
          if (!isFigure && !lit && !kept) {
            s.set(p, { alpha: 0, glow: 0, draw: 0 })
            continue
          }
          const draw = isFigure || kept ? trace : easeInOutCubic(range(k, 0.26, 0.4))
          const alpha = (isFigure ? 0.9 : kept ? 0.55 : 1) * appear * (1 - dissolve)
          const glow = lit ? ignite : kept ? 0.25 * smoothstep(0.3, 0.45, k) * (1 - dissolve) : 0
          s.set(p, { draw, alpha, glow })
        }
        const scale = 1 + dissolve * (th.mini ? 0.1 : 0.55)
        const root = s.root
        if (root) root.style.transform = `scale(${scale.toFixed(4)})`
        if (root) root.style.filter = dissolve > 0.01 ? `blur(${(dissolve * 8).toFixed(2)}px)` : 'none'

        // the madness: segments jitter out of place, marks flicker in the wrong order
        if (th.shattered && root) {
          if (f.clock > jitter.current.next) {
            jitter.current.next = f.clock + 0.07 + Math.random() * 0.06
            root.querySelectorAll<SVGGElement>('g[data-part]').forEach((g) => {
              const dx = (Math.random() - 0.5) * 26, dy = (Math.random() - 0.5) * 18
              g.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) rotate(${((Math.random() - 0.5) * 6).toFixed(2)}deg)`
              g.style.opacity = Math.random() > 0.25 ? '1' : '0.15'
            })
          }
        } else if (root && root.dataset.clean !== '1') {
          root.querySelectorAll<SVGGElement>('g[data-part]').forEach((g) => {
            g.style.transform = ''
            g.style.opacity = ''
          })
          root.dataset.clean = '1'
        }
        if (th.shattered && root) root.dataset.clean = '0'

        const wm = word.current
        if (wm?.root) {
          const wk = th.final ? easeInOutCubic(range(k, 0.42, 0.68)) : 0
          wm.draw(wk)
          wm.root.style.opacity = th.final ? String(1 - dissolve * 0) : '0'
        }
      }),
    [],
  )

  return (
    <div ref={wrap} className="threshold" style={{ visibility: 'hidden' }} aria-hidden="true">
      <div ref={back} className="threshold-back" />
      <div className="threshold-figure">
        <Sigil ref={sig} className="threshold-sigil" />
        <Wordmark ref={word} className="threshold-word" />
      </div>
    </div>
  )
}
