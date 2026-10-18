// P1-09 — the almirah. A tall glass-fronted teak cabinet in the gallery, the kind every
// Indian living room keeps the children's prizes in: medals hanging on their ribbons,
// trophies, framed certificates, shields. It is physical: medals swing as pendulums,
// trophies wobble, certificates rock, the glass doors rattle — kicked by every camera flash
// and by your footsteps as you pass.
//
// HOW (learning notes): each moving thing is a tiny damped spring, integrated per frame:
//     v += (−k·a − c·v + impulse) · dt ;  a += v · dt
// `k` sets how fast it swings, `c` how fast it settles. A flash or a footfall adds an
// impulse; the springs do the rest. No physics engine needed for this.

import { useMemo } from 'react'
import { BoxGeometry as BoxGeom, CanvasTexture, CylinderGeometry, DoubleSide, Group, LatheGeometry, Mesh, PlaneGeometry, SRGBColorSpace, Vector2, Vector3, type Material } from 'three'
import type { SceneRange } from '../../content/film'
import { setAnchor, view } from '../../engine/anchors'
import { film } from '../../engine/director'
import { sceneLights } from '../../engine/fx'
import { rng, smoothstep } from '../../engine/math'
import { painted, triSet } from '../../gl/materials/painted'
import { useSceneFrame } from '../SceneRoot'
import { GALLERY } from './world'

/** Set by the gallery when a flash goes off (scene-local u of the last kick, and strength). */
export const cabinetKick = { at: -99, strength: 0 }

export const CABINET = { z: -112.95, x: GALLERY.halfW, w: 3.6, h: 4.0, d: 0.65 }

interface Spring {
  obj: Group
  a: number
  v: number
  k: number
  c: number
  axis: 'x' | 'z'
  gain: number
}

function certificateTexture(title: string, line: string, seed: number) {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 380
  const ctx = c.getContext('2d')!
  const r = rng(seed)
  ctx.fillStyle = '#efe7d2'
  ctx.fillRect(0, 0, 512, 380)
  ctx.strokeStyle = '#a4823c'
  ctx.lineWidth = 10
  ctx.strokeRect(18, 18, 476, 344)
  ctx.lineWidth = 2
  ctx.strokeRect(34, 34, 444, 312)
  ctx.fillStyle = '#5b2a16'
  ctx.textAlign = 'center'
  ctx.font = '600 34px "Fraunces Variable", serif'
  ctx.fillText(title, 256, 110)
  ctx.font = 'italic 22px "Fraunces Variable", serif'
  ctx.fillStyle = '#333'
  ctx.fillText('awarded to', 256, 160)
  ctx.font = 'italic 34px "Fraunces Variable", serif'
  ctx.fillText('Yatharth Z.', 256, 205)
  ctx.font = '500 18px "IBM Plex Mono", monospace'
  ctx.fillText(line, 256, 255)
  ctx.strokeStyle = '#1b3a8a'
  ctx.beginPath()
  ctx.moveTo(300, 315)
  for (let i = 0; i < 10; i++) ctx.lineTo(300 + i * 14, 315 + (r() - 0.5) * 12)
  ctx.stroke()
  ctx.fillStyle = 'rgba(180, 30, 30, 0.85)'
  ctx.beginPath()
  ctx.arc(110, 300, 30, 0, Math.PI * 2)
  ctx.fill()
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  return t
}

const CERTS: [string, string][] = [
  ['Certificate of Merit', 'spelling bee · 1st · inter-school'],
  ['Gold Medal', 'olympiad · mathematics'],
  ['Best Speaker', 'debate · model united nations'],
  ['First Prize', 'elocution · gujarati'],
  ['Certificate', 'basketball · national level'],
  ['Merit', 'annual day · dance'],
]

export function Cabinet({ range: r }: { range: SceneRange }) {
  const built = useMemo(() => {
    const wood = painted({ color: '#5e3a22', roughness: 0.45, tri: { set: triSet('wood049'), scale: 1.1, normal: 0.7, rough: 0.4, tint: [1.25, 1.12, 1.0] }, rim: [1, 0.8, 0.6, 0.15] })
    // metals use the painted material too, so flashes and the cabinet light reach them
    const gold = painted({ color: '#d7a640', metalness: 0.6, roughness: 0.28, rim: [1, 0.85, 0.5, 0.35] })
    const silver = painted({ color: '#c4c8cc', metalness: 0.6, roughness: 0.25, rim: [0.9, 0.95, 1, 0.3] })
    const bronze = painted({ color: '#a8673a', metalness: 0.6, roughness: 0.35, rim: [1, 0.75, 0.5, 0.3] })
    const glass = painted({ color: '#a9bcc6', roughness: 0.05, transparent: true, opacity: 0.1, depthWrite: false })
    const ribbonMats = ['#b3202a', '#1f3f8a', '#e0b52b', '#1d6b3a'].map((c) => painted({ color: c, roughness: 0.7, side: DoubleSide }))

    const root = new Group()
    root.position.set(CABINET.x - CABINET.d / 2, 0, CABINET.z)
    root.rotation.y = -Math.PI / 2 // local +z faces into the hall (−x)
    const W = CABINET.w, H = CABINET.h, D = CABINET.d
    const B = (w: number, h: number, d: number, x: number, y: number, z: number, m: Material = wood) => {
      const mesh = new Mesh(new BoxGeom(w, h, d), m)
      mesh.position.set(x, y, z)
      mesh.castShadow = mesh.receiveShadow = true
      root.add(mesh)
      return mesh
    }
    // carcass: back, sides, top + crown, plinth, drawers, shelves
    B(W, H, 0.04, 0, H / 2, -D / 2 + 0.02)
    B(0.06, H, D, -W / 2 + 0.03, H / 2, 0)
    B(0.06, H, D, W / 2 - 0.03, H / 2, 0)
    B(W + 0.16, 0.08, D + 0.1, 0, H + 0.04, 0.02)
    B(W + 0.26, 0.12, D + 0.16, 0, H + 0.14, 0.03)
    B(W, 0.12, D + 0.06, 0, 0.06, 0.02)
    B(W - 0.12, 0.5, D - 0.04, 0, 0.37, 0.01)
    for (const x of [-0.85, 0.85]) {
      const knob = B(0.05, 0.05, 0.05, x, 0.4, D / 2 + 0.02, gold)
      knob.castShadow = false
    }
    const shelves = [0.66, 1.46, 2.26, 3.06]
    shelves.forEach((y) => B(W - 0.12, 0.04, D - 0.06, 0, y, 0))
    // glass doors (two leaves) — they rattle
    const doors: Group[] = []
    for (const s of [-1, 1]) {
      const g = new Group()
      g.position.set(s * (W / 2 - 0.04), 0.66, D / 2 + 0.01)
      const pane = new Mesh(new PlaneGeometry(W / 2 - 0.08, H - 0.72), glass)
      pane.position.set(-s * ((W / 2 - 0.08) / 2 + 0.02), (H - 0.72) / 2, 0)
      g.add(pane)
      const frame = new Mesh(new BoxGeom(0.04, H - 0.7, 0.04), wood)
      frame.position.set(-s * (W / 2 - 0.06), (H - 0.72) / 2, 0)
      g.add(frame)
      root.add(g)
      doors.push(g)
    }

    const springs: Spring[] = []
    const R = rng(23)
    // top: a brass rail of medals on ribbons
    const rail = new Mesh(new CylinderGeometry(0.01, 0.01, W - 0.2, 6), gold)
    rail.rotation.z = Math.PI / 2
    rail.position.set(0, 3.82, 0.05)
    root.add(rail)
    const ribbonGeo = new PlaneGeometry(0.07, 0.26)
    ribbonGeo.translate(0, -0.13, 0)
    for (let i = 0; i < 13; i++) {
      const g = new Group()
      g.position.set(-W / 2 + 0.3 + i * ((W - 0.6) / 12), 3.82, 0.06)
      const rib = new Mesh(ribbonGeo, ribbonMats[i % 4])
      g.add(rib)
      const disc = new Mesh(new CylinderGeometry(0.055, 0.055, 0.008, 20), [gold, silver, bronze][Math.floor(R() * 3)])
      disc.rotation.x = Math.PI / 2
      disc.position.set(0, -0.31, 0.004)
      g.add(disc)
      root.add(g)
      springs.push({ obj: g, a: 0, v: 0, k: 22 + R() * 10, c: 1.3, axis: 'x', gain: 0.9 + R() * 0.5 })
      springs.push({ obj: g, a: 0, v: 0, k: 20 + R() * 10, c: 1.5, axis: 'z', gain: 0.4 + R() * 0.3 })
    }
    // trophies: lathe cups on the third shelf (and two on the first)
    const cup = (h: number) => {
      const pts = [[0.0, 0], [0.07, 0], [0.07, 0.02], [0.025, 0.04], [0.02, 0.14], [0.06, 0.18], [0.09, 0.26], [0.1, 0.34], [0.095, 0.36]].map(
        ([x, y]) => new Vector2(x * h, y * h),
      )
      return new LatheGeometry(pts, 24)
    }
    const trophySpots: [number, number, number][] = [[-1.2, 2.3, 1.2], [-0.55, 2.3, 1.7], [0.15, 2.3, 1.35], [0.8, 2.3, 1.9], [1.35, 2.3, 1.1], [-1.1, 0.7, 1.4], [1.15, 0.7, 1.6]]
    trophySpots.forEach(([x, y, s], i) => {
      const g = new Group()
      g.position.set(x, y, 0)
      const m = new Mesh(cup(s), i % 3 === 2 ? silver : gold)
      m.castShadow = true
      g.add(m)
      root.add(g)
      springs.push({ obj: g, a: 0, v: 0, k: 60 + R() * 30, c: 3.5, axis: 'z', gain: 0.35 })
    })
    // certificates in frames, leaning on the second shelf
    CERTS.forEach(([title, line], i) => {
      const g = new Group()
      g.position.set(-1.45 + i * 0.58, 1.5, -0.1 + (i % 2) * 0.06)
      const frame = new Mesh(new BoxGeom(0.5, 0.38, 0.02), wood)
      frame.position.y = 0.19
      g.add(frame)
      const paper = new Mesh(new PlaneGeometry(0.44, 0.32), painted({ map: certificateTexture(title, line, 40 + i), roughness: 0.8 }))
      paper.position.set(0, 0.19, 0.011)
      g.add(paper)
      g.rotation.x = -0.18 - (i % 3) * 0.04
      root.add(g)
      springs.push({ obj: g, a: 0, v: 0, k: 45, c: 4, axis: 'z', gain: 0.18 })
    })
    // shields on the first shelf
    for (const [x, s] of [[-0.25, 1], [0.35, 0.85]] as [number, number][]) {
      const g = new Group()
      g.position.set(x, 0.7, -0.12)
      const sh = new Mesh(new BoxGeom(0.34 * s, 0.44 * s, 0.03), wood)
      sh.position.y = 0.22 * s
      g.add(sh)
      const plate = new Mesh(new BoxGeom(0.22 * s, 0.1 * s, 0.01), gold)
      plate.position.set(0, 0.16 * s, 0.02)
      g.add(plate)
      g.rotation.x = -0.12
      root.add(g)
    }
    return { root, springs, doors }
  }, [])

  const tmp = useMemo(() => ({ v: new Vector3(), lastFoot: 0, lastKick: -99 }), [])

  useSceneFrame(
    r,
    (u) => {
      const dt = Math.min(film.dt, 1 / 30)
      // impulses: a flash (from the gallery), and footfalls while you walk near it
      let impulse = 0
      if (cabinetKick.at !== tmp.lastKick && u >= cabinetKick.at && u - cabinetKick.at < 0.2) {
        tmp.lastKick = cabinetKick.at
        impulse += cabinetKick.strength
      }
      const cam = view.camera
      if (cam) {
        const d = cam.position.distanceTo(tmp.v.set(CABINET.x - 0.4, 1.6, CABINET.z))
        const walking = Math.abs(film.vel) > 0.05
        if (walking && d < 9 && film.clock - tmp.lastFoot > 0.55) {
          tmp.lastFoot = film.clock
          impulse += 0.9 * (1 - d / 9)
        }
      }
      for (const s of built.springs) {
        const kick = impulse * s.gain * (0.6 + 0.4 * Math.sin(s.k * 13.7))
        s.v += (-s.k * s.a - s.c * s.v + kick / dt) * dt
        s.a += s.v * dt
        s.obj.rotation[s.axis] = s.a
      }
      built.doors.forEach((g, i) => {
        g.rotation.y = Math.sin(film.clock * 47 + i) * 0.004 * Math.min(1, Math.abs(built.springs[0].v) * 0.6)
      })
      // the cabinet's own warm strip light behind the top rail
      const k = smoothstep(4.5, 6, u) * (1 - smoothstep(8.5, 9.2, u))
      sceneLights.push(CABINET.x - 0.9, 3.4, CABINET.z, 4.2, 1, 0.82, 0.55, 2.4 * k)
      setAnchor('p1.cabinet', CABINET.x - CABINET.d - 0.05, CABINET.h + 0.3, CABINET.z + CABINET.w / 2 - 0.2)
    },
    { before: 2 },
  )

  return <primitive object={built.root} />
}
