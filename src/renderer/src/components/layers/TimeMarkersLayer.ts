import { Layer, TimeRange as TimelineTimeRange } from './LayerTypes' // Renamed to avoid conflict

// Interfaces and helper functions previously in timeMarkers.ts
// It might be cleaner to keep these in a separate utility file if they are used elsewhere,
// but for this refactor, we'll include them here for encapsulation.

interface TimeLevel {
  name: string
  span: number
  threshold: number
  yPosition: number
  getNext: (date: Date) => Date
  getStart: (viewStartDate: Date) => Date // Simplified: only needs viewStartDate
  format: (date: Date) => string
}

// Configuration for when to show individual units
const VISIBILITY_THRESHOLDS = {
  years: 10, // Show individual years if <= 10 years visible
  months: 20,
  days: 40,
  hours: 24 * 2, // Show individual hours if <= 2 days visible (example adjustment)
}

const FONT_SIZE = 32

function calculateTimeSpans(
  start: number,
  end: number,
): {
  yearSpan: number
  monthSpan: number
  daySpan: number
  hourSpan: number
} {
  const startDate = new Date(start)
  const endDate = new Date(end)

  const yearSpan = endDate.getFullYear() - startDate.getFullYear() + 1

  const monthSpan =
    (endDate.getFullYear() - startDate.getFullYear()) * 12 +
    (endDate.getMonth() - startDate.getMonth()) +
    1
  const daySpan = Math.ceil((end - start) / (24 * 60 * 60 * 1000))
  const hourSpan = Math.ceil((end - start) / (60 * 60 * 1000))

  return { yearSpan, monthSpan, daySpan, hourSpan }
}

function createTimeHierarchy(
  viewStartTimestamp: number, // Use the actual start of the view for calculations
  spans: ReturnType<typeof calculateTimeSpans>,
): TimeLevel[] {
  // const viewStartDate = new Date(viewStartTimestamp) // Not strictly needed here, pass timestamp or create Date in getStart

  return [
    {
      name: 'year',
      span: spans.yearSpan,
      threshold: VISIBILITY_THRESHOLDS.years,
      yPosition: FONT_SIZE, // Adjusted Y positions for layer
      getNext: (date: Date): Date => {
        const next = new Date(date)
        next.setFullYear(date.getFullYear() + 1)
        return next
      },
      // vsDate here is created from viewStartTimestamp in the draw method
      getStart: (vsDate): Date => {
        const date = new Date(vsDate.getFullYear(), 0, 1)
        date.setHours(0, 0, 0, 0)
        return date
      },
      format: (date: Date): string => date.getFullYear().toString(),
    },
    {
      name: 'month',
      span: spans.monthSpan,
      threshold: VISIBILITY_THRESHOLDS.months,
      yPosition: FONT_SIZE * 2,
      getNext: (date: Date): Date => {
        const next = new Date(date)
        next.setMonth(date.getMonth() + 1)
        return next
      },
      getStart: (vsDate): Date => {
        const date = new Date(vsDate.getFullYear(), vsDate.getMonth(), 1)
        date.setHours(0, 0, 0, 0)
        return date
      },
      format: (date: Date): string => date.toLocaleString('en-US', { month: 'short' }),
    },
    {
      name: 'day',
      span: spans.daySpan,
      threshold: VISIBILITY_THRESHOLDS.days,
      yPosition: FONT_SIZE * 3,
      getNext: (date: Date): Date => {
        const next = new Date(date)
        next.setDate(date.getDate() + 1)
        return next
      },
      getStart: (vsDate): Date => {
        const date = new Date(vsDate.getFullYear(), vsDate.getMonth(), vsDate.getDate())
        date.setHours(0, 0, 0, 0)
        return date
      },
      format: (date: Date): string => date.getDate().toString(),
    },
    {
      name: 'hour',
      span: spans.hourSpan,
      threshold: VISIBILITY_THRESHOLDS.hours,
      yPosition: FONT_SIZE * 4,
      getNext: (date: Date): Date => {
        const next = new Date(date)
        next.setHours(date.getHours() + 1)
        return next
      },
      getStart: (vsDate): Date => {
        const date = new Date(vsDate.getTime())
        date.setMinutes(0, 0, 0)
        return date
      },
      format: (date: Date): string => {
        const options: Intl.DateTimeFormatOptions = {
          hour: 'numeric',
          // hour12: true, // Consider if 12/24h format is desired
        }
        return new Intl.DateTimeFormat('en-US', options).format(date)
      },
    },
  ]
}

export class TimeMarkersLayer implements Layer {
  id = 'timeMarkers'
  name = 'Time Markers'
  isVisible = true
  zIndex = -10 // Draw below everything

  draw(
    ctx: CanvasRenderingContext2D,
    timeRange: TimelineTimeRange,
    width: number,
    height: number,
    timestampToX: (timestamp: number) => number,
  ): void {
    if (!this.isVisible) return

    const { start, end } = timeRange
    const viewStartDate = new Date(start) // Date object for the start of the view
    const viewEndDate = new Date(end) // Date object for the end of the view

    const spans = calculateTimeSpans(start, end)
    const timeHierarchy = createTimeHierarchy(viewStartDate.getTime(), spans)

    ctx.save()
    // Setup canvas styles
    ctx.strokeStyle = '#333'
    ctx.font = '24px IBM Plex Mono, monospace'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'

    // SECTION 1: Draw Day Backgrounds for Weekends (if applicable)
    const dayLevelConfig = timeHierarchy.find(l => l.name === 'day')
    if (dayLevelConfig) {
      // Only draw if day labels would be shown
      let currentDayBg = dayLevelConfig.getStart(viewStartDate)
      while (currentDayBg <= viewEndDate) {
        const nextDayBg = dayLevelConfig.getNext(currentDayBg) // This gives the start of the next day

        const dayOfWeek = currentDayBg.getDay()
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6 // Sunday is 0, Saturday is 6

        if (isWeekend) {
          const x1 = timestampToX(currentDayBg.getTime())
          const x2 = timestampToX(nextDayBg.getTime())
          const rectWidth = x2 - x1

          if (rectWidth > 0) {
            const drawX = Math.max(x1, 0)
            const effectiveRectWidth = Math.min(x2, width) - drawX
            if (effectiveRectWidth > 0) {
              ctx.fillStyle = 'rgba(0, 0, 0, 0.2)' // Slightly lighter gray for weekend background
              ctx.fillRect(drawX, 0, effectiveRectWidth, height)
            }
          }
        }
        if (nextDayBg.getTime() === currentDayBg.getTime()) {
          // console.warn("Stall in day background progression");
          break
        }
        currentDayBg = nextDayBg
        // Safety break if loop goes too far
        if (
          currentDayBg.getFullYear() > viewEndDate.getFullYear() + 2 &&
          dayLevelConfig.name === 'day'
        )
          break
      }
    }

    // SECTION 2: Draw hierarchical time markers (lines and labels)
    ctx.fillStyle = '#888' // Brighter text for labels for better contrast
    for (const level of timeHierarchy) {
      if (level.span > level.threshold * 5 && level.name !== 'year') continue
      const showLabels = level.span <= level.threshold
      let currentDate = level.getStart(viewStartDate) // Pass the Date object here

      while (currentDate <= viewEndDate) {
        const x = timestampToX(currentDate.getTime())

        if (x >= 0 && x <= width) {
          // Only draw if within canvas bounds
          ctx.beginPath()
          ctx.moveTo(x, level.yPosition - (showLabels ? 10 : 5)) // Line height adjustment
          ctx.lineTo(x, height) // Draw line to bottom of canvas or a fixed height
          ctx.globalAlpha = showLabels ? 0.5 : 0.25 // Dimmer lines for less prominent levels
          ctx.strokeStyle = '#333' // Ensure strokeStyle is set before stroke
          ctx.stroke()
          ctx.globalAlpha = 1.0 // Reset alpha

          if (showLabels) {
            const label = level.format(currentDate)
            ctx.fillText(label, x, level.yPosition + 35) // Position label above line start
          }
        }

        const nextDate = level.getNext(currentDate)
        // Safety break for potential infinite loops if getNext is flawed
        if (nextDate.getTime() === currentDate.getTime()) {
          // console.warn("Stall in date progression for level:", level.name);
          break
        }
        currentDate = nextDate
        if (currentDate.getFullYear() > viewEndDate.getFullYear() + 5 && level.name === 'year')
          break // Extra safety for year
      }
    }

    // SECTION 3: Draw start/end time labels
    ctx.fillStyle = '#AAA' // Brighter text for start/end labels
    ctx.font = '24px IBM Plex Mono' // Ensure font is reset if changed above
    ctx.textAlign = 'left'

    for (const level of timeHierarchy) {
      const startDateMarker = level.getStart(viewStartDate) // Renamed to avoid conflict
      const label = level.format(startDateMarker)
      ctx.fillText(label, 10, level.yPosition + FONT_SIZE)
    }

    // ctx.fillStyle = '#AAA'; // Already set
    const startLabel = new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(start))

    const endLabel = new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(end))

    ctx.textAlign = 'right'
    ctx.fillText(endLabel, width - 10, height - 20)
    ctx.textAlign = 'left'
    ctx.fillText(startLabel, 10, height - 20)

    ctx.restore()
  }
}
