// Probe camera + scene state at film times: node tools/qa/probe.mjs 18.7
import { chromium } from 'playwright'
const browser = await chromium.launch({ args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=gl'], env: { ...process.env, __NV_PRIME_RENDER_OFFLOAD: '1', __GLX_VENDOR_LIBRARY_NAME: 'nvidia' } })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
page.on('pageerror', (e) => console.log('pageerror', e.message))
await page.goto('http://localhost:5173/?debug')
await page.waitForFunction(() => window.__yoki?.ui.getState().ready, null, { timeout: 120000 })
await page.waitForTimeout(2500)
await page.mouse.click(640, 360)
await page.waitForTimeout(1500)
for (const t of process.argv.slice(2).map(Number)) {
  await page.evaluate((t) => window.__yoki.seek(t), t)
  await page.waitForTimeout(400)
  console.log(t, await page.evaluate(() => {
    const c = window.__yoki.view.camera
    const sc = c.parent || c
    const root = window.__yoki.view.scene
    const vis = []
    root.traverse((o) => { if (o.type === 'Group' && o.visible && o.parent === root) vis.push(o.children.length) })
    const eyes = []
    root.traverse((o) => { if (o.isInstancedMesh && o.count === 260) eyes.push(o) })
    const chain = []
    let e = eyes[0]; while (e) { chain.push(`${e.type}:${e.visible}`); e = e.parent }
    const mats = eyes[0] ? eyes[0].material.uniforms.uLight.value : null
    const g = window.__post.grade.uniforms
    const gu = {}; for (const [k, v] of g) if (typeof v.value === 'number') gu[k] = +v.value.toFixed(3)
    return { grade: JSON.stringify(gu), chain: chain.join(' > '), uLight: mats, pos: c.position.toArray().map((v) => +v.toFixed(2)), dir: c.getWorldDirection(c.position.clone()).toArray().map((v) => +v.toFixed(2)), near: c.near, far: c.far, fov: c.fov.toFixed(1), visibleRoots: vis.length, scene: window.__yoki.film.scene.id }
  }))
}
await browser.close()
