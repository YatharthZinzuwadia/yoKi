// Paper props of a 1990s photo studio, drawn in <canvas> from the generated photographs:
// contact sheets (a roll of 36 printed as a grid, with a grease-pencil circle around the
// chosen frame), negative strips (colours inverted on orange film base), polaroids with
// handwritten captions, and the model-release form on a clipboard.
//
// HOW: canvas 2D draws each image cropped into its cell (`drawImage` with source rect),
// then a few compositing tricks: 'difference' with white inverts a frame into a negative;
// a multiply with orange gives the film base; text uses the same fonts as the site.

import { CanvasTexture, SRGBColorSpace, type Texture } from 'three'
import { rng } from '../../engine/math'

type Img = CanvasImageSource & { width: number; height: number }

const imgOf = (t: Texture) => t.image as Img

function finish(c: HTMLCanvasElement) {
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 8
  return t
}

/** Draw `img` into a box, cropped to fill (like CSS object-fit: cover). */
function cover(ctx: CanvasRenderingContext2D, img: Img, x: number, y: number, w: number, h: number, zoom = 1, ox = 0.5, oy = 0.42) {
  const s = Math.max(w / img.width, h / img.height) * zoom
  const sw = w / s, sh = h / s
  const sx = Math.min(img.width - sw, Math.max(0, img.width * ox - sw / 2))
  const sy = Math.min(img.height - sh, Math.max(0, img.height * oy - sh / 2))
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h)
}

function scribble(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, r: () => number) {
  ctx.beginPath()
  ctx.moveTo(x, y)
  for (let i = 1; i <= 14; i++) ctx.lineTo(x + (w * i) / 14, y + (r() - 0.5) * 14 - Math.sin(i * 1.3) * 5)
  ctx.stroke()
}

/** A contact sheet: 4 × 5 frames from a roll, frame numbers, one circled, rejects crossed. */
export function contactSheetTexture(photos: Texture[], seed: number, circled = 13) {
  const W = 1024, H = 1300
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')!
  const r = rng(seed)
  ctx.fillStyle = '#efe9dd'
  ctx.fillRect(0, 0, W, H)
  const cols = 4, rows = 5, pad = 46, gap = 18
  const fw = (W - pad * 2 - gap * (cols - 1)) / cols
  const fh = fw * 1.18
  ctx.font = '600 15px "IBM Plex Mono", monospace'
  for (let row = 0; row < rows; row++) {
    // the film strip behind each row, with sprocket holes
    const y0 = pad + row * (fh + 46)
    ctx.fillStyle = '#16120f'
    ctx.fillRect(pad - 12, y0 - 18, W - pad * 2 + 24, fh + 36)
    ctx.fillStyle = '#efe9dd'
    for (let x = pad; x < W - pad; x += 24) {
      ctx.fillRect(x, y0 - 13, 11, 7)
      ctx.fillRect(x, y0 + fh + 6, 11, 7)
    }
    for (let col = 0; col < cols; col++) {
      const i = row * cols + col
      const x = pad + col * (fw + gap)
      const img = imgOf(photos[i % photos.length])
      ctx.save()
      ctx.filter = `grayscale(${0.55 + r() * 0.3}) sepia(0.35) brightness(${0.8 + r() * 0.35}) contrast(1.1)`
      cover(ctx, img, x, y0, fw, fh, 1 + r() * 0.35, 0.45 + r() * 0.1, 0.35 + r() * 0.15)
      ctx.restore()
      ctx.fillStyle = '#d8792f'
      ctx.fillText(`${i + 1}${r() > 0.6 ? 'A' : ''}`, x + 4, y0 + fh + 30)
      ctx.strokeStyle = 'rgba(190, 20, 20, 0.9)'
      ctx.lineWidth = 5
      if (i === circled) {
        // the grease-pencil circle: the frame they chose
        ctx.beginPath()
        ctx.ellipse(x + fw / 2, y0 + fh / 2, fw * 0.62, fh * 0.6, -0.08, 0, Math.PI * 2)
        ctx.stroke()
      } else if (r() > 0.72) {
        ctx.lineWidth = 3.5
        ctx.beginPath()
        ctx.moveTo(x + 8, y0 + 8)
        ctx.lineTo(x + fw - 8, y0 + fh - 8)
        ctx.moveTo(x + fw - 8, y0 + 8)
        ctx.lineTo(x + 8, y0 + fh - 8)
        ctx.stroke()
      }
    }
  }
  ctx.fillStyle = '#5a5148'
  ctx.font = '600 18px "IBM Plex Mono", monospace'
  ctx.fillText(`ROLL ${seed % 9 + 3} · KODAK 400 · STUDIO SESSION`, pad, H - 22)
  return finish(c)
}

/** A strip of four negatives: colours inverted on orange base, with edge printing. */
export function negativeStripTexture(photos: Texture[], seed: number) {
  const W = 256, H = 1100
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')!
  const r = rng(seed)
  ctx.fillStyle = '#b55a1e'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#2a1306'
  for (let y = 10; y < H; y += 30) {
    ctx.fillRect(10, y, 16, 12)
    ctx.fillRect(W - 26, y, 16, 12)
  }
  for (let k = 0; k < 4; k++) {
    const y = 30 + k * 265
    ctx.save()
    ctx.filter = 'grayscale(1) contrast(1.2)'
    cover(ctx, imgOf(photos[(k + seed) % photos.length]), 38, y, W - 76, 235, 1 + r() * 0.3)
    ctx.restore()
    // invert, then tint orange: what a colour negative looks like held to the light
    ctx.globalCompositeOperation = 'difference'
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(38, y, W - 76, 235)
    ctx.globalCompositeOperation = 'multiply'
    ctx.fillStyle = '#e08a3c'
    ctx.fillRect(38, y, W - 76, 235)
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = '#f2c38f'
    ctx.font = '600 14px "IBM Plex Mono", monospace'
    ctx.fillText(`${12 + k + seed}`, 40, y + 252)
  }
  return finish(c)
}

/** A polaroid: white border, a square crop, a caption in pen. */
export function polaroidTexture(photo: Texture, caption: string, seed: number) {
  const W = 512, H = 610
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')!
  const r = rng(seed)
  ctx.fillStyle = '#f4f0e6'
  ctx.fillRect(0, 0, W, H)
  ctx.save()
  ctx.filter = `saturate(${0.7 + r() * 0.3}) brightness(${0.95 + r() * 0.2}) sepia(0.2)`
  cover(ctx, imgOf(photo), 32, 32, W - 64, W - 64, 1.1 + r() * 0.4, 0.5, 0.35)
  ctx.restore()
  ctx.fillStyle = '#26303a'
  ctx.font = 'italic 34px "Fraunces Variable", serif'
  ctx.fillText(caption, 40, H - 32)
  return finish(c)
}

/** The model-release form clipped to a board. */
export function releaseFormTexture() {
  const W = 600, H = 820
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')!
  const r = rng(77)
  ctx.fillStyle = '#ece6d8'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#1d1d1f'
  ctx.font = '700 34px "IBM Plex Mono", monospace'
  ctx.fillText('MODEL RELEASE', 46, 92)
  ctx.font = '500 18px "IBM Plex Mono", monospace'
  const lines = ['Name of model:', 'Age:            9', 'Status:         MINOR', 'Shoot:          portfolio · studio', 'Fee:', 'Signed by:      guardian', 'Date:']
  lines.forEach((l, i) => {
    ctx.fillText(l, 46, 170 + i * 74)
    ctx.fillRect(46, 182 + i * 74, W - 92, 1.5)
  })
  ctx.fillStyle = '#1d1d1f'
  ctx.fillRect(250, 170 + 4 * 74 - 18, 120, 22) // the fee, redacted
  ctx.strokeStyle = '#1b3a8a'
  ctx.lineWidth = 3
  scribble(ctx, 250, 170 + 5 * 74 - 8, 230, r)
  ctx.font = 'italic 30px "Fraunces Variable", serif'
  ctx.fillStyle = '#1b3a8a'
  ctx.fillText('Y. Z.', 260, 170 - 4)
  return finish(c)
}
