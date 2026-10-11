// Peek: seek to a film time and screenshot with forced exposure; prints light pool + camera.
// node tools/qa/peek.mjs <t> [exposure]
import { chromium } from 'playwright'
const t = Number(process.argv[2]), ev = Number(process.argv[3] ?? 4)
const browser = await chromium.launch({ args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=gl'], env: { ...process.env, __NV_PRIME_RENDER_OFFLOAD: '1', __GLX_VENDOR_LIBRARY_NAME: 'nvidia' } })
const page = await browser.newPage({ viewport: { width: 960, height: 540 } })
await page.goto('http://localhost:5173/?debug')
await page.waitForFunction(() => window.__yoki?.ui.getState().ready, null, { timeout: 120000 })
await page.waitForTimeout(2500); await page.mouse.click(480, 270); await page.waitForFunction(() => window.__yoki?.film.intro >= 1, null, { timeout: 15000 })
await page.evaluate((t) => window.__yoki.seek(t), t); await page.waitForTimeout(600)
const info = await page.evaluate((ev) => {
  const g = window.__post.grade.uniforms.get('uExposure'); const orig = g.value
  window.__peek = setInterval(() => (g.value = orig + ev), 0)
  const c = window.__yoki.view.camera, s = window.__yoki.view.scene
  return { cam: c.position.toArray().map((v) => +v.toFixed(2)), fog: [s.fog.near, s.fog.far].map((v) => +v.toFixed(1)) }
}, ev)
await page.waitForTimeout(400)
await page.screenshot({ path: `tools/qa/out/peek-${t}.png` })
console.log(t, info)
await browser.close()
