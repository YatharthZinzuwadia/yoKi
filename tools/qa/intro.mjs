// Film the entry transition: screenshots at fixed ms after the click → tools/qa/out/intro-*.png
import { chromium } from 'playwright'
const browser = await chromium.launch({ args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=gl', '--autoplay-policy=no-user-gesture-required'], env: { ...process.env, __NV_PRIME_RENDER_OFFLOAD: '1', __GLX_VENDOR_LIBRARY_NAME: 'nvidia' } })
const page = await browser.newPage({ viewport: { width: 960, height: 540 } })
page.on('pageerror', (e) => console.log('[pageerror]', e.message))
await page.goto('http://localhost:5173/')
await page.waitForFunction(() => document.querySelector('.loader.is-waiting'), null, { timeout: 120000 })
await page.mouse.click(480, 270)
const t0 = Date.now()
for (const ms of [150, 600, 1100, 1600, 2100, 2600, 3200]) {
  await page.waitForTimeout(Math.max(0, ms - (Date.now() - t0)))
  await page.screenshot({ path: `tools/qa/out/intro-${String(ms).padStart(4, '0')}.png` })
}
console.log('ok')
await browser.close()
