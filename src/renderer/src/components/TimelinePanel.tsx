import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import MetadataPanel from './MetadataPanel'
import LayerVisibilityPanel from './LayerVisibilityPanel'
import { Layer, SelectedItem, TimeRange as LayerTimeRange } from './layers/LayerTypes'
import { SunlightLayer } from './layers/SunlightLayer'
import { CurrentTimeIndicatorLayer } from './layers/CurrentTimeIndicatorLayer'
import { MoonPhaseLayer } from './layers/MoonPhaseLayer'
import { TimeMarkersLayer } from './layers/TimeMarkersLayer'
import { ArcPointLayer, ArcPointItem } from './layers/ArcPointLayer'
import { EventLayer } from './layers/EventLayer'
import { LocationMovementLayer } from './layers/LocationMovementLayer'
import { ArcPoint, Event, CustomEvent } from '../../../types'
import { CustomEventsLayer, CustomEventItem } from './layers/CustomEventsLayer'

const MS_PER_YEAR = 31536000000
const MIN_ZOOM = 0.01
const MAX_ZOOM = 8760

interface TimelinePanelProps {
  width?: number
  height?: number
  arcPoints: ArcPoint[]
  events: Event[]
  customEvents: CustomEvent[]
  onVisibleTimeRangeChange: (timeRange: LayerTimeRange) => void
  onArcPointSelect?: (point: ArcPoint) => void
}

export const TimelinePanel: React.FC<TimelinePanelProps> = ({
  width = window.innerWidth,
  height = window.innerHeight,
  arcPoints,
  events,
  customEvents,
  onVisibleTimeRangeChange,
  onArcPointSelect,
}): JSX.Element => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [zoom, setZoom] = useState(1)
  const [centerTimestamp, setCenterTimestamp] = useState(Date.now())
  const [isDragging, setIsDragging] = useState(false)
  const [lastMouseX, setLastMouseX] = useState(0)

  const [draggedItem, setDraggedItem] = useState<
    (CustomEventItem & { part: 'left' | 'right' | 'body' }) | null
  >(null)

  const [hoveredItem, setHoveredItem] = useState<
    (CustomEventItem & { part: 'left' | 'right' | 'body' }) | null
  >(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null)
  const [selectedCustomEvent, setSelectedCustomEvent] = useState<CustomEventItem | null>(null)
  const [isMetadataPanelVisible, setIsMetadataPanelVisible] = useState(false)

  const [draggableCursorTime, setDraggableCursorTime] = useState<number | null>(null) // Timestamp for the draggable cursor
  const [isDraggingCursor, setIsDraggingCursor] = useState(false) // Is the cursor being dragged?

  const [layers, setLayers] = useState<Layer[]>(() => {
    const initial: Layer[] = [
      new TimeMarkersLayer(),
      new SunlightLayer(),
      new MoonPhaseLayer(),
      new ArcPointLayer([]),
      new LocationMovementLayer([]),
      new EventLayer([]),
      new CustomEventsLayer(),
      new CurrentTimeIndicatorLayer(),
    ]
    return initial.map(l => Object.assign(Object.create(Object.getPrototypeOf(l)), l))
  })

  const getVisibleTimeRange = useCallback((): LayerTimeRange => {
    const timeWindow = MS_PER_YEAR / zoom
    return {
      start: centerTimestamp - timeWindow / 2,
      end: centerTimestamp + timeWindow / 2,
    }
  }, [centerTimestamp, zoom])

  const updateCustomEvent = (updatedEvent: CustomEvent): void => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => {
      window.electron.ipcRenderer.send('update-custom-event', updatedEvent)
    }, 500) // 500ms debounce
  }

  useEffect(() => {
    const processedData = arcPoints.map(p => ({
      ...p,
      time: new Date(p.time),
    }))
    setLayers(prevLayers =>
      prevLayers.map(layer => {
        if (layer.id === 'arcPoints' && layer instanceof ArcPointLayer) {
          const newLayer = Object.assign(Object.create(Object.getPrototypeOf(layer)), layer)
          newLayer.setData(processedData)
          return newLayer
        }
        if (layer.id === 'locationMovement' && layer instanceof LocationMovementLayer) {
          const newLayer = Object.assign(Object.create(Object.getPrototypeOf(layer)), layer)
          newLayer.setData(processedData)
          return newLayer
        }
        return layer
      }),
    )
  }, [arcPoints])

  useEffect(() => {
    setLayers(prevLayers =>
      prevLayers.map(layer => {
        if (layer.id === 'customEvents' && layer instanceof CustomEventsLayer) {
          const newLayer = Object.assign(Object.create(Object.getPrototypeOf(layer)), layer)
          newLayer.setData(customEvents)
          return newLayer
        }
        return layer
      }),
    )
  }, [customEvents])

  const handleAddCustomEvent = useCallback(() => {
    const newEvent: Omit<CustomEvent, 'id'> = {
      title: 'New Event',
      color: '#FF0000', // Default color
      startTime: centerTimestamp - 1000 * 60 * 30, // 30 minutes before center
      endTime: centerTimestamp + 1000 * 60 * 30, // 30 minutes after center
      y: 100, // Default y position from bottom
    }
    window.electron.ipcRenderer.send('create-custom-event', newEvent)
  }, [centerTimestamp])

  useEffect(() => {
    const processedEvents = events.map(e => ({
      ...e,
      start: new Date(e.start),
      end: new Date(e.end),
    }))
    setLayers(prevLayers =>
      prevLayers.map(layer => {
        if (layer.id === 'events' && layer instanceof EventLayer) {
          const newLayer = Object.assign(Object.create(Object.getPrototypeOf(layer)), layer)
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
    if (draggableCursorTime !== null && layers && setSelectedItem && setIsMetadataPanelVisible) {
      const arcPointLayer = layers.find(
        layer => layer.id === 'arcPoints' && layer instanceof ArcPointLayer,
      ) as ArcPointLayer | undefined

      if (arcPointLayer && typeof arcPointLayer.findItemClosestToTime === 'function') {
        const closestItem = arcPointLayer.findItemClosestToTime(draggableCursorTime)

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
  }, [draggableCursorTime, layers, setSelectedItem, setIsMetadataPanelVisible, onArcPointSelect])

  const toggleLayerVisibility = useCallback((layerId: string): void => {
    setLayers(prevLayers =>
      prevLayers.map(layer => {
        if (layer.id === layerId) {
          const newLayerState = Object.assign(Object.create(Object.getPrototypeOf(layer)), layer)
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
    (x: number): number => {
      const { start, end } = getVisibleTimeRange()
      const timeWindow = end - start
      return start + (x / width) * timeWindow
    },
    [getVisibleTimeRange, width],
  )

  const findClickedItem = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return null

      const rect = canvas.getBoundingClientRect()
      const canvasX = e.clientX - rect.left
      const canvasY = e.clientY - rect.top
      const timeRangeOnClick = getVisibleTimeRange()

      const commonArgs = [
        canvasX,
        canvasY,
        timeRangeOnClick,
        timestampToX,
        height,
        width,
        xToTimestamp,
      ] as const

      // Prioritize CustomEventsLayer
      const customEventsLayer = layers.find(
        l => l.id === 'customEvents' && l.isVisible && l.findClosestItem,
      )
      if (customEventsLayer) {
        const item = customEventsLayer.findClosestItem!(...commonArgs)
        if (item) {
          return item as SelectedItem
        }
      }

      // Then check other layers, sorted by zIndex
      const otherLayers = layers
        .filter(layer => layer.id !== 'customEvents' && layer.isVisible && layer.findClosestItem)
        .sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0))

      for (const layer of otherLayers) {
        const item = layer.findClosestItem!(...commonArgs)
        if (item) {
          return item as SelectedItem // First one found wins
        }
      }

      return null
    },
    [layers, getVisibleTimeRange, timestampToX, height, width, xToTimestamp],
  )

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (isDraggingCursor || isDragging) return

      const clickedItem = findClickedItem(e)

      if (clickedItem) {
        if (clickedItem.layerId === 'customEvents') {
          setSelectedCustomEvent(clickedItem as CustomEventItem)
        } else {
          setSelectedCustomEvent(null)
        }
        setSelectedItem(clickedItem)
        setIsMetadataPanelVisible(true)
        if (clickedItem.layerId === 'arcPoints' && onArcPointSelect) {
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
        setSelectedCustomEvent(null)
        setIsMetadataPanelVisible(false)
      }
    },
    [findClickedItem, onArcPointSelect],
  )

  const render = useCallback((): void => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = '#111'
    ctx.fillRect(0, 0, width, height)

    const timeRangeForDraw = getVisibleTimeRange()

    const sortedLayers = [...layers].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))

    sortedLayers.forEach(layer => {
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
  }, [width, height, getVisibleTimeRange, layers, timestampToX, draggableCursorTime])

  const handleWheel = useCallback(
    (e: WheelEvent): void => {
      e.preventDefault()
      const zoomFactor = 1.1
      const newZoom =
        e.deltaY > 0 ? Math.max(MIN_ZOOM, zoom / zoomFactor) : Math.min(MAX_ZOOM, zoom * zoomFactor)
      setZoom(newZoom)
    },
    [zoom, setZoom],
  )

  useEffect((): (() => void) => {
    const canvas = canvasRef.current
    if (!canvas) return () => {}
    canvas.addEventListener('wheel', handleWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>): void => {
      const { clientX } = event
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const canvasX = clientX - rect.left

      if (hoveredItem && selectedCustomEvent) {
        setDraggedItem(hoveredItem)
        return
      }

      // Check for current time indicator drag
      const visibleTimeRange = getVisibleTimeRange()
      const currentTimeIndicatorLayer = layers.find(
        l => l.id === 'currentTime' && l instanceof CurrentTimeIndicatorLayer,
      ) as CurrentTimeIndicatorLayer | undefined

      if (currentTimeIndicatorLayer?.isDraggable(canvasX, visibleTimeRange, timestampToX)) {
        setIsDraggingCursor(true)
        setDraggableCursorTime(xToTimestamp(canvasX))
        setLastMouseX(clientX)
        return
      }

      // If nothing else is interactive, start panning
      setIsDragging(true)
      setLastMouseX(clientX)
    },
    [hoveredItem, selectedCustomEvent, getVisibleTimeRange, layers, timestampToX, xToTimestamp],
  )

  const handleMouseMove = useCallback(
    (event: MouseEvent): void => {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const canvasX = event.clientX - rect.left
      const canvasY = event.clientY - rect.top
      const visibleTimeRange = getVisibleTimeRange()

      if (draggedItem && selectedCustomEvent) {
        const timeAtMouse = xToTimestamp(canvasX)
        const customEventsLayer = layers.find(
          l => l.id === 'customEvents' && l instanceof CustomEventsLayer,
        ) as CustomEventsLayer

        if (customEventsLayer) {
          const events = customEventsLayer.getEvents()
          const eventToUpdate = events.find(e => e.id === draggedItem.id)
          if (eventToUpdate) {
            switch (draggedItem.part) {
              case 'left':
                eventToUpdate.startTime = timeAtMouse
                break
              case 'right':
                eventToUpdate.endTime = timeAtMouse
                break
              case 'body': {
                const itemStartTime = draggedItem.startTime!
                const itemEndTime = draggedItem.endTime!
                const duration = itemEndTime - itemStartTime
                eventToUpdate.startTime = timeAtMouse - duration / 2
                eventToUpdate.endTime = timeAtMouse + duration / 2
                eventToUpdate.y = height - canvasY - 10 // Quick implementation for y-drag
                break
              }
            }
            customEventsLayer.setData([...events]) // force re-render
            render()
          }
        }
      } else if (isDraggingCursor) {
        const time = xToTimestamp(event.clientX - rect.left)
        setDraggableCursorTime(time)
      } else if (isDragging) {
        const deltaX = event.clientX - lastMouseX
        if (width === 0 || zoom === 0) return
        const timeDelta = (deltaX / width) * (MS_PER_YEAR / zoom)
        setCenterTimestamp(prev => prev - timeDelta)
        setLastMouseX(event.clientX)
      } else {
        // Hover logic
        if (selectedCustomEvent) {
          const customEventsLayer = layers.find(
            l => l.id === 'customEvents' && l instanceof CustomEventsLayer,
          ) as CustomEventsLayer
          if (customEventsLayer) {
            const foundItem = customEventsLayer.findClosestItem(
              canvasX,
              canvasY,
              visibleTimeRange,
              timestampToX,
              height,
              width,
              xToTimestamp,
            )
            if (foundItem && foundItem.id === selectedCustomEvent.id) {
              setHoveredItem(foundItem)
            } else {
              setHoveredItem(null)
            }
          }
        } else {
          setHoveredItem(null)
        }
      }
    },
    [
      isDraggingCursor,
      isDragging,
      xToTimestamp,
      lastMouseX,
      width,
      zoom,
      setCenterTimestamp,
      draggedItem,
      layers,
      selectedCustomEvent,
      height,
      render,
    ],
  )

  const handleMouseUp = useCallback((): void => {
    if (draggedItem) {
      const customEventsLayer = layers.find(
        l => l.id === 'customEvents' && l instanceof CustomEventsLayer,
      ) as CustomEventsLayer | undefined

      if (customEventsLayer) {
        const allEvents = customEventsLayer.getEvents()
        const updatedEvent = allEvents.find(e => e.id === draggedItem.id)
        if (updatedEvent) {
          updateCustomEvent(updatedEvent)
        }
      }
      setDraggedItem(null)
    }
    if (isDraggingCursor) {
      setIsDraggingCursor(false)
    }
    if (isDragging) {
      setIsDragging(false)
    }
  }, [isDragging, isDraggingCursor, draggedItem, layers, updateCustomEvent])

  useEffect((): (() => void) => {
    // Always listen to mouse move for hover effects
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return (): void => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])

  useEffect(() => {
    render()
  }, [render])

  const cursorStyle = useMemo(() => {
    if (hoveredItem && (hoveredItem.part === 'left' || hoveredItem.part === 'right')) {
      return 'ew-resize'
    }
    if (hoveredItem && hoveredItem.part === 'body') {
      return 'move'
    }
    if (isDraggingCursor) {
      return 'ew-resize'
    }
    if (isDragging) {
      return 'grabbing'
    }
    return 'grab'
  }, [hoveredItem, isDraggingCursor, isDragging])

  return (
    <div
      style={{
        position: 'relative',
        width: `${width}px`,
        height: `${height}px`,
      }}
    >
      <button
        onClick={handleAddCustomEvent}
        style={{
          position: 'absolute',
          top: '50px',
          right: '10px',
          zIndex: 20,
          padding: '5px 10px',
        }}
      >
        Add Custom Event
      </button>
      <LayerVisibilityPanel layers={layers} onToggle={toggleLayerVisibility} />
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
          cursor: cursorStyle,
        }}
      />
      <MetadataPanel
        isVisible={isMetadataPanelVisible}
        metadata={selectedItem}
        onClose={(): void => {
          setIsMetadataPanelVisible(false)
          setSelectedItem(null)
        }}
        onUpdate={updatedData => {
          if (selectedItem && selectedItem.layerId === 'customEvents') {
            const updatedItem = {
              ...selectedItem,
              ...updatedData,
            }
            const eventToUpdate: CustomEvent = {
              id: updatedItem.id as number,
              title: updatedItem.title as string,
              color: updatedItem.color as string,
              startTime: updatedItem.startTime as number,
              endTime: updatedItem.endTime as number,
              y: updatedItem.y as number,
            }
            updateCustomEvent(eventToUpdate)
            setSelectedItem(updatedItem)
          }
        }}
        onDelete={id => {
          window.electron.ipcRenderer.send('delete-custom-event', id)
        }}
      />
    </div>
  )
}

export default TimelinePanel
