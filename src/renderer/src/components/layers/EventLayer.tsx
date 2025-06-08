import { Event } from '../../../../types'
import { Layer, TimeRange, SelectedItem } from './LayerTypes'

export class EventLayer implements Layer {
  id = 'events'
  name = 'Events'
  isVisible = true
  zIndex = 3 // Higher zIndex to draw on top of ArcPointLayer if needed
  private events: Event[] = []

  constructor(initialEvents: Event[]) {
    this.setData(initialEvents)
  }

  setData(events: Event[]): void {
    this.events = events.map((e) => ({
      ...e,
      start: new Date(e.start),
      end: new Date(e.end),
    }))
  }

  draw(
    ctx: CanvasRenderingContext2D,
    _timeRange: TimeRange, // _timeRange is not directly used for drawing individual events
    canvasWidth: number,
    _canvasHeight: number, // _canvasHeight is not directly used for y-positioning based on new reqs
    timestampToX: (timestamp: number) => number,
  ): void {
    const eventHeight = 20 // Height of the event rectangle
    const baseYPosition = 200 // 100px from the top

    const eventTypeStyles: Record<string, { color: string; yOffset: number }> =
      {
        charging: { color: 'rgba(128, 255, 128, 0.5)', yOffset: 20 },
        home: { color: 'rgba(100, 125, 255, 0.5)', yOffset: 0 },
        heidi: { color: 'rgba(255, 100, 255, 0.5)', yOffset: 60 },
        wifi: { color: 'rgba(100, 255, 255, 0.5)', yOffset: -10 },
        default: { color: 'rgba(255, 0, 255, 0.5)', yOffset: 0 },
      }

    this.events.forEach((event) => {
      const startX = timestampToX(event.start.getTime())
      const endX = timestampToX(event.end.getTime())
      const style = eventTypeStyles[event.eventType] || eventTypeStyles.default
      ctx.fillStyle = style.color
      const eventYPosition = baseYPosition + style.yOffset

      // Only draw if event is within the visible time range and positive width
      if (startX < canvasWidth && endX > 0 && endX > startX) {
        const x = Math.max(startX, 0)
        const width = Math.min(endX, canvasWidth) - x
        if (width > 0) {
          ctx.fillRect(x, eventYPosition, width, eventHeight)
        }
      }
    })
  }

  findClosestItem(
    _canvasX: number,
    _canvasY: number,
    _timeRangeParam: TimeRange, // Renamed to avoid conflict with outer scope _timeRange
    _timestampToXParam: (timestamp: number) => number, // Renamed
    _canvasHeightParam: number, // Renamed
    _canvasWidthParam: number, // Renamed
  ): SelectedItem | null {
    // TODO: Implement if selection of events is needed
    return null
  }
}
