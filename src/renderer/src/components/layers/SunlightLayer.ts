import * as SunCalc from 'suncalc'
import { Layer, TimeRange } from './LayerTypes'

// Los Angeles
const LATITUDE = 34.090097
const LONGITUDE = -118.299888

const DAY_COLOR = 'rgba(53, 58, 102, 0.1)'// Light yellow for daytime
const NIGHT_COLOR = 'rgba(38, 38, 116, 0.1)' // Dark blue for nighttime
const TWILIGHT_COLOR = 'rgba(42, 68, 117, 0.1)' // Orange for twilight

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

    // Handle cases where SunCalc returns invalid dates
    const isValidDate = (d: Date) => d instanceof Date && !isNaN(d.getTime())

    // SunCalc returns UTC times, we need to use them directly as timestamps
    // The issue might be that our timeline data is already in the correct timezone
    // Let's just use the UTC timestamps directly and see if that works
    const convertSunTime = (utcDate: Date): number => {
      if (!isValidDate(utcDate)) return NaN
      return utcDate.getTime()
    }

    // Fallback values for Los Angeles (approximate times in local timezone)
    const dayStart = new Date(date)
    dayStart.setHours(0, 0, 0, 0)
    const fallbackDawn = new Date(dayStart.getTime()).setHours(6, 0, 0, 0)
    const fallbackSunrise = new Date(dayStart.getTime()).setHours(7, 0, 0, 0)
    const fallbackSunset = new Date(dayStart.getTime()).setHours(18, 0, 0, 0)
    const fallbackDusk = new Date(dayStart.getTime()).setHours(19, 0, 0, 0)


    const sunriseTime = convertSunTime(times.sunrise)
    const sunsetTime = convertSunTime(times.sunset)
    const dawnTime = convertSunTime(times.dawn)
    const duskTime = convertSunTime(times.dusk)

    return {
      sunrise: !isNaN(sunriseTime) ? sunriseTime : fallbackSunrise,
      sunset: !isNaN(sunsetTime) ? sunsetTime : fallbackSunset,
      dawn: !isNaN(dawnTime) ? dawnTime : fallbackDawn,
      dusk: !isNaN(duskTime) ? duskTime : fallbackDusk,
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

      // Use the actual sun times without clamping to day boundaries
      // This prevents invalid ranges where sunrise gets clamped to midnight
      const effectiveDawn = dawn
      const effectiveSunrise = sunrise  
      const effectiveSunset = sunset
      const effectiveDusk = dusk

      // this.drawRect(
      //   ctx,
      //   dayStartTimestamp,
      //   effectiveDawn,
      //   NIGHT_COLOR,
      //   timestampToX,
      //   width,
      //   Y_OFFSET,
      // )
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
      // this.drawRect(ctx, effectiveDusk, dayEndTimestamp, NIGHT_COLOR, timestampToX, width, Y_OFFSET)

      dayIter = nextDayIter
    }

    // Next, draw the sun altitude sine wave
    ctx.beginPath()
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.8)' // Gold color for sun altitude curve
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
