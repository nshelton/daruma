import React, { useEffect, useRef, useState, useCallback } from 'react'
import MetadataPanel from './MetadataPanel'
import {
  Layer,
  SelectedItem,
  TimeRange as LayerTimeRange,
} from './layers/LayerTypes'
import { SunlightLayer } from './layers/SunlightLayer'
import { CurrentTimeIndicatorLayer } from './layers/CurrentTimeIndicatorLayer'
import { MoonPhaseLayer } from './layers/MoonPhaseLayer'
import { TimeMarkersLayer } from './layers/TimeMarkersLayer'
import { ArcPointLayer, ArcPointItem } from './layers/ArcPointLayer'
import { EventLayer } from './layers/EventLayer'
import { LocationMovementLayer } from './layers/LocationMovementLayer'
import { ArcPoint, Event } from '../../../types'

const MS_PER_YEAR = 31536000000
const MIN_ZOOM = 0.01
const MAX_ZOOM = 8760
const DRAGGABLE_CURSOR_GRAB_WIDTH = 10 // Pixels to check for grabbing the cursor

interface TimelinePanelProps {
  width?: number
  height?: number
  arcPoints: ArcPoint[]
  events: Event[]
  onVisibleTimeRangeChange: (timeRange: LayerTimeRange) => void
  onArcPointSelect?: (point: ArcPoint) => void
}

export const TimelinePanel: React.FC<TimelinePanelProps> = ({
  width = window.innerWidth,
  height = window.innerHeight,
  arcPoints,
  events,
  onVisibleTimeRangeChange,
  onArcPointSelect,
}): JSX.Element => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [zoom, setZoom] = useState(1)
  const [centerTimestamp, setCenterTimestamp] = useState(Date.now())
  const [isDragging, setIsDragging] = useState(false)
  const [lastMouseX, setLastMouseX] = useState(0)

  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null)
  const [isMetadataPanelVisible, setIsMetadataPanelVisible] = useState(false)

  const [draggableCursorTime, setDraggableCursorTime] = useState<number | null>(
    null,
  ) // Timestamp for the draggable cursor
  const [isDraggingCursor, setIsDraggingCursor] = useState(false) // Is the cursor being dragged?

  const [layers, setLayers] = useState<Layer[]>(() => {
    const initial: Layer[] = [
      new TimeMarkersLayer(),
      new SunlightLayer(),
      new MoonPhaseLayer(),
      new ArcPointLayer([]),
      new LocationMovementLayer([]),
      new EventLayer([]),
      new CurrentTimeIndicatorLayer(),
    ]
    return initial.map((l) =>
      Object.assign(Object.create(Object.getPrototypeOf(l)), l),
    )
  })

  const getVisibleTimeRange = useCallback((): LayerTimeRange => {
    const timeWindow = MS_PER_YEAR / zoom
    return {
      start: centerTimestamp - timeWindow / 2,
      end: centerTimestamp + timeWindow / 2,
    }
  }, [centerTimestamp, zoom])

  useEffect(() => {
    const processedData = arcPoints.map((p) => ({
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
        if (layer.id === 'locationMovement' && layer instanceof LocationMovementLayer) {
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
  }, [arcPoints])

  useEffect(() => {
    const processedEvents = events.map((e) => ({
      ...e,
      start: new Date(e.start),
      end: new Date(e.end),
    }))
    setLayers((prevLayers) =>
      prevLayers.map((layer) => {
        if (layer.id === 'events' && layer instanceof EventLayer) {
          const newLayer = Object.assign(
            Object.create(Object.getPrototypeOf(layer)),
            layer,
          )
          newLayer.setData(processedEvents)
          return newLayer
        }
        return layer
      }),
    )
  }, [events])

  useEffect(() => {
    const currentVisibleRange = getVisibleTimeRange()
    onVisibleTimeRangeChange(currentVisibleRange)
  }, [centerTimestamp, zoom, getVisibleTimeRange, onVisibleTimeRangeChange])

  useEffect(() => {
    if (
      draggableCursorTime !== null &&
      layers &&
      setSelectedItem &&
      setIsMetadataPanelVisible
    ) {
      const arcPointLayer = layers.find(
        (layer) => layer.id === 'arcPoints' && layer instanceof ArcPointLayer,
      ) as ArcPointLayer | undefined

      if (
        arcPointLayer &&
        typeof arcPointLayer.findItemClosestToTime === 'function'
      ) {
        const closestItem =
          arcPointLayer.findItemClosestToTime(draggableCursorTime)

        if (closestItem) {
          setSelectedItem(closestItem) // Select the item
          setIsMetadataPanelVisible(true) // Show its metadata

          // If onArcPointSelect callback exists (for map panning), call it
          if (
            onArcPointSelect &&
            closestItem.lat !== undefined &&
            closestItem.lng !== undefined &&
            closestItem.id !== undefined
          ) {
            const arcPointToSelect: ArcPoint = {
              lat: closestItem.lat,
              lng: closestItem.lng,
              time: new Date(closestItem.id as number), // id is the timestamp
            }
            onArcPointSelect(arcPointToSelect)
          }
        } else {
          // Optional: If no point is close, clear selection or leave as is.
          // For now, we do nothing, existing selection (if any) remains.
          // Or, to clear it:
          // setSelectedItem(null);
          // setIsMetadataPanelVisible(false);
        }
      }
    }
    // Do not clear selection if draggableCursorTime becomes null, user might be just removing cursor
  }, [
    draggableCursorTime,
    layers,
    setSelectedItem,
    setIsMetadataPanelVisible,
    onArcPointSelect,
  ])

  const toggleLayerVisibility = useCallback((layerId: string): void => {
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

  const timestampToX = useCallback(
    (timestamp: number): number => {
      const { start, end } = getVisibleTimeRange()
      if (end === start) return 0
      return ((timestamp - start) / (end - start)) * width
    },
    [width, getVisibleTimeRange],
  )

  const xToTimestamp = useCallback(
    (xPos: number): number => {
      const { start, end } = getVisibleTimeRange()
      if (width === 0) return start // Avoid division by zero, return start or some default
      return (xPos / width) * (end - start) + start
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

    const timeRangeForDraw = getVisibleTimeRange()

    const sortedLayers = [...layers].sort(
      (a, b) => (a.zIndex || 0) - (b.zIndex || 0),
    )

    sortedLayers.forEach((layer) => {
      if (layer.isVisible) {
        layer.draw(ctx, timeRangeForDraw, width, height, timestampToX)
      }
    })

    // Draw the draggable cursor if it has a time
    if (draggableCursorTime !== null) {
      const cursorX = timestampToX(draggableCursorTime)
      if (cursorX >= 0 && cursorX <= width) {
        // Only draw if within canvas bounds
        ctx.save()
        ctx.beginPath()
        ctx.moveTo(cursorX, 0)
        ctx.lineTo(cursorX, height)
        ctx.strokeStyle = 'grey' // Color of the draggable cursor
        ctx.lineWidth = 2
        ctx.stroke()
        ctx.restore()
      }
    }
  }, [
    width,
    height,
    getVisibleTimeRange,
    layers,
    timestampToX,
    draggableCursorTime,
  ])

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas || isDraggingCursor || isDragging) return

      const rect = canvas.getBoundingClientRect()
      const canvasX = e.clientX - rect.left
      const canvasY = e.clientY - rect.top
      const timeRangeOnClick = getVisibleTimeRange()
      let clickedItem: SelectedItem | null = null
      let highestZIndex = -Infinity

      const interactiveLayers = layers
        .filter((layer) => layer.isVisible && layer.findClosestItem)
        .sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0))

      for (const layer of interactiveLayers) {
        const item = layer.findClosestItem!(
          canvasX,
          canvasY,
          timeRangeOnClick,
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

        if (onArcPointSelect && clickedItem.layerId === 'arcPoints') {
          const arcPointItem = clickedItem as ArcPointItem

          if (
            arcPointItem.lat !== undefined &&
            arcPointItem.lng !== undefined &&
            arcPointItem.id !== undefined
          ) {
            const arcPointToSelect: ArcPoint = {
              lat: arcPointItem.lat,
              lng: arcPointItem.lng,
              time: new Date(arcPointItem.id as number),
            }
            onArcPointSelect(arcPointToSelect)
          }
        }
      } else {
        setSelectedItem(null)
        setIsMetadataPanelVisible(false)
      }
    },
    [
      layers,
      getVisibleTimeRange,
      timestampToX,
      height,
      width,
      onArcPointSelect,
      setIsMetadataPanelVisible,
      setSelectedItem,
      isDragging,
      isDraggingCursor,
    ],
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
    [zoom, setZoom],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.addEventListener('wheel', handleWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>): void => {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      let clickedOnExistingCursorArea = false
      if (draggableCursorTime !== null) {
        const cursorLineX = timestampToX(draggableCursorTime)
        if (Math.abs(clickX - cursorLineX) < DRAGGABLE_CURSOR_GRAB_WIDTH / 2) {
          clickedOnExistingCursorArea = true
        }
      }
      if (clickedOnExistingCursorArea) {
        setIsDraggingCursor(true)
        setIsDragging(false)
      } else {
        if (draggableCursorTime === null) {
          const newCursorTime = xToTimestamp(clickX)
          setDraggableCursorTime(newCursorTime)
          setIsDraggingCursor(true)
          setIsDragging(false)
        } else {
          setIsDragging(true)
          setIsDraggingCursor(false)
        }
      }
      setLastMouseX(e.clientX)
    },
    [
      draggableCursorTime,
      timestampToX,
      xToTimestamp,
      setIsDraggingCursor,
      setDraggableCursorTime,
      setIsDragging,
      setLastMouseX,
      canvasRef,
      DRAGGABLE_CURSOR_GRAB_WIDTH,
      width,
    ],
  )

  const handleMouseMove = useCallback(
    (event: MouseEvent): void => {
      const canvas = canvasRef.current
      if (!canvas) return

      if (isDraggingCursor) {
        const rect = canvas.getBoundingClientRect()
        const x = event.clientX - rect.left
        const clampedX = Math.max(0, Math.min(x, width))
        setDraggableCursorTime(xToTimestamp(clampedX))
      } else if (isDragging) {
        const deltaX = event.clientX - lastMouseX
        if (width === 0 || zoom === 0) return
        const timeDelta = (deltaX / width) * (MS_PER_YEAR / zoom)
        setCenterTimestamp(
          (prevCenterTimestamp) => prevCenterTimestamp - timeDelta,
        )
        setLastMouseX(event.clientX)
      }
    },
    [
      isDraggingCursor,
      isDragging,
      xToTimestamp,
      setDraggableCursorTime,
      lastMouseX,
      width,
      zoom,
      MS_PER_YEAR,
      setCenterTimestamp,
      setLastMouseX,
      canvasRef,
    ],
  )

  const handleMouseUp = useCallback((): void => {
    if (isDraggingCursor) {
      setIsDraggingCursor(false)
    }
    if (isDragging) {
      setIsDragging(false)
    }
  }, [isDraggingCursor, isDragging, setIsDraggingCursor, setIsDragging])

  useEffect((): (() => void) => {
    if (isDragging || isDraggingCursor) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    } else {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    return (): void => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, isDraggingCursor, handleMouseMove, handleMouseUp])

  useEffect(() => {
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
          right: '10px',
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
              background: layer.isVisible ? '#fff' : '#000',
              color: layer.isVisible ? '#000' : '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              opacity: layer.isVisible ? 1 : 0.7,
            }}
            title={`Toggle ${layer.name}`}
          >
            {layer.name}
          </button>
        ))}
      </div>
      {/* Draggable Cursor Time Display */}
      {draggableCursorTime !== null && (
        <div
          style={{
            position: 'absolute',
            top: '10px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            padding: '5px 10px',
            borderRadius: '4px',
            zIndex: 30, // Above layers, below potential modals
            fontSize: '12px',
            whiteSpace: 'nowrap',
          }}
        >
          {new Date(draggableCursorTime).toLocaleString()}
        </div>
      )}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onMouseDown={handleMouseDown}
        onMouseLeave={() => {
          if (!isDragging && !isDraggingCursor) {
            handleMouseUp()
          }
        }}
        onClick={handleCanvasClick}
        style={{
          cursor: isDraggingCursor
            ? 'ew-resize'
            : isDragging
              ? 'grabbing'
              : 'grab',
        }}
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
