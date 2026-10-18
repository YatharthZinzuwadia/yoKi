import { useEffect, useState } from 'react'
import { initScroll } from './engine/scroll'
import { Stage } from './gl/Stage'
import { Cursor } from './ui/Cursor'
import { Debug } from './ui/Debug'
import { Loader } from './ui/Loader'
import { NavPill } from './ui/NavPill'
import { Annotations, Statements, Threshold } from './ui/Overlays'
import { AgeRuler, Charts, Marginalia } from './ui/info/Info'
import { Lab } from './lab/Lab'

const LAB = new URLSearchParams(location.search).get('lab')

function hasWebGL2() {
  try {
    return !!document.createElement('canvas').getContext('webgl2')
  } catch {
    return false
  }
}

export default function App() {
  const [gl] = useState(hasWebGL2)
  useEffect(() => {
    if (!LAB) initScroll()
  }, [])
  if (LAB) return <Lab name={LAB} />

  if (!gl)
    return (
      <div className="nogl">
        yoKi needs WebGL2 — a recent Chrome, Edge, Firefox or Safari on a desktop or laptop.
      </div>
    )

  return (
    <>
      <Stage />
      <Statements />
      <Annotations />
      <Marginalia />
      <Charts />
      <AgeRuler />
      <Threshold />
      <NavPill />
      <Loader />
      <Cursor />
      <Debug />
    </>
  )
}
