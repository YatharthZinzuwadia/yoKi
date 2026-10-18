// Render a module's canvas textures to a PNG sheet, via the dev server:
//   node tools/qa/canvas-preview.mjs pictographs
// Imports /src/gl/parts/pictographs.ts in the page and paints each texture's canvas on a stone colour.
import { chromium } from 'playwright'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1500, height: 330 } })
page.on('pageerror', (e) => console.log('pageerror', e.message))
await page.goto('http://localhost:5173/?lab=none')
await page.evaluate(async () => {
  const m = await import('/src/gl/parts/pictographs.ts')
  document.body.innerHTML = ''
  document.body.style.cssText = 'margin:0;background:#8f857a;display:flex;gap:6px;padding:6px'
  for (const p of m.PICTOGRAPHS) {
    const t = m.pictographTexture(p, 512)
    const c = t.image
    c.style.cssText = 'width:290px;height:290px;background:#a59a8c'
    document.body.appendChild(c)
  }
})
await page.waitForTimeout(300)
await page.screenshot({ path: 'tools/qa/out/pictographs.png' })
await browser.close()
console.log('ok')
