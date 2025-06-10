import { Layer, TimeRange, LayerItem } from './LayerTypes'
import { CustomEvent } from '../../../../types'

// Define a specific item type for this layer, extending LayerItem
export interface CustomEventItem extends LayerItem {
  // LayerItem has id, startTime, endTime
  y: number
  height: number
}

export class CustomEventsLayer implements Layer<CustomEventItem> {
  id = 'customEvents'
  name = 'Custom Events'
  isVisible = true
  zIndex = 3 // Above LocationMovementLayer

  private events: CustomEvent[] = []
  private eventLayouts: Map<number, { y: number }> = new Map()
  private defaultEventHeight = 20
  private selectedEventId: number | null = null
  private hoveredEventId: number | null = null
  private hoveredPart: 'left' | 'right' | 'body' | 'top' | 'bottom' | null = null

  constructor() {
    // TODO: Fetch initial data
  }

  public setSelectedEventId(id: number | null): void {
    this.selectedEventId = id
  }

  public setHoveredEvent(id: number | null, part: 'left' | 'right' | 'body' | 'top' | 'bottom' | null = null): void {
    this.hoveredEventId = id
    this.hoveredPart = part
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
    const verticalSpacing = this.defaultEventHeight + eventPadding
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
        height: event.height ?? this.defaultEventHeight,
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
  ): (CustomEventItem & { part: 'left' | 'right' | 'body' | 'top' | 'bottom' }) | null {
    if (!xToTimestamp) return null
    const clickedTime = xToTimestamp(canvasX)
    const toleranceTime = (10 / _width) * (timeRange.end - timeRange.start) // 10 pixels in time
    const clickRadiusY = 10 // 10 pixels for Y axis
    const edgeThreshold = 5 // 5 pixels for edge detection

    for (const event of this.getItems(timeRange)) {
      const startTime = event.startTime!
      const endTime = event.endTime!

      const eventTopY = _height - event.y - event.height
      const eventBottomY = eventTopY + event.height

      // Check if click is within a 10px radius of the event bounds
      if (
        clickedTime >= startTime - toleranceTime &&
        clickedTime <= endTime + toleranceTime &&
        canvasY >= eventTopY - clickRadiusY &&
        canvasY <= eventBottomY + clickRadiusY
      ) {
        // Check for height resize handles (top and bottom edges) - these take priority
        if (Math.abs(canvasY - eventTopY) <= edgeThreshold) {
          return { ...event, part: 'top' }
        } else if (Math.abs(canvasY - eventBottomY) <= edgeThreshold) {
          return { ...event, part: 'bottom' }
        }
        
        // Check for horizontal resize handles (left and right edges) - these also take priority
        if (Math.abs(clickedTime - startTime) < toleranceTime) {
          return { ...event, part: 'left' }
        } else if (Math.abs(clickedTime - endTime) < toleranceTime) {
          return { ...event, part: 'right' }
        }
        
        // Now check if click is specifically on the text label for selection
        // We need to replicate the text positioning logic from drawEvent
        const startX = timestampToX(startTime)
        const endX = timestampToX(endTime)
        
        // Calculate text position (same logic as in drawEvent)
        const textMetrics = this.measureText(event.title as string)
        const textWidth = textMetrics.width
        const textHeight = 12 // Font size
        
        // Calculate the visible portion of the event
        const visibleStartX = Math.max(startX, 0)
        const visibleEndX = Math.min(endX, _width)
        const visibleWidth = visibleEndX - visibleStartX
        
        let labelX: number
        
        if (visibleWidth >= textWidth + 8) {
          // If there's enough visible space for the text, center it in the visible area
          labelX = visibleStartX + (visibleWidth - textWidth) / 2
        } else if (visibleWidth >= textWidth + 4) {
          // If there's just enough space, position it with minimal left padding
          labelX = visibleStartX + 4
        } else {
          // If the visible area is too small, position at the start of visible area
          labelX = visibleStartX + 2
        }
        
        // Ensure the label doesn't go beyond the canvas boundaries
        labelX = Math.max(2, Math.min(labelX, _width - textWidth - 2))
        
        // Calculate text bounding box with expanded clickable area
        const textCenterY = eventTopY + event.height / 2
        const clickPadding = 8 // Extra padding around text for easier clicking
        
        const textTop = textCenterY - textHeight / 2 - clickPadding
        const textBottom = textCenterY + textHeight / 2 + clickPadding
        const textLeft = labelX - clickPadding
        const textRight = labelX + textWidth + clickPadding
        
        // Check if click is within the expanded text bounding box
        if (
          canvasX >= textLeft &&
          canvasX <= textRight &&
          canvasY >= textTop &&
          canvasY <= textBottom
        ) {
          return { ...event, part: 'body' }
        }
        
        // If we get here, the click was on the event bar but not on the text or edges
        // Return null to ignore this click (no selection)
      }
    }
    return null
  }

  // Helper method to measure text (matches the font settings in drawEvent)
  private measureText(text: string): TextMetrics {
    // Create a temporary canvas context for text measurement
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    ctx.font = '12px "IBM Plex Mono", monospace'
    return ctx.measureText(text)
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
    ctx.globalAlpha = 0.5 // Set 50% transparency for all events
    
    const items = this.getItems(timeRange)
    
    // Sort events by area (largest first) so big events are drawn in back
    // But keep selected event for last (it will be drawn on top)
    const selectedItem = items.find(item => item.id === this.selectedEventId)
    const nonSelectedItems = items.filter(item => item.id !== this.selectedEventId)
    
    // Sort non-selected items by area (width * height), largest first
    nonSelectedItems.sort((a, b) => {
      const aWidth = Math.max(10, timestampToX(a.endTime!) - timestampToX(a.startTime!))
      const aArea = aWidth * a.height
      const bWidth = Math.max(10, timestampToX(b.endTime!) - timestampToX(b.startTime!))
      const bArea = bWidth * b.height
      return bArea - aArea // Largest first (drawn in back)
    })
    
    // Draw non-selected items first (in size order)
    nonSelectedItems.forEach(item => {
      this.drawEvent(ctx, item, timestampToX, _width, _height, false)
    })
    
    // Draw selected item last (on top) with special styling
    if (selectedItem) {
      this.drawEvent(ctx, selectedItem, timestampToX, _width, _height, true)
    }
    
    ctx.restore()
  }

  private drawEvent(
    ctx: CanvasRenderingContext2D,
    item: CustomEventItem,
    timestampToX: (timestamp: number) => number,
    _width: number,
    _height: number,
    isFloatedToTop: boolean = false
  ): void {
    const startX = timestampToX(item.startTime!)
    const endX = timestampToX(item.endTime!)
    const barWidth = Math.max(10, endX - startX)
    const yPos = _height - item.y - item.height
    const isSelected = this.selectedEventId === item.id
    const isHovered = this.hoveredEventId === item.id

    // Special styling for floated events
    if (isFloatedToTop) {
      ctx.save()
      // Add a subtle drop shadow for the "lifted" effect
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)'
      ctx.shadowBlur = 4
      ctx.shadowOffsetX = 2
      ctx.shadowOffsetY = 2
    }

    ctx.fillStyle = (item.color as string) || 'rgba(100, 100, 255, 0.7)'
    ctx.fillRect(startX, yPos, barWidth, item.height)

    // Draw outline - special styling for selected/hovered events
    if (isSelected) {
      // Selected event: bright cyan outline with glow effect
      ctx.shadowColor = '#00ffff'
      ctx.shadowBlur = 8
      ctx.strokeStyle = '#00ffff'
      ctx.lineWidth = 2
    } else if (isHovered && this.hoveredPart && this.hoveredPart !== 'body') {
      // Hovered edge: bright yellow outline with glow effect
      ctx.shadowColor = '#ffff00'
      ctx.shadowBlur = 6
      ctx.strokeStyle = '#ffff00'
      ctx.lineWidth = 2
    } else {
      // Normal event: thin white outline
      ctx.shadowBlur = 0
      ctx.strokeStyle = 'white'
      ctx.lineWidth = 1
    }
    ctx.strokeRect(startX, yPos, barWidth, item.height)

    // For hovered edges, draw additional edge highlighting
    if (isHovered && this.hoveredPart && this.hoveredPart !== 'body') {
      ctx.save()
      ctx.globalAlpha = 1.0 // Full opacity for edge highlights
      ctx.strokeStyle = '#ffff00'
      ctx.lineWidth = 3
      ctx.shadowColor = '#ffff00'
      ctx.shadowBlur = 10
      
      ctx.beginPath()
      switch (this.hoveredPart) {
        case 'left':
          ctx.moveTo(startX, yPos)
          ctx.lineTo(startX, yPos + item.height)
          break
        case 'right':
          ctx.moveTo(startX + barWidth, yPos)
          ctx.lineTo(startX + barWidth, yPos + item.height)
          break
        case 'top':
          ctx.moveTo(startX, yPos)
          ctx.lineTo(startX + barWidth, yPos)
          break
        case 'bottom':
          ctx.moveTo(startX, yPos + item.height)
          ctx.lineTo(startX + barWidth, yPos + item.height)
          break
      }
      ctx.stroke()
      ctx.restore()
      ctx.globalAlpha = 0.5 // Restore the global alpha
    }
    
    // Reset shadow for text rendering
    ctx.shadowBlur = 0

    // Calculate label position to ensure it's always visible when the event is visible
    ctx.globalAlpha = 1.0 // Reset alpha for text - we want text to be fully opaque
    ctx.fillStyle = 'white'
    ctx.font = '12px "IBM Plex Mono", monospace'
    ctx.textBaseline = 'middle'
    
    // Measure the text width to better position it
    const textMetrics = ctx.measureText(item.title as string)
    const textWidth = textMetrics.width
    
    // Calculate the visible portion of the event
    const visibleStartX = Math.max(startX, 0)
    const visibleEndX = Math.min(endX, _width)
    const visibleWidth = visibleEndX - visibleStartX
    
    let labelX: number
    
    if (visibleWidth >= textWidth + 8) {
      // If there's enough visible space for the text, center it in the visible area
      labelX = visibleStartX + (visibleWidth - textWidth) / 2
    } else if (visibleWidth >= textWidth + 4) {
      // If there's just enough space, position it with minimal left padding
      labelX = visibleStartX + 4
    } else {
      // If the visible area is too small, position at the start of visible area
      labelX = visibleStartX + 2
    }
    
    // Ensure the label doesn't go beyond the canvas boundaries
    labelX = Math.max(2, Math.min(labelX, _width - textWidth - 2))
    
    ctx.fillText(item.title as string, labelX, yPos + item.height / 2)
    
    // Restore alpha for next iteration
    ctx.globalAlpha = 0.5

    if (isFloatedToTop) {
      ctx.restore() // Restore the shadow context
    }
  }
}
