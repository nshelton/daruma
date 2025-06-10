import { Layer, TimeRange, LayerItem } from './LayerTypes'
import { ArcPoint } from '../../../../types'

// Define a specific item type for this layer, extending LayerItem
export interface LocationNameItem extends LayerItem {
  timestamp: number
  lat: number
  lng: number
  locationName: string
  locationLevel: 'city' | 'state' | 'country'
  color: string
}

// Simple location cache to avoid redundant API calls
const locationCache = new Map<string, { name: string; level: string }>()

// Predefined colors for locations
const locationColors = [
  '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57',
  '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3', '#ff9f43',
  '#feca57', '#ff6b6b', '#c44569', '#f8b500', '#778beb'
]

export class LocationNameLayer implements Layer<LocationNameItem> {
  id = 'locationNames'
  name = 'Location Names'
  isVisible = true
  zIndex = 4 // Above CustomEventsLayer

  private arcData: ArcPoint[] = []
  private colorMap = new Map<string, string>()
  private colorIndex = 0

  constructor() {
    // Empty constructor, data will be set via setData
  }

  public setData(data: ArcPoint[]): void {
    this.arcData = data
  }

  private getLocationColor(locationName: string): string {
    if (!this.colorMap.has(locationName)) {
      this.colorMap.set(locationName, locationColors[this.colorIndex % locationColors.length])
      this.colorIndex++
    }
    return this.colorMap.get(locationName)!
  }

  private getCacheKey(lat: number, lng: number, level: string): string {
    // Round to 2 decimal places for reasonable caching granularity
    const roundedLat = Math.round(lat * 100) / 100
    const roundedLng = Math.round(lng * 100) / 100
    return `${roundedLat},${roundedLng},${level}`
  }

  private async reverseGeocode(lat: number, lng: number, level: 'city' | 'state' | 'country'): Promise<string> {
    const cacheKey = this.getCacheKey(lat, lng, level)
    
    if (locationCache.has(cacheKey)) {
      return locationCache.get(cacheKey)!.name
    }

    try {
      // Using OpenStreetMap Nominatim API (free, no API key required)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=${this.getZoomLevel(level)}&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'Daruma Timeline App (personal use)'
          }
        }
      )
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      let locationName = 'Unknown'
      
      if (data.address) {
        switch (level) {
          case 'city':
            locationName = data.address.city || data.address.town || data.address.village || 
                          data.address.suburb || data.address.hamlet || 'Unknown City'
            break
          case 'state':
            locationName = data.address.state || data.address.province || data.address.region || 'Unknown State'
            break
          case 'country':
            locationName = data.address.country || 'Unknown Country'
            break
        }
      }
      
      locationCache.set(cacheKey, { name: locationName, level })
      return locationName
      
    } catch (error) {
      console.warn('Geocoding failed:', error)
      locationCache.set(cacheKey, { name: 'Unknown', level })
      return 'Unknown'
    }
  }

  private getZoomLevel(level: 'city' | 'state' | 'country'): number {
    switch (level) {
      case 'city': return 14    // High detail for city names
      case 'state': return 8    // Medium detail for state names  
      case 'country': return 3  // Low detail for country names
      default: return 10
    }
  }

  private getDetailLevel(timeRangeSpan: number): 'city' | 'state' | 'country' {
    const days = timeRangeSpan / (1000 * 60 * 60 * 24)
    
    if (days <= 7) return 'city'        // Week or less: show cities
    if (days <= 365) return 'state'     // Up to a year: show states/regions
    return 'country'                    // More than a year: show countries
  }

  private async processLocationsForTimeRange(timeRange: TimeRange): Promise<LocationNameItem[]> {
    if (!this.arcData || this.arcData.length === 0) return []

    const { start, end } = timeRange
    const timeSpan = end - start
    const detailLevel = this.getDetailLevel(timeSpan)
    
    // Filter points in time range
    const relevantPoints = this.arcData.filter(point => {
      const timestamp = point.time.getTime()
      return timestamp >= start && timestamp <= end
    })

    if (relevantPoints.length === 0) return []

    // Cluster nearby points to avoid too many labels
    const clusteredPoints = this.clusterPoints(relevantPoints, detailLevel)
    
    // Limit to max 50 locations as requested
    const limitedPoints = clusteredPoints.slice(0, 50)
    
    // Process each unique location
    const locationItems: LocationNameItem[] = []
    const processedLocations = new Set<string>()
    
    for (const point of limitedPoints) {
      const locationKey = `${Math.round(point.lat * 100)},${Math.round(point.lng * 100)}`
      
      if (processedLocations.has(locationKey)) continue
      processedLocations.add(locationKey)
      
      try {
        const locationName = await this.reverseGeocode(point.lat, point.lng, detailLevel)
        const color = this.getLocationColor(locationName)
        
        locationItems.push({
          id: point.time.getTime(),
          layerId: this.id,
          timestamp: point.time.getTime(),
          lat: point.lat,
          lng: point.lng,
          locationName,
          locationLevel: detailLevel,
          color
        })
      } catch (error) {
        console.warn('Failed to process location:', error)
      }
    }
    
    return locationItems
  }

  private clusterPoints(points: ArcPoint[], detailLevel: 'city' | 'state' | 'country'): ArcPoint[] {
    if (points.length === 0) return []
    
    // Define clustering distance based on detail level (in degrees)
    const clusterDistance = {
      city: 0.01,     // ~1km
      state: 0.1,     // ~10km  
      country: 1.0    // ~100km
    }[detailLevel]
    
    const clusters: ArcPoint[][] = []
    const processed = new Set<number>()
    
    for (let i = 0; i < points.length; i++) {
      if (processed.has(i)) continue
      
      const cluster = [points[i]]
      processed.add(i)
      
      for (let j = i + 1; j < points.length; j++) {
        if (processed.has(j)) continue
        
        const distance = Math.sqrt(
          Math.pow(points[i].lat - points[j].lat, 2) +
          Math.pow(points[i].lng - points[j].lng, 2)
        )
        
        if (distance <= clusterDistance) {
          cluster.push(points[j])
          processed.add(j)
        }
      }
      
      clusters.push(cluster)
    }
    
    // Return representative point from each cluster (could be centroid, but using first for now)
    return clusters.map(cluster => cluster[0])
  }

  public async getItems(timeRange: TimeRange): Promise<LocationNameItem[]> {
    return await this.processLocationsForTimeRange(timeRange)
  }

  draw(
    ctx: CanvasRenderingContext2D,
    timeRange: TimeRange,
    width: number,
    height: number,
    timestampToX: (timestamp: number) => number,
  ): void {
    if (!this.isVisible) return

    // This is async, so we'll need to handle it differently
    // For now, we'll draw a placeholder and update asynchronously
    this.drawAsync(ctx, timeRange, width, height, timestampToX)
  }

  private async drawAsync(
    ctx: CanvasRenderingContext2D,
    timeRange: TimeRange,
    width: number,
    height: number,
    timestampToX: (timestamp: number) => number,
  ): Promise<void> {
    try {
      const items = await this.getItems(timeRange)
      
      ctx.save()
      ctx.font = '12px "IBM Plex Mono", monospace'
      ctx.textBaseline = 'middle'
      
      const yPosition = height - 50 // Position near bottom
      
      for (const item of items) {
        const x = timestampToX(item.timestamp)
        
        // Skip if outside visible area
        if (x < 0 || x > width) continue
        
        // Draw colored background for the text
        ctx.fillStyle = item.color
        ctx.globalAlpha = 0.3
        const textMetrics = ctx.measureText(item.locationName)
        const padding = 4
        ctx.fillRect(
          x - textMetrics.width / 2 - padding,
          yPosition - 8,
          textMetrics.width + padding * 2,
          16
        )
        
        // Draw the text
        ctx.globalAlpha = 1.0
        ctx.fillStyle = '#ffffff'
        ctx.textAlign = 'center'
        ctx.fillText(item.locationName, x, yPosition)
        
        // Draw a small dot marker
        ctx.fillStyle = item.color
        ctx.beginPath()
        ctx.arc(x, yPosition - 20, 3, 0, 2 * Math.PI)
        ctx.fill()
      }
      
      ctx.restore()
    } catch (error) {
      console.error('Failed to draw location names:', error)
    }
  }

  findClosestItem(
    _canvasX: number,
    _canvasY: number,
    _timeRange: TimeRange,
    _timestampToX: (timestamp: number) => number,
    _height: number,
    _width: number,
    _xToTimestamp?: (x: number) => number,
  ): LocationNameItem | null {
    // For now, return null as this layer is primarily for display
    // Can be enhanced later for interaction
    return null
  }
} 