import { chromium } from 'playwright'
import { execFileSync } from 'node:child_process'
const browser = await chromium.launch({ args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=gl'], env: { ...process.env, __NV_PRIME_RENDER_OFFLOAD: '1', __GLX_VENDOR_LIBRARY_NAME: 'nvidia' } })
const page = await browser.newPage({ viewport: { width: 480, height: 270 } })
await page.goto('http://localhost:5173/?debug')
await page.waitForFunction(() => window.__yoki?.ui.getState().ready, null, { timeout: 120000 })
await page.waitForTimeout(2500)
await page.mouse.click(240, 135)
await page.waitForTimeout(1200)
const mean = async () => { await page.waitForTimeout(250); const b = await page.screenshot(); return Number(execFileSync('magick', ['png:-', '-format', '%[fx:mean]', 'info:'], { input: b }).toString()).toFixed(4) }
await page.evaluate(() => window.__yoki.seek(12.74))
const groups = await page.evaluate(() => {
  const g = {}
  window.__yoki.view.scene.traverse((o) => {
    if (!(o.isMesh || o.isPoints) || !o.visible) return
    const m = o.material
    const k = `${m.type}|r${m.roughness?.toFixed?.(2)}|m${m.metalness}|map${!!m.map}|vc${m.vertexColors}|${o.geometry.type}`
    ;(g[k] ??= []).push(o.uuid)
  })
  window.__groups = g
  return Object.fromEntries(Object.entries(g).map(([k, v]) => [k, v.length]))
})
console.log(groups)
for (const k of Object.keys(groups)) {
  await page.evaluate((k) => { const ids = new Set(window.__groups[k]); window.__yoki.view.scene.traverse((o) => { if (ids.has(o.uuid)) o.visible = false }) }, k)
  const m = await mean()
  await page.evaluate((k) => { const ids = new Set(window.__groups[k]); window.__yoki.view.scene.traverse((o) => { if (ids.has(o.uuid)) o.visible = true }) }, k)
  console.log(m, '← hiding', k)
}
await browser.close()
