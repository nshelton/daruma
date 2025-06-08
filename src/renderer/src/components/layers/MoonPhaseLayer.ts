import * as SunCalc from 'suncalc'
import { Layer, TimeRange } from './LayerTypes'

// Constants inspired by SunlightLayer for visual alignment
const MOON_PHASE_BASELINE_Y = 405 // Same as SUN_ALTITUDE_BASELINE_Y
const MOON_PHASE_MAX_HEIGHT = 100 // Same as SUN_ALTITUDE_MAX_HEIGHT
const MOON_WAVE_COLOR = 'rgba(180, 180, 200, 0.7)' // A slightly different silver/grey
const MOON_WAVE_LINE_WIDTH = 1.5

export class MoonPhaseLayer implements Layer {
  id = 'moonPhase'
  name = 'Moon Phase'
  isVisible = true
  zIndex = 2 // Draw it very close to sunlight, potentially slightly above or below based on exact zIndex vs sunlight's -1

  draw(
    ctx: CanvasRenderingContext2D,
    timeRange: TimeRange,
    width: number,
    // _height: number, // canvas height, not directly used
    // timestampToX: (timestamp: number) => number // Not directly used
  ): void {
    if (!this.isVisible) return

    ctx.beginPath()
    ctx.strokeStyle = MOON_WAVE_COLOR
    ctx.lineWidth = MOON_WAVE_LINE_WIDTH
    let firstPoint = true

    const timeStep = (timeRange.end - timeRange.start) / width // Time per pixel

    for (let xPixel = 0; xPixel < width; xPixel++) {
      const currentTime = timeRange.start + xPixel * timeStep
      const moonIllumination = SunCalc.getMoonIllumination(
        new Date(currentTime),
      )
      const fraction = moonIllumination.fraction // Illuminated fraction (0 to 1)

      // Map fraction (0 to 1) to the wave height.
      // 0 (new moon) will be at MOON_PHASE_BASELINE_Y
      // 1 (full moon) will be at MOON_PHASE_BASELINE_Y - MOON_PHASE_MAX_HEIGHT
      const yPos = MOON_PHASE_BASELINE_Y - fraction * MOON_PHASE_MAX_HEIGHT

      if (firstPoint) {
        ctx.moveTo(xPixel, yPos)
        firstPoint = false
      } else {
        ctx.lineTo(xPixel, yPos)
      }
    }
    ctx.stroke()
  }
}
