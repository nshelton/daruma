import { Layer, TimeRange, LayerItem } from './LayerTypes'
import { ArcPoint } from '../../../../types'

// Define a specific item type for this layer, extending LayerItem
export interface ArcPointItem extends LayerItem {
  timestamp: number // Milliseconds since epoch
  lat: number
  lng: number
  // other properties from ArcPoint can be included in metadata
}

export class ArcPointLayer implements Layer<ArcPointItem> {
  id = 'arcPoints'
  name = 'Arc Points'
  isVisible = true
  zIndex = 1 // Draw above sun/moon but below time markers/current time indicator

  private arcData: ArcPoint[]
  // To re-enable selection highlighting, selectedItem would be stored here
  // private selectedItem: SelectedItem | null = null;

  constructor(data: ArcPoint[]) {
    this.arcData = data
  }

  public setData(data: ArcPoint[]): void {
    this.arcData = data
  }

  // public setSelectedItem(item: SelectedItem | null): void { // For re-enabling selection
  //   this.selectedItem = item;
  // }

  draw(
    ctx: CanvasRenderingContext2D,
    timeRange: TimeRange,
    width: number,
    height: number,
    timestampToX: (timestamp: number) => number,
    // selectedItem: SelectedItem | null // Removed for now to match Layer interface
  ): void {
    if (!this.isVisible || !this.arcData) return

    const { start, end } = timeRange
    const visibleData = this.arcData.filter(
      point => point.time.getTime() >= start && point.time.getTime() <= end,
    )

    const maxPoints = Math.floor(width / 2)
    let dataToDraw = visibleData

    if (visibleData.length > maxPoints && maxPoints > 0) {
      dataToDraw = []
      const bucketSize = Math.ceil(visibleData.length / maxPoints)
      for (let i = 0; i < visibleData.length; i += bucketSize) {
        const bucket = visibleData.slice(i, i + bucketSize)
        const representativePoint = bucket[0]
        dataToDraw.push(representativePoint)
      }
    }

    ctx.save()
    dataToDraw.forEach(point => {
      const pointTimestamp = point.time.getTime()
      const x = timestampToX(pointTimestamp)
      const y = height / 2

      // Highlighting logic would use this.selectedItem if it were stored in the class
      const isSelected = false // Placeholder
      // const isSelected =
      //   this.selectedItem &&
      //   this.selectedItem.layerId === this.id &&
      //   this.selectedItem.id === pointTimestamp

      ctx.beginPath()
      const radius = isSelected ? 7 : 5
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.fillStyle = isSelected ? 'rgba(255, 105, 180, 1)' : 'rgba(152, 251, 152, 0.8)'
      ctx.fill()
    })
    ctx.restore()
  }

  findClosestItem(
    canvasX: number,
    canvasY: number,
    timeRange: TimeRange,
    timestampToX: (timestamp: number) => number,
    canvasHeight: number,
  ): ArcPointItem | null {
    if (!this.arcData) return null

    const { start, end } = timeRange
    const visibleData = this.arcData.filter(
      (point: ArcPoint) =>
        typeof point.time.getTime() === 'number' &&
        point.time.getTime() >= start &&
        point.time.getTime() <= end,
    )

    if (visibleData.length === 0) return null

    const maxDistance = 15
    let foundPoint: ArcPoint | null = null
    let minDistance = Infinity

    visibleData.forEach((point: ArcPoint) => {
      const pointTimestamp = point.time.getTime()
      const pointX = timestampToX(pointTimestamp)
      const pointY = canvasHeight / 2
      const distance = Math.sqrt(Math.pow(pointX - canvasX, 2) + Math.pow(pointY - canvasY, 2))

      if (distance < maxDistance && distance < minDistance) {
        minDistance = distance
        foundPoint = point
      }
    })

    if (foundPoint) {
      const finalPoint: ArcPoint = foundPoint // Explicitly assign to non-null type
      const pointTimestamp = finalPoint.time.getTime()
      const item: ArcPointItem = {
        id: pointTimestamp,
        layerId: this.id,
        timestamp: pointTimestamp,
        lat: finalPoint.lat,
        lng: finalPoint.lng,
        metadata: {
          originalTime: finalPoint.time.toISOString(),
          latitude: finalPoint.lat,
          longitude: finalPoint.lng,
        },
      }
      // Check for optional properties before assigning
      if (Object.prototype.hasOwnProperty.call(finalPoint, 'value')) {
        item.value = finalPoint.value
      }
      item.metadata = { originalTimestamp: finalPoint.time.getTime() }
      return item
    }
    return null
  }

  public findItemClosestToTime(targetTime: number): ArcPointItem | null {
    if (!this.arcData || this.arcData.length === 0) {
      return null
    }

    let closestPoint: ArcPoint | null = null
    let minTimeDifference = Infinity

    for (const point of this.arcData) {
      const pointTime = point.time.getTime()
      const timeDifference = Math.abs(pointTime - targetTime)

      if (timeDifference < minTimeDifference) {
        minTimeDifference = timeDifference
        closestPoint = point
      }
    }

    if (closestPoint) {
      const pointTimestamp = closestPoint.time.getTime()
      const item: ArcPointItem = {
        id: pointTimestamp,
        layerId: this.id,
        timestamp: pointTimestamp,
        lat: closestPoint.lat,
        lng: closestPoint.lng,
        metadata: {
          originalTime: closestPoint.time.toISOString(),
          latitude: closestPoint.lat,
          longitude: closestPoint.lng,
          // Add any other relevant metadata from closestPoint
        },
      }
      // Include .value if it exists on closestPoint, similar to findClosestItem
      if (Object.prototype.hasOwnProperty.call(closestPoint, 'value')) {
        item.value = closestPoint.value
      }
      return item
    }

    return null
  }
}
