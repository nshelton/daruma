import { Layer, TimeRange } from './LayerTypes'

const CURRENT_TIME_COLOR = 'orange'
const LINE_WIDTH = 2

export class CurrentTimeIndicatorLayer implements Layer {
  id = 'currentTimeIndicator'
  name = 'Current Time'
  isVisible = true
  zIndex = 10 // Draw on top of most other elements

  draw(
    ctx: CanvasRenderingContext2D,
    timeRange: TimeRange,
    width: number,
    height: number, // canvas height
    timestampToX: (timestamp: number) => number,
  ): void {
    if (!this.isVisible) return

    const now = Date.now() // Get current time in milliseconds

    // Check if the current time is within the visible time range
    if (now < timeRange.start || now > timeRange.end) {
      return // Don't draw if current time is not visible
    }

    const x = timestampToX(now)

    // Ensure the line is drawn within the canvas bounds
    if (x >= 0 && x <= width) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.strokeStyle = CURRENT_TIME_COLOR
      ctx.lineWidth = LINE_WIDTH
      ctx.stroke()
    }
  }
}
