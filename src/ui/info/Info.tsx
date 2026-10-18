// The infographic layer (P1-14): the age ruler, handwritten margin notes and drawn charts.
// All DOM/SVG, updated imperatively after each rendered frame (no React re-renders), and
// all scroll-scrubbed: charts draw themselves in with scroll and un-draw going back.
// Content lives in src/content/info.ts.

import { useEffect, useRef } from 'react'
import { AGE_SCALE, AGE_SPANS, CHARTS, MARGINALIA, type Chart } from '../../content/info'
import { sceneRange } from '../../content/film'
import { film, useUI } from '../../engine/director'
import { clamp, damp, easeInOutCubic, range, smoothstep } from '../../engine/math'

const fade = (u: number, from: number, to: number) => {
  const e = Math.min(0.55, (to - from) * 0.22)
  return smoothstep(from, from + e, u) * (1 - smoothstep(to - e, to, u))
}

// ── age ruler ─────────────────────────────────────────────────────────────────
const RW = 280

export function AgeRuler() {
  const root = useRef<HTMLDivElement>(null)
  const bar = useRef<SVGRectElement>(null)
  const label = useRef<HTMLSpanElement>(null)
  const ticks = useRef<SVGGElement>(null)
  const st = useRef({ a: 0, b: 14, alpha: 0, phase: 0, text: '' })

  useEffect(
    () =>
      film.onAfterFrame((f) => {
        const el = root.current
        if (!el || !bar.current || !label.current) return
        const s = st.current
        const span = AGE_SPANS.find((a) => a.scene === f.scene.id)
        const entered = useUI.getState().entered
        const target = span && entered ? 1 : 0
        s.alpha = damp(s.alpha, target, 4, f.dt)
        el.style.opacity = s.alpha.toFixed(3)
        if (s.alpha < 0.002) return
        const [lo, hi] = AGE_SCALE[f.phase] ?? [0, 15]
        if (s.phase !== f.phase) {
          s.phase = f.phase
          drawTicks(ticks.current, lo, hi)
        }
        if (span) {
          // glide the bracket from one scene's years to the next
          s.a = damp(s.a, span.from, 3.5, f.dt)
          s.b = damp(s.b, span.to, 3.5, f.dt)
          if (s.text !== span.label) {
            s.text = span.label
            label.current.textContent = span.label
          }
        }
        const x0 = ((s.a - lo) / (hi - lo)) * RW, x1 = ((s.b - lo) / (hi - lo)) * RW
        bar.current.setAttribute('x', (x0 - 3).toFixed(1))
        bar.current.setAttribute('width', Math.max(6, x1 - x0 + 6).toFixed(1))
      }),
    [],
  )

  return (
    <div ref={root} className="age-ruler" aria-hidden="true">
      <span ref={label} className="age-label" />
      <svg width={RW + 24} height="34" viewBox={`-12 -6 ${RW + 24} 34`}>
        <line x1="0" y1="10" x2={RW} y2="10" className="age-axis" />
        <g ref={ticks} />
        <rect ref={bar} y="6" height="8" rx="4" className="age-bar" />
      </svg>
    </div>
  )
}

function drawTicks(g: SVGGElement | null, lo: number, hi: number) {
  if (!g) return
  const NS = 'http://www.w3.org/2000/svg'
  g.replaceChildren()
  for (let a = lo; a <= hi; a++) {
    const x = ((a - lo) / (hi - lo || 1)) * RW
    const major = (a - lo) % 5 === 0 || a === hi
    const l = document.createElementNS(NS, 'line')
    l.setAttribute('x1', String(x))
    l.setAttribute('x2', String(x))
    l.setAttribute('y1', String(major ? 4 : 7))
    l.setAttribute('y2', '13')
    l.setAttribute('class', 'age-tick')
    g.appendChild(l)
    if (major) {
      const t = document.createElementNS(NS, 'text')
      t.setAttribute('x', String(x))
      t.setAttribute('y', '26')
      t.setAttribute('class', 'age-num')
      t.textContent = String(a)
      g.appendChild(t)
    }
  }
}

// ── margin notes ──────────────────────────────────────────────────────────────
export function Marginalia() {
  const els = useRef<(HTMLDivElement | null)[]>([])
  const last = useRef<number[]>([])
  useEffect(
    () =>
      film.onAfterFrame((f) => {
        MARGINALIA.forEach((m, i) => {
          const el = els.current[i]
          if (!el) return
          const u = f.t - sceneRange(m.scene).start
          const o = u < m.from - 0.1 || u > m.to + 0.1 ? 0 : fade(u, m.from, m.to)
          if (Math.abs((last.current[i] ?? -1) - o) < 0.003) return
          last.current[i] = o
          el.style.opacity = o.toFixed(3)
          el.style.visibility = o > 0.002 ? 'visible' : 'hidden'
          // the note "writes" in: a clip that opens left → right
          el.style.clipPath = `inset(-20% ${((1 - clamp(o * 1.6)) * 100).toFixed(1)}% -20% 0)`
        })
      }),
    [],
  )
  return (
    <div className="marginalia" aria-hidden="true">
      {MARGINALIA.map((m, i) => (
        <div
          key={i}
          ref={(el) => {
            els.current[i] = el
          }}
          className="margin-note"
          style={{ left: `${m.x}%`, top: `${m.y}%`, rotate: `${m.rot ?? 0}deg` }}
        >
          {m.text}
        </div>
      ))}
    </div>
  )
}

// ── drawn charts ──────────────────────────────────────────────────────────────
const VB = { w: 300, h: 180 }

function ChartSVG({ c }: { c: Chart }) {
  const pad = 22
  const iw = VB.w - pad * 2, ih = VB.h - 48
  if (c.kind === 'bars') {
    const bw = iw / c.data.length
    return (
      <>
        <line x1={pad} y1={ih + 14} x2={VB.w - pad} y2={ih + 14} className="chart-axis" pathLength={1} />
        {c.data.map(([l, v], i) => (
          <g key={i}>
            <rect className="chart-bar" data-v={v} x={pad + i * bw + bw * 0.22} width={bw * 0.56} y={ih + 14} height={0} />
            <text className="chart-tick" x={pad + i * bw + bw / 2} y={ih + 28}>
              {l}
            </text>
          </g>
        ))}
      </>
    )
  }
  if (c.kind === 'line') {
    const pts = c.data.map(([, v], i) => `${pad + (i / (c.data.length - 1)) * iw},${14 + (1 - v) * ih}`).join(' ')
    return (
      <>
        <line x1={pad} y1={14 + ih * 0.5} x2={VB.w - pad} y2={14 + ih * 0.5} className="chart-mid" />
        <text className="chart-tick" x={pad - 4} y={18} textAnchor="start">comfortable</text>
        <text className="chart-tick" x={pad - 4} y={ih + 12} textAnchor="start">debt</text>
        <polyline className="chart-line" points={pts} pathLength={1} />
        {c.data.map(([l], i) =>
          i % 2 === 0 ? (
            <text key={i} className="chart-tick" x={pad + (i / (c.data.length - 1)) * iw} y={ih + 28}>
              {l}
            </text>
          ) : null,
        )}
      </>
    )
  }
  // web: a centre and its spokes
  const cx = VB.w / 2, cy = VB.h / 2 + 4, R = 62
  return (
    <>
      {c.data.map(([l], i) => {
        const a = (i / c.data.length) * Math.PI * 2 - Math.PI / 2
        const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R * 0.82
        return (
          <g key={i}>
            <line className="chart-line" x1={cx} y1={cy} x2={x} y2={y} pathLength={1} />
            <text className="chart-tick web" x={cx + Math.cos(a) * (R + 14)} y={cy + Math.sin(a) * (R * 0.82 + 12) + 3} textAnchor={Math.cos(a) > 0.2 ? 'start' : Math.cos(a) < -0.2 ? 'end' : 'middle'}>
              {l}
            </text>
          </g>
        )
      })}
      <circle className="chart-node" cx={cx} cy={cy} r={13} />
      <text className="chart-centre" x={cx} y={cy + 4}>
        {c.centre}
      </text>
    </>
  )
}

export function Charts() {
  const els = useRef<(HTMLDivElement | null)[]>([])
  useEffect(
    () =>
      film.onAfterFrame((f) => {
        CHARTS.forEach((c, i) => {
          const el = els.current[i]
          if (!el) return
          const u = f.t - sceneRange(c.scene).start
          const o = u < c.from - 0.1 || u > c.to + 0.1 ? 0 : fade(u, c.from, c.to)
          el.style.opacity = o.toFixed(3)
          el.style.visibility = o > 0.002 ? 'visible' : 'hidden'
          if (o <= 0.002) return
          // draw-in over the first 40% of the window
          const d = easeInOutCubic(range(u, c.from, c.from + (c.to - c.from) * 0.4))
          el.style.setProperty('--draw', d.toFixed(3))
          if (c.kind === 'bars') {
            el.querySelectorAll<SVGRectElement>('rect.chart-bar').forEach((r, k) => {
              const v = Number(r.dataset.v) * clamp(d * 1.4 - k * 0.04)
              const ih = VB.h - 48
              r.setAttribute('height', (v * ih).toFixed(1))
              r.setAttribute('y', (ih + 14 - v * ih).toFixed(1))
            })
          }
        })
      }),
    [],
  )
  return (
    <div className="charts" aria-hidden="true">
      {CHARTS.map((c, i) => (
        <div
          key={i}
          ref={(el) => {
            els.current[i] = el
          }}
          className={`chart chart-${c.kind}`}
          style={{ left: `${c.x}%`, top: `${c.y}%`, width: `${c.w}%`, height: `${c.h}%` }}
        >
          <div className="chart-title">{c.title}</div>
          <svg viewBox={`0 0 ${VB.w} ${VB.h}`} preserveAspectRatio="xMidYMid meet">
            <ChartSVG c={c} />
          </svg>
          {c.note && <div className="chart-note">{c.note}</div>}
        </div>
      ))}
    </div>
  )
}
