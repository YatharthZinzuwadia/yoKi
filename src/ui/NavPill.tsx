// The only control: a pill at the bottom that collapses to a hairline while
// you scroll and opens when you rest, hover, or reach the very start/end.

import { useEffect, useRef, useState } from 'react'
import { PHASES, PHASE_STARTS, RANGES, TOTAL } from '../content/film'
import { film, useUI } from '../engine/director'
import { jumpTo } from '../engine/scroll'
import { SIGIL, SIGIL_VIEWBOX } from './sigil/paths'

const PHASE_ENDS = PHASES.map((p) => RANGES.filter((r) => r.phase === p.index).at(-1)!.end)

export function NavPill() {
  const entered = useUI((s) => s.entered)
  const muted = useUI((s) => s.muted)
  const phase = useUI((s) => s.phase)
  const setMuted = useUI((s) => s.setMuted)
  const [open, setOpen] = useState(false)
  const hover = useRef(false)
  const fills = useRef<(HTMLSpanElement | null)[]>([])
  const bar = useRef<HTMLSpanElement>(null)

  useEffect(
    () =>
      film.onAfterFrame((f) => {
        const idle = performance.now() - f.lastInput > 1500
        const edge = f.t < 0.4 || f.t > TOTAL - 1.5
        const want = hover.current || idle || edge
        setOpen((o) => (o === want ? o : want))
        if (bar.current) bar.current.style.transform = `scaleX(${(f.t / TOTAL).toFixed(4)})`
        PHASES.forEach((_, i) => {
          const el = fills.current[i]
          if (!el) return
          const k = Math.min(1, Math.max(0, (f.t - PHASE_STARTS[i]) / (PHASE_ENDS[i] - PHASE_STARTS[i])))
          el.style.transform = `scaleX(${k.toFixed(3)})`
        })
      }),
    [],
  )

  if (!entered) return null
  return (
    <nav
      className={`navpill ${open ? 'is-open' : 'is-closed'}`}
      onPointerEnter={() => (hover.current = true)}
      onPointerLeave={() => (hover.current = false)}
      aria-label="Chapters"
    >
      <span className="navpill-bar" aria-hidden="true">
        <span ref={bar} />
        {PHASE_STARTS.slice(1).map((s, i) => (
          <i key={i} style={{ left: `${(s / TOTAL) * 100}%` }} />
        ))}
      </span>
      <div className="navpill-body">
        <button className="navpill-sigil" onClick={() => jumpTo(0)} data-cursor="from the start" aria-label="Back to the start">
          <svg viewBox={SIGIL_VIEWBOX}>
            {[...SIGIL.contour, ...SIGIL.beard, ...SIGIL.moustache].map((d, i) => (
              <path key={i} d={d} />
            ))}
          </svg>
        </button>
        <ol className="navpill-phases">
          {PHASES.map((p, i) => (
            <li key={p.id} className={phase === p.index ? 'is-current' : ''}>
              <button onClick={() => jumpTo(PHASE_STARTS[i])} data-cursor={p.name.toLowerCase()} aria-label={`${p.index}. ${p.name}`}>
                <span className="dot">
                  <span
                    ref={(el) => {
                      fills.current[i] = el
                    }}
                  />
                </span>
              </button>
            </li>
          ))}
        </ol>
        <span className="navpill-name">
          {String(phase).padStart(2, '0')} · {PHASES[phase - 1].name.toLowerCase()}
        </span>
        <button
          className={`navpill-sound ${muted ? 'is-muted' : ''}`}
          onClick={() => setMuted(!muted)}
          data-cursor={muted ? 'sound on' : 'sound off'}
          aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
          aria-pressed={!muted}
        >
          <i />
          <i />
          <i />
          <i />
        </button>
      </div>
    </nav>
  )
}
