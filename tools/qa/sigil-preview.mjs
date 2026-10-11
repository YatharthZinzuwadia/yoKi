// Renders the sigil + wordmark to SVG/PNG for review: node tools/qa/sigil-preview.mjs
import { SIGIL, SIGIL_VIEWBOX, WORDMARK, WORDMARK_VIEWBOX } from '../../src/ui/sigil/paths.ts'
import { writeFileSync, mkdirSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
const out = fileURLToPath(new URL('./out/', import.meta.url))
mkdirSync(out, { recursive: true })
const colors = { contour: '#ede6d6', kada: '#cfd8e0', thread: '#ff8c1a', capsule: '#ff8c1a', scar: '#ff3b3b', bite: '#ff2e4d', moustache: '#ffd27a', beard: '#ede6d6', moon: '#bfe3e8' }
const g = Object.entries(SIGIL).map(([k, ps]) => ps.map((d) => `<path d="${d}" fill="none" stroke="${colors[k]}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`).join('')).join('\n')
writeFileSync(out + 'sigil.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${SIGIL_VIEWBOX}" width="800" height="960"><rect width="100%" height="100%" fill="#0a0a0c"/>${g}</svg>`)
const w = WORDMARK.map((d) => `<path d="${d}" fill="none" stroke="#ede6d6" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`).join('')
writeFileSync(out + 'wordmark.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${WORDMARK_VIEWBOX}" width="750" height="450"><rect width="100%" height="100%" fill="#0a0a0c"/>${w}</svg>`)
execSync(`rsvg-convert "${out}sigil.svg" -o "${out}sigil.png" && rsvg-convert "${out}wordmark.svg" -o "${out}wordmark.png"`)
console.log('ok', out)
