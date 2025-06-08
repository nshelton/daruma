import { Layer, TimeRange, LayerItem } from './LayerTypes'
import { CustomEvent } from '../../../../types'

// Define a specific item type for this layer, extending LayerItem
export interface CustomEventItem extends LayerItem {
  // LayerItem has id, startTime, endTime
  y: number
}

export class CustomEventsLayer implements Layer<CustomEventItem> {
  id = 'customEvents'
  name = 'Custom Events'
  isVisible = true
  zIndex = 3 // Above LocationMovementLayer

  private events: CustomEvent[] = []
  private eventLayouts: Map<number, { y: number }> = new Map()
  private eventHeight = 20

  constructor() {
    // TODO: Fetch initial data
  }

  public setData(data: CustomEvent[]): void {
    this.events = data
    this.calculateLayout()
  }

  public getEvents(): CustomEvent[] {
    return this.events
  }

  private calculateLayout(): void {
    this.eventLayouts.clear()
    const sortedEvents = [...this.events].sort((a, b) => a.startTime - b.startTime)
    const lanes: { endTime: number }[] = []
    const eventPadding = 5
    const verticalSpacing = this.eventHeight + eventPadding
    const yOffsetFromBottom = 100

    for (const event of sortedEvents) {
      if (event.y !== undefined) {
        this.eventLayouts.set(event.id, { y: event.y })
        // This doesn't handle collisions with user-defined positions,
        // but for now we'll assume they are managed elsewhere or are deliberate.
        continue
      }

      let laneIndex = -1
      for (let i = 0; i < lanes.length; i++) {
        if (event.startTime >= lanes[i].endTime) {
          laneIndex = i
          lanes[i].endTime = event.endTime
          break
        }
      }

      if (laneIndex === -1) {
        laneIndex = lanes.length
        lanes.push({ endTime: event.endTime })
      }

      this.eventLayouts.set(event.id, { y: yOffsetFromBottom + laneIndex * verticalSpacing })
    }
  }

  public getItems(timeRange: TimeRange): CustomEventItem[] {
    const items: CustomEventItem[] = this.events
      .filter(event => event.endTime >= timeRange.start && event.startTime <= timeRange.end)
      .map(event => ({
        id: event.id,
        startTime: event.startTime,
        endTime: event.endTime,
        layerId: this.id,
        title: event.title,
        color: event.color,
        y: this.eventLayouts.get(event.id)?.y ?? 0,
      }))
    return items
  }

  findClosestItem(
    canvasX: number,
    canvasY: number,
    timeRange: TimeRange,
    timestampToX: (timestamp: number) => number,
    _height: number,
    _width: number,
    xToTimestamp?: (x: number) => number,
  ): (CustomEventItem & { part: 'left' | 'right' | 'body' }) | null {
    if (!xToTimestamp) return null
    const clickedTime = xToTimestamp(canvasX)
    const toleranceTime = (10 / _width) * (timeRange.end - timeRange.start) // 10 pixels in time
    const clickRadiusY = 10 // 10 pixels for Y axis

    for (const event of this.getItems(timeRange)) {
      const startTime = event.startTime!
      const endTime = event.endTime!

      const eventTopY = _height - event.y - this.eventHeight
      const eventBottomY = eventTopY + this.eventHeight

      // Check if click is within a 10px radius of the event bounds
      if (
        clickedTime >= startTime - toleranceTime &&
        clickedTime <= endTime + toleranceTime &&
        canvasY >= eventTopY - clickRadiusY &&
        canvasY <= eventBottomY + clickRadiusY
      ) {
        // Check for resize handles first
        if (Math.abs(clickedTime - startTime) < toleranceTime) {
          return { ...event, part: 'left' }
        } else if (Math.abs(clickedTime - endTime) < toleranceTime) {
          return { ...event, part: 'right' }
        }
        // If not a resize handle, it's a body click for selection purposes.
        return { ...event, part: 'body' }
      }
    }
    return null
  }

  draw(
    ctx: CanvasRenderingContext2D,
    timeRange: TimeRange,
    _width: number,
    _height: number,
    timestampToX: (timestamp: number) => number,
  ): void {
    if (!this.isVisible || !this.events) return

    ctx.save()
    // Basic drawing for now
    const items = this.getItems(timeRange)
    items.forEach(item => {
      const startX = timestampToX(item.startTime!)
      const endX = timestampToX(item.endTime!)
      const barWidth = Math.max(10, endX - startX)
      const yPos = _height - item.y - this.eventHeight

      ctx.fillStyle = (item.color as string) || 'rgba(100, 100, 255, 0.7)'
      ctx.fillRect(startX, yPos, barWidth, this.eventHeight)

      ctx.strokeStyle = 'white'
      ctx.lineWidth = 1
      ctx.strokeRect(startX, yPos, barWidth, this.eventHeight)

      ctx.fillStyle = 'white'
      ctx.textBaseline = 'middle'
      ctx.fillText(item.title as string, startX + 4, yPos + this.eventHeight / 2)
    })
    ctx.restore()
  }
}
