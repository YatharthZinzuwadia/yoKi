// Print bone-local child offsets of a rigged .glb (does local +Y run along each bone?)
// node tools/qa/bones.mjs public/models/arm-adult.glb
import { readFileSync } from 'node:fs'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
const buf = readFileSync(process.argv[2])
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
new GLTFLoader().parse(ab, '', (g) => {
  const want = ['upperarm_r', 'lowerarm_r', 'hand_r', 'index_01_r', 'index_02_r', 'thumb_01_r', 'thumb_02_r']
  g.scene.traverse((o) => {
    if (o.isBone && want.includes(o.name)) {
      const kids = o.children.filter((c) => c.isBone).map((c) => `${c.name}(${c.position.toArray().map((v) => v.toFixed(3)).join(',')})`)
      console.log(o.name.padEnd(12), kids.join('  '))
    }
  })
}, (e) => console.error(e))
