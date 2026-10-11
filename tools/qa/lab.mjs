// Screenshot a lab bench: node tools/qa/lab.mjs arm [waitMs]
import { chromium } from 'playwright'
const [name = 'arm', wait = '2500'] = process.argv.slice(2)
const browser = await chromium.launch({ args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=gl'], env: { ...process.env, __NV_PRIME_RENDER_OFFLOAD: '1', __GLX_VENDOR_LIBRARY_NAME: 'nvidia' } })
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } })
page.on('pageerror', (e) => console.log('[pageerror]', e.message))
page.on('console', (m) => m.type() === 'error' && console.log('[error]', m.text()))
await page.goto(`http://localhost:5173/?lab=${name}`)
await page.waitForTimeout(Number(wait))
await page.screenshot({ path: `tools/qa/out/lab-${name}.png` })
console.log('ok')
await browser.close()
