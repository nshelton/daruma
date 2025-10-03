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
import { ArcPoint, Event, CustomEvent, PhotoPoint } from '../../../types'
import { PhotoLayer } from './layers/PhotoLayer'
import { CustomEventsLayer, CustomEventItem } from './layers/CustomEventsLayer'

const MS_PER_YEAR = 31536000000
const MIN_ZOOM = 0.01
const MAX_ZOOM = 8760
const MIN_DATE_1991 = new Date('1991-01-01').getTime() // Minimum date: January 1, 1991

interface TimelinePanelProps {
  width?: number
  height?: number
  arcPoints: ArcPoint[]
  photos?: PhotoPoint[]
  events: Event[]
  customEvents: CustomEvent[]
  onVisibleTimeRangeChange: (timeRange: LayerTimeRange) => void
  onArcPointSelect?: (point: ArcPoint) => void
}

export const TimelinePanel: React.FC<TimelinePanelProps> = ({
  width = window.innerWidth,
  height = window.innerHeight,
  arcPoints,
  photos = [],
  events,
  customEvents,
  onVisibleTimeRangeChange,
  onArcPointSelect,
}): JSX.Element => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [zoom, setZoom] = useState(1)
  const [centerTimestamp, setCenterTimestamp] = useState(Math.max(Date.now(), MIN_DATE_1991))
  const [isDragging, setIsDragging] = useState(false)
  const [lastMouseX, setLastMouseX] = useState(0)

  const [draggedItem, setDraggedItem] = useState<
    (CustomEventItem & { part: 'left' | 'right' | 'body' | 'top' | 'bottom' }) | null
  >(null)

  const [dragOffset, setDragOffset] = useState<{ timeOffset: number; yOffset: number } | null>(null)

  const [hoveredItem, setHoveredItem] = useState<
    (CustomEventItem & { part: 'left' | 'right' | 'body' | 'top' | 'bottom' }) | null
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
      new PhotoLayer([]),
      new LocationMovementLayer([]),
      new EventLayer([]),
      new CustomEventsLayer(),
      new CurrentTimeIndicatorLayer(),
    ]
    return initial.map(l => Object.assign(Object.create(Object.getPrototypeOf(l)), l))
  })

  const getVisibleTimeRange = useCallback((): LayerTimeRange => {
    const timeWindow = MS_PER_YEAR / zoom
    let start = centerTimestamp - timeWindow / 2
    let end = centerTimestamp + timeWindow / 2

    // Ensure the timeline never shows anything before 1991
    if (start < MIN_DATE_1991) {
      const shift = MIN_DATE_1991 - start
      start = MIN_DATE_1991
      end = end + shift // Shift the end forward to maintain the same time window size
    }

    return {
      start,
      end,
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
          layer.setData(processedData)
          return layer
        }
        if (layer.id === 'locationMovement' && layer instanceof LocationMovementLayer) {
          layer.setData(processedData)
          return layer
        }
        return layer
      }),
    )
  }, [arcPoints])

  useEffect(() => {
    const processedPhotos = photos.map(p => ({
      ...p,
      time: new Date(p.time),
    }))
    console.log('TimelinePanel setting PhotoLayer data count:', processedPhotos.length)
    setLayers(prevLayers =>
      prevLayers.map(layer => {
        if (layer.id === 'photos' && layer instanceof PhotoLayer) {
          layer.setData(processedPhotos)
          return layer
        }
        return layer
      }),
    )
  }, [photos])

  useEffect(() => {
    // Don't update layer data from database if currently dragging
    if (draggedItem) return
    
    setLayers(prevLayers =>
      prevLayers.map(layer => {
        if (layer.id === 'customEvents' && layer instanceof CustomEventsLayer) {
          layer.setData(customEvents)
          // Update selected event ID
          layer.setSelectedEventId(selectedCustomEvent?.id ? Number(selectedCustomEvent.id) : null)
          // Update hovered event and part
          layer.setHoveredEvent(
            hoveredItem?.id ? Number(hoveredItem.id) : null,
            hoveredItem?.part || null
          )
          return layer
        }
        return layer
      }),
    )
  }, [customEvents, draggedItem, selectedCustomEvent, hoveredItem])

  const handleAddCustomEvent = useCallback(() => {
    const newEvent: Omit<CustomEvent, 'id'> = {
      title: 'New Event',
      color: '#FF0000', // Default color
      startTime: centerTimestamp - 1000 * 60 * 30, // 30 minutes before center
      endTime: centerTimestamp + 1000 * 60 * 30, // 30 minutes after center
      y: 100, // Default y position from bottom
      height: 20, // Default height
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
          layer.setData(processedEvents)
          return layer
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

      const canvas = canvasRef.current
      if (!canvas || width === 0) {
        setZoom(newZoom)
        return
      }
      const rect = canvas.getBoundingClientRect()
      const canvasX = e.clientX - rect.left
      const ratio = Math.min(1, Math.max(0, canvasX / width))

      const { start, end } = getVisibleTimeRange()
      const timeWindowNew = MS_PER_YEAR / newZoom
      const timeAtMouse = start + ratio * (end - start)
      const newCenter = timeAtMouse + (0.5 - ratio) * timeWindowNew

      setCenterTimestamp(newCenter)
      setZoom(newZoom)
    },
    [zoom, setZoom, setCenterTimestamp, width, getVisibleTimeRange],
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
      const canvasY = event.clientY - rect.top

      if (hoveredItem && selectedCustomEvent) {
        // Calculate the offset for all drag operations
        const mouseTime = xToTimestamp(canvasX)
        // Calculate Y offset: canvas Y is from top, item.y is from bottom
        // Event top position in canvas coordinates: height - item.y - eventHeight
        // Event center position in canvas coordinates: height - item.y - eventHeight/2
        const eventHeight = hoveredItem.height || 20 // Use dynamic height or default
        const eventTopY = height - hoveredItem.y - eventHeight
        const yOffset = canvasY - eventTopY
        
        if (hoveredItem.part === 'body') {
          const timeOffset = mouseTime - hoveredItem.startTime!
          setDragOffset({ timeOffset, yOffset })
        } else if (hoveredItem.part === 'left') {
          const timeOffset = mouseTime - hoveredItem.startTime!
          setDragOffset({ timeOffset, yOffset })
        } else if (hoveredItem.part === 'right') {
          const timeOffset = mouseTime - hoveredItem.endTime!
          setDragOffset({ timeOffset, yOffset })
        } else if (hoveredItem.part === 'top') {
          // For top edge, we don't need time offset, just Y offset from the top edge
          const topEdgeY = height - hoveredItem.y - hoveredItem.height
          const yOffset = canvasY - topEdgeY
          setDragOffset({ timeOffset: 0, yOffset })
        } else if (hoveredItem.part === 'bottom') {
          // For bottom edge, we don't need time offset, just Y offset from the bottom edge
          const bottomEdgeY = height - hoveredItem.y
          const yOffset = canvasY - bottomEdgeY
          setDragOffset({ timeOffset: 0, yOffset })
        }
        
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
    [hoveredItem, selectedCustomEvent, getVisibleTimeRange, layers, timestampToX, xToTimestamp, height],
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
        const customEventsLayer = layers.find(
          l => l.id === 'customEvents' && l instanceof CustomEventsLayer,
        ) as CustomEventsLayer

        if (customEventsLayer) {
          const events = customEventsLayer.getEvents()
          const eventToUpdate = events.find(e => e.id === draggedItem.id)
          if (eventToUpdate) {
            switch (draggedItem.part) {
              case 'left': {
                const leftTime = dragOffset ? xToTimestamp(canvasX) - dragOffset.timeOffset : xToTimestamp(canvasX)
                eventToUpdate.startTime = leftTime
                // Apply Y offset for left handle dragging too
                if (dragOffset) {
                  // Convert from canvas Y to item.y coordinate system
                  const newEventTopY = canvasY - dragOffset.yOffset
                  const eventHeight = draggedItem.height || 20 // Use dynamic height or default
                  const newY = height - newEventTopY - eventHeight
                  eventToUpdate.y = Math.max(0, newY)
                }
                break
              }
              case 'right': {
                const rightTime = dragOffset ? xToTimestamp(canvasX) - dragOffset.timeOffset : xToTimestamp(canvasX)
                eventToUpdate.endTime = rightTime
                // Apply Y offset for right handle dragging too
                if (dragOffset) {
                  // Convert from canvas Y to item.y coordinate system
                  const newEventTopY = canvasY - dragOffset.yOffset
                  const eventHeight = draggedItem.height || 20 // Use dynamic height or default
                  const newY = height - newEventTopY - eventHeight
                  eventToUpdate.y = Math.max(0, newY)
                }
                break
              }
              case 'body': {
                const timeAtMouse = xToTimestamp(canvasX)
                const duration = draggedItem.endTime! - draggedItem.startTime!
                
                // Use the stored offset to maintain relative position
                const newStartTime = dragOffset ? timeAtMouse - dragOffset.timeOffset : timeAtMouse - duration / 2
                eventToUpdate.startTime = newStartTime
                eventToUpdate.endTime = newStartTime + duration
                
                // Use Y offset for vertical dragging
                if (dragOffset) {
                  // Convert from canvas Y to item.y coordinate system
                  const newEventTopY = canvasY - dragOffset.yOffset
                  const eventHeight = draggedItem.height || 20 // Use dynamic height or default
                  const newY = height - newEventTopY - eventHeight
                  eventToUpdate.y = Math.max(0, newY)
                } else {
                  const newY = height - canvasY - 10
                  eventToUpdate.y = Math.max(0, newY)
                }
                break
              }
              case 'top': {
                // Resize from the top - change height and y position
                if (dragOffset) {
                  const newTopY = canvasY - dragOffset.yOffset
                  const currentBottomY = height - draggedItem.y
                  const newHeight = Math.max(10, currentBottomY - newTopY) // Minimum height of 10px
                  const newY = height - newTopY - newHeight
                  
                  eventToUpdate.height = newHeight
                  eventToUpdate.y = Math.max(0, newY)
                }
                break
              }
              case 'bottom': {
                // Resize from the bottom - change height and y position
                if (dragOffset) {
                  const newBottomY = canvasY - dragOffset.yOffset
                  const currentTopY = height - draggedItem.y - draggedItem.height
                  const newHeight = Math.max(10, newBottomY - currentTopY) // Minimum height of 10px
                  const newY = height - newBottomY // Update y position to new bottom position
                  
                  eventToUpdate.height = newHeight
                  eventToUpdate.y = Math.max(0, newY)
                }
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
        
        setCenterTimestamp(prev => {
          const newCenter = prev - timeDelta
          const timeWindow = MS_PER_YEAR / zoom
          const newStart = newCenter - timeWindow / 2
          
          // Ensure the new center position doesn't show dates before 1991
          if (newStart < MIN_DATE_1991) {
            // Calculate the minimum allowed center position
            const minAllowedCenter = MIN_DATE_1991 + timeWindow / 2
            return minAllowedCenter
          }
          
          return newCenter
        })
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
      dragOffset,
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
      setDragOffset(null)
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
    if (hoveredItem && (hoveredItem.part === 'top' || hoveredItem.part === 'bottom')) {
      return 'ns-resize'
    }
    if (hoveredItem && hoveredItem.part === 'body') {
      return 'pointer'
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
              height: updatedItem.height as number,
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
