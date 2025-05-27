import React, { useEffect, useRef, useState, useCallback } from 'react'
import MetadataPanel from './MetadataPanel'
import { Layer, SelectedItem } from './layers/LayerTypes'
import { SunlightLayer } from './layers/SunlightLayer'
import { CurrentTimeIndicatorLayer } from './layers/CurrentTimeIndicatorLayer'
import { MoonPhaseLayer } from './layers/MoonPhaseLayer'
import { TimeMarkersLayer } from './layers/TimeMarkersLayer'
import { ArcPointLayer } from './layers/ArcPointLayer'
import { ArcPoint } from '../../../types'

const MS_PER_YEAR = 31536000000
const MIN_ZOOM = 0.01
const MAX_ZOOM = 8760

interface TimelinePanelProps {
  width?: number
  height?: number
}

export const TimelinePanel: React.FC<TimelinePanelProps> = ({
  width = window.innerWidth,
  height = window.innerHeight,
}): JSX.Element => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [zoom, setZoom] = useState(1)
  const [centerTimestamp, setCenterTimestamp] = useState(Date.now())
  const [isDragging, setIsDragging] = useState(false)
  const [lastMouseX, setLastMouseX] = useState(0)

  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null)
  const [isMetadataPanelVisible, setIsMetadataPanelVisible] = useState(false)

  const [layers, setLayers] = useState<Layer[]>(() => {
    const initial: Layer[] = [
      new SunlightLayer(),
      new CurrentTimeIndicatorLayer(),
      new MoonPhaseLayer(),
      new TimeMarkersLayer(),
      new ArcPointLayer([]),
    ]
    return initial.map((l) =>
      Object.assign(Object.create(Object.getPrototypeOf(l)), l),
    )
  })

  useEffect(() => {
    const handleLocationData = (
      _event: unknown,
      receivedData: ArcPoint[],
    ): void => {
      const processedData = receivedData.map((p) => ({
        ...p,
        time: new Date(p.time),
      }))

      setLayers((prevLayers) =>
        prevLayers.map((layer) => {
          if (layer.id === 'arcPoints' && layer instanceof ArcPointLayer) {
            const newLayer = Object.assign(
              Object.create(Object.getPrototypeOf(layer)),
              layer,
            )
            newLayer.setData(processedData)
            return newLayer
          }
          return layer
        }),
      )
    }

    window.electron.ipcRenderer.send('get-locations')
    window.electron.ipcRenderer.on('location-data', handleLocationData)

    return (): void => {
      window.electron.ipcRenderer.removeListener(
        'location-data',
        handleLocationData,
      )
    }
  }, [])

  const toggleLayerVisibility = useCallback((layerId: string) => {
    setLayers((prevLayers) =>
      prevLayers.map((layer) => {
        if (layer.id === layerId) {
          const newLayerState = Object.assign(
            Object.create(Object.getPrototypeOf(layer)),
            layer,
          )
          newLayerState.isVisible = !layer.isVisible
          return newLayerState
        }
        return layer
      }),
    )
  }, [])

  const getVisibleTimeRange = useCallback((): {
    start: number
    end: number
  } => {
    const timeWindow = MS_PER_YEAR / zoom
    return {
      start: centerTimestamp - timeWindow / 2,
      end: centerTimestamp + timeWindow / 2,
    }
  }, [centerTimestamp, zoom])

  const timestampToX = useCallback(
    (timestamp: number): number => {
      const { start, end } = getVisibleTimeRange()
      if (end === start) return 0
      return ((timestamp - start) / (end - start)) * width
    },
    [width, getVisibleTimeRange],
  )

  const render = useCallback((): void => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = '#111'
    ctx.fillRect(0, 0, width, height)

    const timeRange = getVisibleTimeRange()

    const sortedLayers = [...layers].sort(
      (a, b) => (a.zIndex || 0) - (b.zIndex || 0),
    )

    sortedLayers.forEach((layer) => {
      if (layer.isVisible) {
        layer.draw(ctx, timeRange, width, height, timestampToX)
      }
    })
  }, [width, height, getVisibleTimeRange, layers, timestampToX])

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const canvasX = e.clientX - rect.left
      const canvasY = e.clientY - rect.top
      const timeRange = getVisibleTimeRange()

      let clickedItem: SelectedItem | null = null
      let highestZIndex = -Infinity

      const interactiveLayers = layers
        .filter((layer) => layer.isVisible && layer.findClosestItem)
        .sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0))

      for (const layer of interactiveLayers) {
        const item = layer.findClosestItem!(
          canvasX,
          canvasY,
          timeRange,
          timestampToX,
          height,
          width,
        )
        if (item) {
          if ((layer.zIndex || 0) >= highestZIndex) {
            clickedItem = item as SelectedItem
            highestZIndex = layer.zIndex || 0
          }
        }
      }

      if (clickedItem) {
        setSelectedItem(clickedItem)
        setIsMetadataPanelVisible(true)
      } else {
        setSelectedItem(null)
        setIsMetadataPanelVisible(false)
      }
    },
    [layers, getVisibleTimeRange, timestampToX, height, width],
  )

  const handleWheel = useCallback(
    (e: WheelEvent): void => {
      e.preventDefault()
      const zoomFactor = 1.1
      const newZoom =
        e.deltaY > 0
          ? Math.max(MIN_ZOOM, zoom / zoomFactor)
          : Math.min(MAX_ZOOM, zoom * zoomFactor)

      setZoom(newZoom)
    },
    [zoom],
  )

  const handleMouseDown = useCallback((e: React.MouseEvent): void => {
    setIsDragging(true)
    setLastMouseX(e.clientX)
  }, [])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent): void => {
      if (!isDragging) return
      const deltaX = e.clientX - lastMouseX
      if (width === 0 || zoom === 0) return
      const timeDelta = (deltaX / width) * (MS_PER_YEAR / zoom)
      setCenterTimestamp(
        (prevCenterTimestamp) => prevCenterTimestamp - timeDelta,
      )
      setLastMouseX(e.clientX)
    },
    [isDragging, lastMouseX, width, zoom],
  )

  const handleMouseUp = useCallback((): void => {
    setIsDragging(false)
  }, [])

  useEffect((): (() => void) => {
    const canvas = canvasRef.current
    if (!canvas) return (): void => {}
    canvas.addEventListener('wheel', handleWheel)
    return (): void => {
      canvas.removeEventListener('wheel', handleWheel)
    }
  }, [handleWheel])

  useEffect((): void => {
    render()
  }, [render])

  return (
    <div
      style={{
        position: 'relative',
        width: `${width}px`,
        height: `${height}px`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          zIndex: 20,
          background: 'rgba(255, 255, 255, 0.1)',
          padding: '5px',
          borderRadius: '5px',
        }}
      >
        {layers.map((layer) => (
          <button
            key={layer.id}
            onClick={() => toggleLayerVisibility(layer.id)}
            style={{
              margin: '2px 5px',
              padding: '5px 8px',
              background: layer.isVisible ? '#4CAF50' : '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              opacity: layer.isVisible ? 1 : 0.7,
            }}
            title={`Toggle ${layer.name}`}
          >
            {layer.name} {layer.isVisible ? '' : '(Hidden)'}
          </button>
        ))}
      </div>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleCanvasClick}
        style={{ cursor: 'grab' }}
      />
      <MetadataPanel
        isVisible={isMetadataPanelVisible}
        metadata={
          selectedItem
            ? selectedItem.metadata || {
                id: selectedItem.id,
                layer: selectedItem.layerId,
                timestamp: selectedItem.timestamp
                  ? new Date(selectedItem.timestamp).toLocaleString()
                  : undefined,
                startTime: selectedItem.startTime
                  ? new Date(selectedItem.startTime).toLocaleString()
                  : undefined,
                endTime: selectedItem.endTime
                  ? new Date(selectedItem.endTime).toLocaleString()
                  : undefined,
                value:
                  selectedItem &&
                  Object.prototype.hasOwnProperty.call(selectedItem, 'value')
                    ? selectedItem.value
                    : undefined,
              }
            : {}
        }
        onClose={(): void => {
          setIsMetadataPanelVisible(false)
          setSelectedItem(null)
        }}
      />
    </div>
  )
}

export default TimelinePanel
