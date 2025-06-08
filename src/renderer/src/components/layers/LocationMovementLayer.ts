import { Layer, TimeRange, LayerItem } from './LayerTypes'
import { ArcPoint } from '../../../../types'

// Define a specific item type for this layer, extending LayerItem
export interface LocationMovementItem extends LayerItem {
  startTime: number
  endTime: number
  movement: number // Total movement in the time bin
}

// Constant for detail level, for now.
const DETAIL_LEVEL = 'hour' // e.g., 'hour', 'day'

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c // Distance in kilometers
}

export class LocationMovementLayer implements Layer<LocationMovementItem> {
  id = 'locationMovement'
  name = 'Location Movement'
  isVisible = true
  zIndex = 2 // Above ArcPointLayer, below markers

  private arcData: ArcPoint[]

  constructor(data: ArcPoint[]) {
    this.arcData = data
  }

  public setData(data: ArcPoint[]): void {
    this.arcData = data
  }

  draw(
    ctx: CanvasRenderingContext2D,
    timeRange: TimeRange,
    width: number,
    height: number,
    timestampToX: (timestamp: number) => number,
  ): void {
    if (!this.isVisible || !this.arcData || this.arcData.length < 2) return

    // 1. Calculate movement between points
    const movements: { time: number; distance: number }[] = []
    for (let i = 1; i < this.arcData.length; i++) {
      const p1 = this.arcData[i - 1]
      const p2 = this.arcData[i]
      const distance = haversineDistance(p1.lat, p1.lng, p2.lat, p2.lng)
      movements.push({ time: p2.time.getTime(), distance })
    }

    // 2. Bin movement data
    const binnedMovements: { [key: string]: number } = {}
    const getBinKey = (timestamp: number): string => {
      const date = new Date(timestamp)
      if (DETAIL_LEVEL === 'hour') {
        return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`
      }
      // Default to day
      return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
    }

    movements.forEach(m => {
      const binKey = getBinKey(m.time)
      if (!binnedMovements[binKey]) {
        binnedMovements[binKey] = 0
      }
      binnedMovements[binKey] += m.distance
    })

    // 3. Draw binned data as a bar chart
    let maxMovement = Math.max(...Object.values(binnedMovements))
    maxMovement = Math.min(maxMovement, 100)

    if (maxMovement === 0) return

    ctx.save()
    ctx.fillStyle = 'rgba(125, 255, 128, 0.6)'

    for (const binKey in binnedMovements) {
      const parts = binKey.split('-').map(Number)
      const year = parts[0],
        month = parts[1],
        day = parts[2],
        hour = parts.length > 3 ? parts[3] : 0

      const binStartTime = new Date(year, month, day, hour).getTime()
      let binEndTime: number
      if (DETAIL_LEVEL === 'hour') {
        binEndTime = new Date(year, month, day, hour + 1).getTime()
      } else {
        binEndTime = new Date(year, month, day + 1).getTime()
      }

      if (binStartTime > timeRange.end || binEndTime < timeRange.start) {
        continue
      }

      const x = timestampToX(binStartTime)
      const nextX = timestampToX(binEndTime)
      const barWidth = Math.max(1, nextX - x)
      const barHeight = (binnedMovements[binKey] / maxMovement) * height

      ctx.fillRect(x, (height - barHeight) / 2, barWidth, barHeight / 2)
    }

    ctx.restore()
  }
}
