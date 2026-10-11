// Visual QA: opens the site in Chromium, enters, seeks to film times, saves screenshots.
//   yarn shots                      → every scene's start + middle
//   yarn shots 0,1.5,3.2            → specific film times
//   URL=http://localhost:4173 yarn shots   (default: dev server on :5173)
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const OUT = fileURLToPath(new URL('./out/', import.meta.url))
mkdirSync(OUT, { recursive: true })
const URL_ = (process.env.URL || 'http://localhost:5173') + '/?debug'
const W = Number(process.env.W || 1600), H = Number(process.env.H || 900)

const browser = await chromium.launch({
  args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=gl', '--autoplay-policy=no-user-gesture-required'],
  env: { ...process.env, __NV_PRIME_RENDER_OFFLOAD: '1', __GLX_VENDOR_LIBRARY_NAME: 'nvidia', __EGL_VENDOR_LIBRARY_FILENAMES: '/usr/share/glvnd/egl_vendor.d/10_nvidia.json' },
})
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })
const errors = []
page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && errors.push(`[${m.type()}] ${m.text()}`))
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`))

const t0 = Date.now()
await page.goto(URL_, { waitUntil: 'domcontentloaded' })
const gpu = await page.evaluate(() => {
  const gl = document.createElement('canvas').getContext('webgl2')
  const ext = gl && gl.getExtension('WEBGL_debug_renderer_info')
  return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown'
})
console.log('renderer:', gpu)
if (process.env.LOADER) {
  await page.waitForTimeout(Number(process.env.LOADER))
  await page.screenshot({ path: `${OUT}loader.png` })
}
await page.waitForFunction(() => window.__yoki?.ui.getState().ready, null, { timeout: 180000 })
console.log('ready in', ((Date.now() - t0) / 1000).toFixed(1), 's')
await page.waitForTimeout(2600)
await page.screenshot({ path: `${OUT}loader-ready.png` })
await page.mouse.click(W / 2, H / 2)
await page.waitForFunction(() => window.__yoki?.film.intro >= 1, null, { timeout: 15000 })
await page.waitForTimeout(2200)

let times = process.argv[2]?.split(',').map(Number)
if (!times) {
  const ranges = await page.evaluate(() => window.__yoki.film.total)
  times = Array.from({ length: Math.ceil(ranges / 3) }, (_, i) => i * 3)
}
for (const t of times) {
  await page.evaluate((t) => window.__yoki.seek(t), t)
  await page.waitForTimeout(Number(process.env.WAIT || 900))
  const info = await page.evaluate(() => {
    const f = window.__yoki.film
    return `${f.scene.id} u=${(f.t - f.scene.start).toFixed(2)}`
  })
  const name = `t${String(t.toFixed(2)).padStart(6, '0')}`
  await page.screenshot({ path: `${OUT}${name}.png` })
  console.log(name, info)
}
const fps = await page.evaluate(
  () =>
    new Promise((res) => {
      let n = 0
      const s = performance.now()
      const f = () => (++n < 120 ? requestAnimationFrame(f) : res((n / (performance.now() - s)) * 1000))
      requestAnimationFrame(f)
    }),
)
console.log('fps (headless, indicative):', fps.toFixed(1))
if (errors.length) console.log('console:\n' + [...new Set(errors)].slice(0, 30).join('\n'))
await browser.close()
