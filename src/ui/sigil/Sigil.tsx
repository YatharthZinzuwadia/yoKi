// The sigil and wordmark as SVG, driven imperatively (no React re-render per frame).
// Every path uses pathLength=1 so "draw progress" is just a dash offset.

import { forwardRef, useImperativeHandle, useRef } from 'react'
import { SIGIL, SIGIL_VIEWBOX, WORDMARK, WORDMARK_VIEWBOX, type SigilPart } from './paths'

export const PART_COLOR: Record<SigilPart, string> = {
  contour: '#ede6d6',
  kada: '#e6eef5',
  thread: '#ff8c1a',
  capsule: '#ffb35c',
  scar: '#ff4040',
  bite: '#ff2e4d',
  moustache: '#ffe2a8',
  beard: '#ede6d6',
  moon: '#bfe3e8',
}

const ORDER: SigilPart[] = ['contour', 'beard', 'moustache', 'kada', 'thread', 'capsule', 'scar', 'bite', 'moon']

export interface PartState {
  /** 0..1 how much of the stroke is drawn. */
  draw: number
  /** 0..1 glow/ignition. */
  glow: number
  /** 0..1 overall opacity. */
  alpha: number
}

export interface SigilHandle {
  set(part: SigilPart, s: Partial<PartState>): void
  root: SVGSVGElement | null
}

function setPaths(group: SVGGElement | null, draw: number) {
  if (!group) return
  const paths = group.querySelectorAll('path')
  const n = paths.length
  // strokes inside a part are drawn one after another
  paths.forEach((p, i) => {
    const local = Math.min(1, Math.max(0, draw * n - i))
    p.style.strokeDashoffset = String(1 - local)
  })
}

export const Sigil = forwardRef<SigilHandle, { className?: string; stroke?: number }>(function Sigil(
  { className, stroke = 2.4 },
  ref,
) {
  const root = useRef<SVGSVGElement>(null)
  const base = useRef<Partial<Record<SigilPart, SVGGElement | null>>>({})
  const glow = useRef<Partial<Record<SigilPart, SVGGElement | null>>>({})
  const state = useRef<Record<string, PartState>>({})

  useImperativeHandle(ref, () => ({
    root: root.current,
    set(part, s) {
      const cur = (state.current[part] ??= { draw: 0, glow: 0, alpha: 0 })
      if (s.draw !== undefined && s.draw !== cur.draw) {
        cur.draw = s.draw
        setPaths(base.current[part] ?? null, s.draw)
        setPaths(glow.current[part] ?? null, s.draw)
      }
      if (s.alpha !== undefined && s.alpha !== cur.alpha) {
        cur.alpha = s.alpha
        const b = base.current[part]
        if (b) b.style.opacity = String(s.alpha)
      }
      if (s.glow !== undefined && s.glow !== cur.glow) {
        cur.glow = s.glow
        const g = glow.current[part]
        if (g) g.style.opacity = String(s.glow * (cur.alpha || 1))
      }
    },
  }))

  const dashed = { strokeDasharray: 1, strokeDashoffset: 1 } as const
  return (
    <svg ref={root} className={className} viewBox={SIGIL_VIEWBOX} aria-hidden="true">
      <defs>
        <filter id="sigil-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {ORDER.map((part) => (
        <g key={part} data-part={part}>
          <g
            ref={(el) => {
              glow.current[part] = el
            }}
            filter="url(#sigil-glow)"
            style={{ opacity: 0 }}
            stroke={PART_COLOR[part]}
            strokeWidth={stroke * 1.6}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {SIGIL[part].map((d, i) => (
              <path key={i} d={d} pathLength={1} style={dashed} />
            ))}
          </g>
          <g
            ref={(el) => {
              base.current[part] = el
            }}
            style={{ opacity: 0 }}
            stroke={part === 'contour' || part === 'beard' || part === 'moustache' ? PART_COLOR.contour : PART_COLOR[part]}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {SIGIL[part].map((d, i) => (
              <path key={i} d={d} pathLength={1} style={dashed} />
            ))}
          </g>
        </g>
      ))}
    </svg>
  )
})

export interface WordmarkHandle {
  draw(p: number): void
  root: SVGSVGElement | null
}

export const Wordmark = forwardRef<WordmarkHandle, { className?: string; stroke?: number; color?: string }>(
  function Wordmark({ className, stroke = 3.2, color = '#ede6d6' }, ref) {
    const root = useRef<SVGSVGElement>(null)
    const g = useRef<SVGGElement>(null)
    useImperativeHandle(ref, () => ({
      root: root.current,
      draw(p) {
        setPaths(g.current, p)
      },
    }))
    return (
      <svg ref={root} className={className} viewBox={WORDMARK_VIEWBOX} aria-label="yoKi" role="img">
        <g ref={g} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeLinejoin="round">
          {WORDMARK.map((d, i) => (
            <path key={i} d={d} pathLength={1} style={{ strokeDasharray: 1, strokeDashoffset: 1 }} />
          ))}
        </g>
      </svg>
    )
  },
)

export { ORDER as SIGIL_ORDER }
