// Print console errors and readiness while loading: node tools/qa/console.mjs
import { chromium } from 'playwright'
const browser = await chromium.launch({ args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=gl'], env: { ...process.env, __NV_PRIME_RENDER_OFFLOAD: '1', __GLX_VENDOR_LIBRARY_NAME: 'nvidia' } })
const page = await browser.newPage()
page.on('console', (m) => ['error', 'warning'].includes(m.type()) && console.log(`[${m.type()}]`, m.text().slice(0, 300)))
page.on('pageerror', (e) => console.log('[pageerror]', e.message.slice(0, 300)))
await page.goto('http://localhost:5173/?debug')
for (let i = 0; i < 20; i++) {
  await page.waitForTimeout(1000)
  const s = await page.evaluate(() => window.__yoki ? JSON.stringify({ p: window.__yoki.ui.getState().progress, r: window.__yoki.ui.getState().ready }) : 'no hook')
  if (i % 4 === 0 || s.includes('true')) console.log(i, s)
  if (s.includes('"r":true')) break
}
await browser.close()
