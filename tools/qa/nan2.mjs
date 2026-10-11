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
console.log('12.74 base (veil white=1):', await mean())
await page.evaluate(() => { window.__h = []; window.__yoki.view.scene.traverse((o) => { if ((o.isMesh || o.isPoints) && o.visible) { o.visible = false; window.__h.push(o) } }) })
console.log('12.74 all meshes hidden:', await mean())
await page.evaluate(() => window.__h.forEach((o) => (o.visible = true)))
for (const eff of ['paint', 'bloom']) {
  await page.evaluate((e) => { window.__post[e].blendMode.opacity.value = 0 }, eff)
  console.log(eff, 'opacity 0:', await mean())
  await page.evaluate((e) => { window.__post[e].blendMode.opacity.value = 1 }, eff)
}
for (const pass of []) {
  await page.evaluate((i) => { window.__post.composer.passes[i].enabled = false }, pass)
  console.log('pass', pass, 'disabled:', await mean())
  await page.evaluate((i) => { window.__post.composer.passes[i].enabled = true }, pass)
}
await browser.close()
