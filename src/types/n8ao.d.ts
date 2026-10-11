// Minimal types for n8ao (the package ships none). https://github.com/N8python/n8ao
declare module 'n8ao' {
  import type { Pass } from 'postprocessing'
  import type { Camera, Scene } from 'three'
  export class N8AOPostPass extends Pass {
    constructor(scene: Scene, camera: Camera, width?: number, height?: number)
    configuration: {
      aoRadius: number
      distanceFalloff: number
      intensity: number
      color: unknown
      aoSamples: number
      denoiseSamples: number
      denoiseRadius: number
      halfRes: boolean
      depthAwareUpsampling: boolean
      gammaCorrection: boolean
      screenSpaceRadius: boolean
      transparencyAware: boolean
      renderMode: number
    }
    setQualityMode(mode: 'Performance' | 'Low' | 'Medium' | 'High' | 'Ultra'): void
  }
}
