// Record how an external site's loader + logo behave: node tools/qa/site-peek.mjs <url> <outprefix>
import { chromium } from 'playwright'
const [url, prefix = 'site'] = process.argv.slice(2)
const browser = await chromium.launch({ args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=gl'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 810 } })
const t0 = Date.now()
page.goto(url, { waitUntil: 'commit' }).catch(() => {})
for (const ms of [300, 700, 1200, 1800, 2600, 3600, 5000]) {
  await page.waitForTimeout(ms - (Date.now() - t0) > 0 ? ms - (Date.now() - t0) : 0)
  await page.screenshot({ path: `tools/qa/out/${prefix}-${String(ms).padStart(4, '0')}.png` }).catch(() => {})
}
await page.mouse.wheel(0, 900); await page.waitForTimeout(900)
await page.screenshot({ path: `tools/qa/out/${prefix}-scrolled.png` })
await browser.close()
