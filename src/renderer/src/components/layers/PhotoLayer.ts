import { Layer, TimeRange, LayerItem } from './LayerTypes'
import { PhotoPoint } from '../../../../types'

export interface PhotoItem extends LayerItem {
  timestamp: number
  lat: number
  lng: number
  camera?: string
  imgpath?: string
}

export class PhotoLayer implements Layer<PhotoItem> {
  id = 'photos'
  name = 'Photos'
  isVisible = true
  zIndex = 2
  private readonly yOffset = 100
  private readonly cameraColorCache: Map<string, string> = new Map()
  private readonly imageCache: Map<string, HTMLImageElement> = new Map()
  private readonly imageLoading: Set<string> = new Set()
  private readonly lastRequestTime: Map<string, number> = new Map()
  private readonly cacheOrder: string[] = []
  private readonly maxImageCache = 200
  private readonly requestCooldownMs = 1000

  private photoData: PhotoPoint[]

  constructor(data: PhotoPoint[]) {
    this.photoData = data
  }

  public setData(data: PhotoPoint[]): void {
    this.photoData = data
  }

  draw(
    ctx: CanvasRenderingContext2D,
    timeRange: TimeRange,
    width: number,
    height: number,
    timestampToX: (timestamp: number) => number,
  ): void {
    if (!this.isVisible || !this.photoData) return

    const { start, end } = timeRange
    const visibleData: PhotoPoint[] = this.photoData.filter(
      (p: PhotoPoint) => p.time.getTime() >= start && p.time.getTime() <= end,
    ) as PhotoPoint[]

    const maxPoints = 20
    let dataToDraw: PhotoPoint[] = visibleData
    if (visibleData.length > maxPoints && maxPoints > 0) {
      dataToDraw = [] as PhotoPoint[]
      const bucketSize = Math.ceil(visibleData.length / maxPoints)
      for (let i = 0; i < visibleData.length; i += bucketSize) {
        const bucket = visibleData.slice(i, i + bucketSize)
        const representativePoint: PhotoPoint = bucket[0] as PhotoPoint
        dataToDraw.push(representativePoint)
      }
    }

    ctx.save()
    const stackCounts: Map<number, number> = new Map()
    const radius = 12
    const boxSize = radius * 2
    const gap = 2
    const baseY = height - this.yOffset

    dataToDraw.forEach(point => {
      const pointTimestamp = point.time.getTime()
      const x = timestampToX(pointTimestamp)
      const xBin = Math.round(x)
      const stackIndex = stackCounts.get(xBin) ?? 0
      stackCounts.set(xBin, stackIndex + 1)

      const signedOffset = this.getAlternatingStackOffset(stackIndex)
      const y = baseY - signedOffset * (boxSize + gap)

      const imgpath = point.imgpath
      const img = imgpath ? this.imageCache.get(imgpath) : undefined
      if (!img && imgpath && !this.imageLoading.has(imgpath)) {
        const now = performance.now()
        const last = this.lastRequestTime.get(imgpath) ?? 0
        if (now - last > this.requestCooldownMs) {
          this.lastRequestTime.set(imgpath, now)
          this.loadImage(imgpath)
        }
      }

      if (img && img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
        if (imgpath) this.touchCacheKey(imgpath)
        ctx.drawImage(img, x - radius, y - radius, boxSize, boxSize)
      } else {
        ctx.beginPath()
        ctx.rect(x - radius, y - radius, boxSize, boxSize)
        ctx.fillStyle = this.getColorForCamera(point.camera)
        ctx.fill()
      }
    })
    ctx.restore()
  }

  private getColorForCamera(camera?: string): string {
    if (!camera || camera.length === 0) {
      return 'hsla(300, 85%, 55%, 0.9)'
    }
    const cached = this.cameraColorCache.get(camera)
    if (cached) return cached

    const unit = this.hashStringToUnitInterval(camera)
    // Map to hue range [300°, 420°) which wraps to [60°) via modulo
    const hue = Math.round((300 + 120 * unit) % 360)
    const color = `hsla(${hue}, 85%, 55%, 0.9)`
    this.cameraColorCache.set(camera, color)
    return color
  }

  private hashStringToUnitInterval(value: string): number {
    let hash = 0
    for (let i = 0; i < value.length; i++) {
      hash = (hash << 5) - hash + value.charCodeAt(i)
      hash |= 0
    }
    const unsigned = hash >>> 0
    return unsigned / 0xffffffff
  }

  findClosestItem(
    canvasX: number,
    canvasY: number,
    timeRange: TimeRange,
    timestampToX: (timestamp: number) => number,
    canvasHeight: number,
    _canvasWidth: number,
  ): PhotoItem | null {
    if (!this.photoData) return null

    const { start, end } = timeRange
    const visibleData: PhotoPoint[] = this.photoData.filter(
      (p: PhotoPoint) => p.time.getTime() >= start && p.time.getTime() <= end,
    ) as PhotoPoint[]
    if (visibleData.length === 0) return null

    // Mirror draw logic for downsampling and stacking so hit-testing matches visuals
    const maxPoints = 20
    let dataToDraw: PhotoPoint[] = visibleData
    if (visibleData.length > maxPoints && maxPoints > 0) {
      dataToDraw = [] as PhotoPoint[]
      const bucketSize = Math.ceil(visibleData.length / maxPoints)
      for (let i = 0; i < visibleData.length; i += bucketSize) {
        const bucket = visibleData.slice(i, i + bucketSize)
        const representativePoint: PhotoPoint = bucket[0] as PhotoPoint
        dataToDraw.push(representativePoint)
      }
    }

    const stackCounts: Map<number, number> = new Map()
    const radius = 12
    const boxSize = radius * 2
    const gap = 2
    const baseY = canvasHeight - this.yOffset

    const maxDistance = 15
    let minDistance = Infinity
    let bestIndex = -1

    for (let i = 0; i < dataToDraw.length; i++) {
      const p = dataToDraw[i]
      const t = p.time.getTime()
      const px = timestampToX(t)
      const xBin = Math.round(px)
      const stackIndex = stackCounts.get(xBin) ?? 0
      stackCounts.set(xBin, stackIndex + 1)
      const signedOffset = this.getAlternatingStackOffset(stackIndex)
      const py = baseY - signedOffset * (boxSize + gap)

      const distance = Math.sqrt(Math.pow(px - canvasX, 2) + Math.pow(py - canvasY, 2))
      if (distance < maxDistance && distance < minDistance) {
        minDistance = distance
        bestIndex = i
      }
    }

    if (bestIndex !== -1) {
      const candidate = dataToDraw[bestIndex]
      const pointTimestamp = candidate.time.getTime()
      const item: PhotoItem = {
        id: candidate.id ?? pointTimestamp,
        layerId: this.id,
        timestamp: pointTimestamp,
        lat: candidate.lat,
        lng: candidate.lng,
        camera: candidate.camera,
        imgpath: candidate.imgpath,
        metadata: {
          originalTime: candidate.time.toISOString(),
          latitude: candidate.lat,
          longitude: candidate.lng,
          camera: candidate.camera,
          imgpath: candidate.imgpath,
        },
      }
      return item
    }
    return null
  }

  private getAlternatingStackOffset(index: number): number {
    if (index === 0) return 0
    const magnitude = Math.ceil(index / 2)
    const isPositive = index % 2 === 1
    return isPositive ? magnitude : -magnitude
  }

  private loadImage(imgpath: string): void {
    this.imageLoading.add(imgpath)
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    window.electron.ipcRenderer
      .invoke('read-image', imgpath)
      .then((dataUrl: string | null) => {
        if (!dataUrl) return
        const image = new Image()
        image.onload = (): void => {
          this.imageCache.set(imgpath, image)
          this.touchCacheKey(imgpath)
          // Evict least-recently-added if over capacity
          while (this.cacheOrder.length > this.maxImageCache) {
            const oldest = this.cacheOrder.shift()
            if (oldest && oldest !== imgpath) {
              this.imageCache.delete(oldest)
            }
          }
          this.imageLoading.delete(imgpath)
        }
        image.onerror = (): void => {
          this.imageLoading.delete(imgpath)
        }
        image.src = dataUrl
      })
      .catch(() => {
        this.imageLoading.delete(imgpath)
      })
  }

  private touchCacheKey(key: string): void {
    const idx = this.cacheOrder.indexOf(key)
    if (idx !== -1) this.cacheOrder.splice(idx, 1)
    this.cacheOrder.push(key)
  }
}
