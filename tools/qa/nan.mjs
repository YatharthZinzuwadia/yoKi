// Find NaN/black sources: hide meshes one at a time, measure screenshot brightness.
import { chromium } from 'playwright'
import { execFileSync } from 'node:child_process'
const browser = await chromium.launch({ args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=gl'], env: { ...process.env, __NV_PRIME_RENDER_OFFLOAD: '1', __GLX_VENDOR_LIBRARY_NAME: 'nvidia' } })
const page = await browser.newPage({ viewport: { width: 480, height: 270 } })
await page.goto('http://localhost:5173/?debug')
await page.waitForFunction(() => window.__yoki?.ui.getState().ready, null, { timeout: 120000 })
await page.waitForTimeout(2500)
await page.mouse.click(240, 135)
await page.waitForTimeout(1200)
const t = Number(process.argv[2] || 18.7)
await page.evaluate((t) => window.__yoki.seek(t), t)
await page.waitForTimeout(600)
const mean = async () => { await page.waitForTimeout(200); const b = await page.screenshot(); return Number(execFileSync('magick', ['png:-', '-format', '%[fx:mean]', 'info:'], { input: b }).toString()) }
const names = await page.evaluate(() => {
  const list = []; window.__nanList = []
  window.__yoki.view.scene.traverse((o) => { if (o.isMesh || o.isPoints) { let p = o, vis = true; while (p) { if (!p.visible) vis = false; p = p.parent } if (vis) { window.__nanList.push(o); list.push(`${o.type}:${o.material?.type}:${o.geometry?.type}`) } } })
  return list
})
const base = await mean()
console.log('base', base.toFixed(4), 'meshes', names.length)
for (let i = 0; i < names.length; i++) {
  await page.evaluate((i) => { window.__nanList[i].visible = false }, i)
  const m = await mean()
  await page.evaluate((i) => { window.__nanList[i].visible = true }, i)
  if (m > base + 0.01) console.log('FIX when hidden →', i, names[i], m.toFixed(4))
}
await browser.close()
