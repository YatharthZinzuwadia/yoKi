// Image textures for photographs/drawings inside the film. Each image has a
// procedural fallback, so a missing file never blocks or breaks the take.
// Drop real/generated files into public/images/<name>.webp to replace.

import { use } from 'react'
import { CanvasTexture, SRGBColorSpace, Texture, TextureLoader, LinearMipmapLinearFilter } from 'three'
import { rng } from '../../engine/math'

type Fallback = (ctx: CanvasRenderingContext2D, w: number, h: number) => void

const cache = new Map<string, Promise<Texture>>()
const loader = new TextureLoader()

function finish(t: Texture) {
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 8
  t.minFilter = LinearMipmapLinearFilter
  t.needsUpdate = true
  return t
}

export function fallbackTexture(draw: Fallback, w = 768, h = 1024) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  draw(c.getContext('2d')!, w, h)
  return finish(new CanvasTexture(c))
}

/** Suspends until the image (or its fallback) is ready. */
export function useImage(name: string, fallback: Fallback, size: [number, number] = [768, 1024]): Texture {
  let p = cache.get(name)
  if (!p) {
    p = new Promise<Texture>((resolve) => {
      loader.load(
        `${import.meta.env.BASE_URL}images/${name}.webp`,
        (t) => resolve(finish(t)),
        undefined,
        () => resolve(fallbackTexture(fallback, size[0], size[1])),
      )
    })
    cache.set(name, p)
  }
  return use(p)
}

// ── procedural fallbacks ─────────────────────────────────────────────────────

/** A sepia studio photograph: soft vignette, grain, a figure silhouette. */
export const sepiaPortrait =
  (seed = 1, figure: 'child' | 'teen' | 'stage' | 'object' = 'child'): Fallback =>
  (ctx, w, h) => {
    const r = rng(seed)
    const g = ctx.createRadialGradient(w * 0.5, h * 0.42, w * 0.05, w * 0.5, h * 0.5, w * 0.8)
    g.addColorStop(0, '#d9c09a')
    g.addColorStop(0.55, '#a07e57')
    g.addColorStop(1, '#3b2a1c')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = 'rgba(40,26,16,0.82)'
    ctx.beginPath()
    if (figure === 'object') {
      ctx.ellipse(w * 0.5, h * 0.5, w * 0.16, w * 0.16, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillRect(w * 0.47, h * 0.18, w * 0.06, h * 0.25)
    } else {
      const s = figure === 'child' ? 0.85 : figure === 'stage' ? 0.55 : 1
      const cx = w * 0.5, cy = h * (figure === 'stage' ? 0.55 : 0.42)
      ctx.ellipse(cx, cy, w * 0.15 * s, w * 0.18 * s, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(cx - w * 0.4 * s, h)
      ctx.quadraticCurveTo(cx - w * 0.34 * s, cy + w * 0.2 * s, cx, cy + w * 0.2 * s)
      ctx.quadraticCurveTo(cx + w * 0.34 * s, cy + w * 0.2 * s, cx + w * 0.4 * s, h)
      ctx.fill()
      if (figure !== 'stage') {
        // the smile
        ctx.strokeStyle = 'rgba(240,226,200,0.85)'
        ctx.lineWidth = w * 0.012
        ctx.beginPath()
        ctx.arc(cx, cy + w * 0.02 * s, w * 0.07 * s, 0.15 * Math.PI, 0.85 * Math.PI)
        ctx.stroke()
      }
    }
    // grain + dust
    const id = ctx.getImageData(0, 0, w, h)
    for (let i = 0; i < id.data.length; i += 4) {
      const n = (r() - 0.5) * 34
      id.data[i] += n
      id.data[i + 1] += n
      id.data[i + 2] += n
    }
    ctx.putImageData(id, 0, 0)
    ctx.fillStyle = 'rgba(255,240,220,0.5)'
    for (let i = 0; i < 90; i++) ctx.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2)
  }
