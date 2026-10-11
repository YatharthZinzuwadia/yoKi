// The sigil drawn into a canvas — used for reflections in glass, ghosts, decals.

import { CanvasTexture, SRGBColorSpace } from 'three'
import { SIGIL, type SigilPart } from '../../ui/sigil/paths'

export function sigilTexture(parts: SigilPart[] = ['contour', 'beard', 'moustache'], { size = 512, stroke = 9, color = '#ffffff', blur = 0 } = {}) {
  const c = document.createElement('canvas')
  c.width = size
  c.height = Math.round(size * 1.2)
  const ctx = c.getContext('2d')!
  ctx.scale(size / 400, (size * 1.2) / 480)
  ctx.strokeStyle = color
  ctx.lineWidth = stroke
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  if (blur) ctx.filter = `blur(${blur}px)`
  for (const p of parts) for (const d of SIGIL[p]) ctx.stroke(new Path2D(d))
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  return t
}
