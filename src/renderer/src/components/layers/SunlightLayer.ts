import * as SunCalc from 'suncalc'
import { Layer, TimeRange } from './LayerTypes'

// Los Angeles
const LATITUDE = 34.090097
const LONGITUDE = -118.299888

const DAY_COLOR = 'rgba(255, 208, 100, 0.3)' // Light yellow for daytime (increased alpha slightly)
const NIGHT_COLOR = 'rgba(0, 0, 100, 0.3)' // Dark blue for nighttime (increased alpha slightly)
const TWILIGHT_COLOR = 'rgba(255, 165, 0, 0.3)' // Orange for twilight (increased alpha slightly)

const DURATION_BLOCK_HEIGHT = 10 // Fixed height for duration blocks
const SUN_ALTITUDE_MAX_HEIGHT = 100 // Max height for the sun altitude wave from its baseline

const Y_OFFSET = 400 // Offset for the duration blocks
const SUN_ALTITUDE_BASELINE_Y = Y_OFFSET + 5 // Position sun wave 5px below duration blocks

export class SunlightLayer implements Layer {
  id = 'sunlight'
  name = 'Sunlight'
  isVisible = true
  zIndex = 2 // Draw behind other elements like time markers

  private getSunlightInfoForDay(date: Date): {
    sunrise: number
    sunset: number
    dawn: number
    dusk: number
    times: SunCalc.GetTimesResult
  } {
    const times = SunCalc.getTimes(date, LATITUDE, LONGITUDE)

    return {
      sunrise: times.sunrise.getTime(),
      sunset: times.sunset.getTime(),
      dawn: times.dawn.getTime(),
      dusk: times.dusk.getTime(),
      times: times, // Store the full times object for altitude calculation
    }
  }

  draw(
    ctx: CanvasRenderingContext2D,
    timeRange: TimeRange,
    width: number,
    height: number, // canvas height, not used directly by blocks anymore
    timestampToX: (timestamp: number) => number,
  ): void {
    if (!this.isVisible) return

    const { start, end } = timeRange

    // First, draw the duration blocks
    let dayIter = new Date(start)
    dayIter.setHours(0, 0, 0, 0)

    while (dayIter.getTime() < end) {
      const { sunrise, sunset, dawn, dusk } = this.getSunlightInfoForDay(dayIter)
      const nextDayIter = new Date(dayIter)
      nextDayIter.setDate(dayIter.getDate() + 1)
      const dayStartTimestamp = dayIter.getTime()
      const dayEndTimestamp = nextDayIter.getTime()

      const effectiveDawn = Math.max(dayStartTimestamp, dawn)
      const effectiveSunrise = Math.max(dayStartTimestamp, sunrise)
      const effectiveSunset = Math.min(dayEndTimestamp, sunset)
      const effectiveDusk = Math.min(dayEndTimestamp, dusk)

      this.drawRect(
        ctx,
        dayStartTimestamp,
        effectiveDawn,
        NIGHT_COLOR,
        timestampToX,
        width,
        Y_OFFSET,
      )
      this.drawRect(
        ctx,
        effectiveDawn,
        effectiveSunrise,
        TWILIGHT_COLOR,
        timestampToX,
        width,
        Y_OFFSET,
      )
      this.drawRect(
        ctx,
        effectiveSunrise,
        effectiveSunset,
        DAY_COLOR,
        timestampToX,
        width,
        Y_OFFSET,
      )
      this.drawRect(
        ctx,
        effectiveSunset,
        effectiveDusk,
        TWILIGHT_COLOR,
        timestampToX,
        width,
        Y_OFFSET,
      )
      this.drawRect(ctx, effectiveDusk, dayEndTimestamp, NIGHT_COLOR, timestampToX, width, Y_OFFSET)

      dayIter = nextDayIter
    }

    // Next, draw the sun altitude sine wave
    ctx.beginPath()
    ctx.strokeStyle = DAY_COLOR
    ctx.lineWidth = 1.5
    let firstPoint = true

    const timeStep = (timeRange.end - timeRange.start) / width // Time per pixel

    for (let xPixel = 0; xPixel < width; xPixel++) {
      const currentTime = timeRange.start + xPixel * timeStep
      const sunPosition = SunCalc.getPosition(new Date(currentTime), LATITUDE, LONGITUDE)
      const altitudeRadians = sunPosition.altitude // Altitude in radians
      // Normalize altitude: 0 at horizon, 1 at zenith (PI/2 radians or 90 degrees)
      // Sun altitude can be negative (below horizon).
      // We'll map -PI/2 to +PI/2 range to 0-1, then scale to our drawing height.
      // A simple way is to scale such that 0 altitude is baseline, positive altitude goes up.

      let yPos = SUN_ALTITUDE_BASELINE_Y
      const normalizedAltitude = altitudeRadians / (Math.PI / 2)
      yPos -= normalizedAltitude * SUN_ALTITUDE_MAX_HEIGHT // Subtract because Y is downwards
      // If you want to show the sun dipping below, you could adjust yPos for negative radians too.

      if (firstPoint) {
        ctx.moveTo(xPixel, yPos)
        firstPoint = false
      } else {
        ctx.lineTo(xPixel, yPos)
      }
    }
    ctx.stroke()
  }

  private drawRect(
    ctx: CanvasRenderingContext2D,
    startTime: number,
    endTime: number,
    color: string,
    timestampToX: (timestamp: number) => number,
    canvasWidth: number,
    rectY: number, // Y position for the rect
  ): void {
    if (startTime >= endTime) return
    const x1 = timestampToX(startTime)
    const x2 = timestampToX(endTime)

    if (x2 > x1 && x1 < canvasWidth && x2 > 0) {
      ctx.fillStyle = color
      const rectStart = Math.max(0, x1)
      const rectEnd = Math.min(canvasWidth, x2)
      const rectWidth = rectEnd - rectStart
      if (rectWidth > 0) {
        ctx.fillRect(rectStart, 0, rectWidth, ctx.canvas.height)
      }
    }
  }
}
