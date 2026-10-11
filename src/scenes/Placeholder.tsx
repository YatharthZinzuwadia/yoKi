// Stand-in for scenes not built yet: a dark stage with the line of light and a
// storyboard card naming the scene, so the whole take is always traversable.

import { Text } from '@react-three/drei'
import { useMemo, useRef } from 'react'
import { CatmullRomCurve3, Vector3, type Mesh, type MeshBasicMaterial } from 'three'
import monoUrl from '@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff?url'
import { PHASES, type SceneRange } from '../content/film'
import { painted } from '../gl/materials/painted'
import { sceneLights } from '../engine/fx'
import { SceneRoot, useSceneFrame } from './SceneRoot'
import type { SceneSpec, V3 } from './types'

const PHASE_TINT = ['#ffcf8a', '#e9c46a', '#ff8c1a', '#f2a0a8', '#bfe3e8']

export function makePlaceholder(range: SceneRange, index: number): SceneSpec {
  const O: V3 = [4000 + index * 400, 0, 0]
  const len = range.length * 2.2
  return {
    id: range.id,
    Component: (props) => <PlaceholderScene {...props} origin={O} depth={len} />,
    camera: [
      { u: 0, pos: [O[0], 1.6, O[2] + 4], at: [O[0], 1.5, O[2] - 10], cut: true },
      { u: range.length, pos: [O[0], 1.6, O[2] + 4 - len], at: [O[0], 1.5, O[2] - 10 - len] },
    ],
    look: [
      { u: 0, veilBlack: 1, paint: 0.35, ink: 0.6, exposure: 0, saturation: 0.9, bloodLeft: 0, invert: 0, ca: 0 },
      { u: 0.45, veilBlack: 0 },
      { u: range.length - 0.45, veilBlack: 0 },
      { u: range.length, veilBlack: 1 },
    ],
    fog: { color: '#0b0b0e', near: 4, far: 34 },
  }
}

function PlaceholderScene({ range, origin, depth }: { range: SceneRange; origin: V3; depth: number }) {
  const phase = PHASES[range.phase - 1]
  const tint = PHASE_TINT[range.phase - 1]
  const lineRef = useRef<Mesh>(null)
  const curve = useMemo(
    () =>
      new CatmullRomCurve3(
        Array.from({ length: 8 }, (_, i) => {
          const z = 4 - (i / 7) * (depth + 16)
          return new Vector3(origin[0] + Math.sin(i * 1.3) * 0.25, 0.01, origin[2] + z)
        }),
      ),
    [origin, depth],
  )
  const floorMat = useMemo(() => painted({ color: '#141418', roughness: 0.95 }), [])
  const pillarMat = useMemo(() => painted({ color: '#1d1c22', roughness: 0.8, bands: 0.15 }), [])

  useSceneFrame(range, (u) => {
    const z = origin[2] + 4 - (u / range.length) * depth
    sceneLights.push(origin[0] + 0.4, 1.2, z - 3, 9, 1, 0.82, 0.6, 6)
    sceneLights.push(origin[0], 3, z - 12, 14, 0.6, 0.65, 0.9, 4)
    if (lineRef.current) (lineRef.current.material as MeshBasicMaterial).opacity = 1
  })

  return (
    <SceneRoot range={range}>
      <group>
        <mesh rotation-x={-Math.PI / 2} position={[origin[0], 0, origin[2] - depth / 2]} material={floorMat}>
          <planeGeometry args={[30, depth + 40]} />
        </mesh>
        {Array.from({ length: 10 }, (_, i) => (
          <mesh
            key={i}
            material={pillarMat}
            position={[origin[0] + (i % 2 ? 3.2 : -3.2), 2.5, origin[2] - (i / 10) * (depth + 10)]}
          >
            <boxGeometry args={[0.6, 5, 0.6]} />
          </mesh>
        ))}
        <mesh ref={lineRef}>
          <tubeGeometry args={[curve, 200, 0.012, 6, false]} />
          <meshBasicMaterial color={tint} toneMapped={false} transparent />
        </mesh>
        <group position={[origin[0], 1.7, origin[2] - 6]}>
          <Text font={monoUrl} fontSize={0.12} color={tint} anchorX="center" anchorY="bottom" position={[0, 0.45, 0]}>
            {`${String(range.phase).padStart(2, '0')} · ${phase.name.toUpperCase()}`}
          </Text>
          <Text font={monoUrl} fontSize={0.28} color="#ede6d6" anchorX="center" anchorY="middle" maxWidth={6}>
            {range.title.toLowerCase()}
          </Text>
          <Text font={monoUrl} fontSize={0.09} color="#8e8b85" anchorX="center" anchorY="top" position={[0, -0.4, 0]}>
            {`${range.id} · in production · see docs/phases`}
          </Text>
        </group>
      </group>
    </SceneRoot>
  )
}
