import React, { useEffect, useRef, useState, useCallback } from 'react'
import MetadataPanel from './MetadataPanel'

export interface TimelineData {
  timestamp: number
  value: number | string
  metadata?: Record<string, unknown> // Add metadata field to support additional information
}

interface TimelinePanelProps {
  data: TimelineData[]
  width?: number
  height?: number
}

const MS_PER_YEAR = 31536000000 // 365 days in milliseconds
const MIN_ZOOM = 0.01 // 100 years view
const MAX_ZOOM = 8760 // 1 hour view

// Configuration for when to show individual units
const VISIBILITY_THRESHOLDS = {
  years: 10, // Show individual years if <= 10 years visible
  months: 20, // Show individual months if <= 20 months visible
  days: 30, // Show individual days if <= 30 days visible
  hours: 24, // Show individual hours if <= 24 hours visible
}

export const TimelinePanel: React.FC<TimelinePanelProps> = ({
  data,
  width = window.innerWidth,
  height = window.innerHeight,
}): JSX.Element => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [zoom, setZoom] = useState(1) // 1 = 1 year view
  const [centerTimestamp, setCenterTimestamp] = useState(Date.now())
  const [isDragging, setIsDragging] = useState(false)
  const [lastMouseX, setLastMouseX] = useState(0)

  // Add state for selected point and metadata panel
  const [selectedPoint, setSelectedPoint] = useState<TimelineData | null>(null)
  const [isMetadataPanelVisible, setIsMetadataPanelVisible] = useState(false)

  // Calculate visible time range based on zoom level
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

  // Convert timestamp to x coordinate
  const timestampToX = useCallback(
    (timestamp: number): number => {
      const { start, end } = getVisibleTimeRange()
      return ((timestamp - start) / (end - start)) * width
    },
    [width, getVisibleTimeRange],
  )

  // Draw time markers based on zoom level
  const drawTimeMarkers = useCallback(
    (ctx: CanvasRenderingContext2D): void => {
      const { start, end } = getVisibleTimeRange()
      ctx.strokeStyle = '#666'
      ctx.fillStyle = '#999'
      ctx.font = '32px IBM Plex Mono'
      ctx.textAlign = 'left'

      // Calculate start and end components
      const startDate = new Date(start)
      const endDate = new Date(end)
      const startComponents = {
        year: startDate.getFullYear(),
        month: startDate.getMonth(),
        day: startDate.getDate(),
        hour: startDate.getHours(),
      }
      const endComponents = {
        year: endDate.getFullYear(),
        month: endDate.getMonth(),
        day: endDate.getDate(),
        hour: endDate.getHours(),
      }

      // Calculate visible spans
      const yearSpan = endComponents.year - startComponents.year + 1
      const monthSpan =
        (endComponents.year - startComponents.year) * 12 +
        (endComponents.month - startComponents.month) +
        1
      const daySpan = Math.ceil((end - start) / (24 * 60 * 60 * 1000))
      const hourSpan = Math.ceil((end - start) / (60 * 60 * 1000))

      // Draw hierarchical labels in top-left
      let yOffset = 40
      ctx.fillStyle = '#fff'

      // Year
      ctx.fillText(`${startComponents.year}`, 10, yOffset)
      yOffset += 40

      // Month (if zoomed enough)
      if (monthSpan <= VISIBILITY_THRESHOLDS.months) {
        ctx.fillText(
          startDate.toLocaleString('en-US', { month: 'short' }),
          10,
          yOffset,
        )
        yOffset += 40
      }

      // Day (if zoomed enough)
      if (daySpan <= VISIBILITY_THRESHOLDS.days) {
        ctx.fillText(startComponents.day.toString(), 10, yOffset)
        yOffset += 40
      }

      // Hour (if zoomed enough)
      if (hourSpan <= VISIBILITY_THRESHOLDS.hours) {
        ctx.fillText(
          startDate.toLocaleString('en-US', { hour: 'numeric' }),
          10,
          yOffset,
        )
      }

      // Draw individual units if within threshold
      ctx.textAlign = 'left'
      ctx.fillStyle = '#999'

      // Draw individual years if within threshold
      if (yearSpan <= VISIBILITY_THRESHOLDS.years) {
        ctx.strokeStyle = '#666'
        for (
          let year = startComponents.year;
          year <= endComponents.year;
          year++
        ) {
          const yearDate = new Date(year, 0, 1)
          const x = timestampToX(yearDate.getTime())
          if (x >= 0 && x <= width) {
            // Draw line
            ctx.beginPath()
            ctx.moveTo(x, 40)
            ctx.lineTo(x, height)
            ctx.stroke()
            // Draw label
            ctx.fillText(year.toString(), x + 4, 40)
          }
        }
      }

      // Draw individual months if within threshold
      if (monthSpan <= VISIBILITY_THRESHOLDS.months) {
        ctx.strokeStyle = '#666'
        const currentDate = new Date(
          startComponents.year,
          startComponents.month,
          1,
        )
        while (currentDate <= endDate) {
          const x = timestampToX(currentDate.getTime())
          if (x >= 0 && x <= width) {
            // Draw line
            ctx.beginPath()
            ctx.moveTo(x, 80)
            ctx.lineTo(x, height)
            ctx.stroke()
            // Draw label
            ctx.fillText(
              currentDate.toLocaleString('en-US', { month: 'short' }),
              x + 4,
              80,
            )
          }
          currentDate.setMonth(currentDate.getMonth() + 1)
        }
      }

      // Draw individual days if within threshold
      if (daySpan <= VISIBILITY_THRESHOLDS.days) {
        ctx.strokeStyle = '#666'
        const currentDate = new Date(
          startComponents.year,
          startComponents.month,
          startComponents.day,
        )
        while (currentDate <= endDate) {
          const x = timestampToX(currentDate.getTime())
          if (x >= 0 && x <= width) {
            // Draw line
            ctx.beginPath()
            ctx.moveTo(x, 120)
            ctx.lineTo(x, height)
            ctx.stroke()
            // Draw label
            ctx.fillText(currentDate.getDate().toString(), x + 4, 120)
          }
          currentDate.setDate(currentDate.getDate() + 1)
        }
      }

      // Draw individual hours if within threshold
      if (hourSpan <= VISIBILITY_THRESHOLDS.hours) {
        ctx.strokeStyle = '#666'
        const currentDate = new Date(start)
        currentDate.setMinutes(0, 0, 0)
        while (currentDate <= endDate) {
          const x = timestampToX(currentDate.getTime())
          if (x >= 0 && x <= width) {
            // Draw line
            ctx.beginPath()
            ctx.moveTo(x, 160)
            ctx.lineTo(x, height)
            ctx.stroke()
            // Draw label
            ctx.fillText(
              currentDate.toLocaleString('en-US', { hour: 'numeric' }),
              x + 4,
              160,
            )
          }
          currentDate.setHours(currentDate.getHours() + 1)
        }
      }

      // Draw next level of detail lines (lighter)
      ctx.strokeStyle = '#333'
      if (
        yearSpan > VISIBILITY_THRESHOLDS.years &&
        monthSpan <= VISIBILITY_THRESHOLDS.months
      ) {
        // Draw year lines when showing months
        const firstYear = new Date(startComponents.year, 0, 1)
        const lastYear = new Date(endComponents.year + 1, 0, 1)
        for (
          let date = firstYear;
          date < lastYear;
          date.setFullYear(date.getFullYear() + 1)
        ) {
          const x = timestampToX(date.getTime())
          if (x >= 0 && x <= width) {
            ctx.beginPath()
            ctx.moveTo(x, 40)
            ctx.lineTo(x, height)
            ctx.stroke()
          }
        }
      } else if (
        monthSpan > VISIBILITY_THRESHOLDS.months &&
        daySpan <= VISIBILITY_THRESHOLDS.days
      ) {
        // Draw month lines when showing days
        const currentDate = new Date(
          startComponents.year,
          startComponents.month,
          1,
        )
        while (currentDate <= endDate) {
          const x = timestampToX(currentDate.getTime())
          if (x >= 0 && x <= width) {
            ctx.beginPath()
            ctx.moveTo(x, 80)
            ctx.lineTo(x, height)
            ctx.stroke()
          }
          currentDate.setMonth(currentDate.getMonth() + 1)
        }
      } else if (
        daySpan > VISIBILITY_THRESHOLDS.days &&
        hourSpan <= VISIBILITY_THRESHOLDS.hours
      ) {
        // Draw day lines when showing hours
        const currentDate = new Date(
          startComponents.year,
          startComponents.month,
          startComponents.day,
        )
        while (currentDate <= endDate) {
          const x = timestampToX(currentDate.getTime())
          if (x >= 0 && x <= width) {
            ctx.beginPath()
            ctx.moveTo(x, 120)
            ctx.lineTo(x, height)
            ctx.stroke()
          }
          currentDate.setDate(currentDate.getDate() + 1)
        }
      }

      // Draw grid lines
      ctx.strokeStyle = '#333'
      const firstSecondaryMark = Math.ceil(start / 3600000) * 3600000
      for (
        let timestamp = firstSecondaryMark;
        timestamp <= end;
        timestamp += 3600000
      ) {
        const x = timestampToX(timestamp)
        if (x >= 0 && x <= width) {
          // Only draw if within canvas bounds
          ctx.beginPath()
          ctx.moveTo(x, 80)
          ctx.lineTo(x, height)
          ctx.stroke()
        }
      }

      // For year view, draw year lines but skip labels if in decade mode
      if (yearSpan <= VISIBILITY_THRESHOLDS.years) {
        ctx.strokeStyle = '#444'
        // Ensure we start at the beginning of a year
        const firstYearDate = new Date(start)
        firstYearDate.setMonth(0, 1)
        firstYearDate.setHours(0, 0, 0, 0)
        let timestamp = firstYearDate.getTime()

        while (timestamp <= end) {
          const x = timestampToX(timestamp)
          // Only draw if within canvas bounds
          if (x >= 0 && x <= width) {
            ctx.beginPath()
            ctx.moveTo(x, 80)
            ctx.lineTo(x, height)
            ctx.stroke()
          }
          // Move to next year precisely
          const nextYear = new Date(timestamp)
          nextYear.setFullYear(nextYear.getFullYear() + 1)
          timestamp = nextYear.getTime()
        }
        return
      }

      // Draw primary lines and labels for other zoom levels
      ctx.strokeStyle = '#666'
      const firstMark = Math.ceil(start / 86400000) * 86400000

      for (let timestamp = firstMark; timestamp <= end; timestamp += 86400000) {
        const x = timestampToX(timestamp)
        const date = new Date(timestamp)

        let label = ''
        if (timestamp >= start && timestamp <= end) {
          label = date.toLocaleString('en-US', {
            dateStyle: 'medium',
            timeStyle: 'short',
          })
        }

        ctx.beginPath()
        ctx.moveTo(x, 80)
        ctx.lineTo(x, height)
        ctx.stroke()

        ctx.fillText(label, x, 80)
      }

      const timeHierarchy = [
        {
          name: 'year',
          span: yearSpan,
          threshold: VISIBILITY_THRESHOLDS.years,
          yPosition: 40,
          getNext: (date: Date): Date => {
            const next = new Date(date)
            next.setFullYear(date.getFullYear() + 1)
            return next
          },
          getStart: (): Date => {
            const date = new Date(startComponents.year, 0, 1)
            date.setHours(0, 0, 0, 0)
            return date
          },
          format: (date: Date): string => date.getFullYear().toString(),
        },
        {
          name: 'month',
          span: monthSpan,
          threshold: VISIBILITY_THRESHOLDS.months,
          yPosition: 80,
          getNext: (date: Date): Date => {
            const next = new Date(date)
            next.setMonth(date.getMonth() + 1)
            return next
          },
          getStart: (): Date => {
            const date = new Date(
              startComponents.year,
              startComponents.month,
              1,
            )
            date.setHours(0, 0, 0, 0)
            return date
          },
          format: (date: Date): string =>
            date.toLocaleString('en-US', { month: 'short' }),
        },
        {
          name: 'day',
          span: daySpan,
          threshold: VISIBILITY_THRESHOLDS.days,
          yPosition: 120,
          getNext: (date: Date): Date => {
            const next = new Date(date)
            next.setDate(date.getDate() + 1)
            return next
          },
          getStart: (): Date => {
            const date = new Date(
              startComponents.year,
              startComponents.month,
              startComponents.day,
            )
            date.setHours(0, 0, 0, 0)
            return date
          },
          format: (date: Date): string => date.getDate().toString(),
        },
        {
          name: 'hour',
          span: hourSpan,
          threshold: VISIBILITY_THRESHOLDS.hours,
          yPosition: 160,
          getNext: (date: Date): Date => {
            const next = new Date(date)
            next.setHours(date.getHours() + 1)
            return next
          },
          getStart: (): Date => {
            const date = new Date(start)
            date.setMinutes(0, 0, 0)
            return date
          },
          format: (date: Date): string => {
            const options: Intl.DateTimeFormatOptions = {
              hour: 'numeric',
              hour12: true,
            }
            return new Intl.DateTimeFormat('en-US', options).format(date)
          },
        },
      ]

      // Draw each level that's within its threshold
      for (const level of timeHierarchy) {
        if (level.span <= level.threshold) {
          ctx.strokeStyle = '#666'
          let currentDate = level.getStart()

          while (currentDate <= endDate) {
            const x = timestampToX(currentDate.getTime())
            if (x >= 0 && x <= width) {
              // Draw line
              ctx.beginPath()
              ctx.moveTo(x, level.yPosition)
              ctx.lineTo(x, height)
              ctx.stroke()
              // Draw label
              ctx.fillText(level.format(currentDate), x + 4, level.yPosition)
            }
            currentDate = level.getNext(currentDate)
          }
        }
      }

      // Draw next level of detail lines (lighter)
      ctx.strokeStyle = '#333'
      for (let i = 0; i < timeHierarchy.length - 1; i++) {
        const currentLevel = timeHierarchy[i]
        const nextLevel = timeHierarchy[i + 1]

        if (
          currentLevel.span > currentLevel.threshold &&
          nextLevel.span <= nextLevel.threshold
        ) {
          let currentDate = currentLevel.getStart()

          while (currentDate <= endDate) {
            const x = timestampToX(currentDate.getTime())
            if (x >= 0 && x <= width) {
              ctx.beginPath()
              ctx.moveTo(x, currentLevel.yPosition)
              ctx.lineTo(x, height)
              ctx.stroke()
            }
            currentDate = currentLevel.getNext(currentDate)
          }
          break // Only show one level of additional detail
        }
      }
    },
    [height, timestampToX, getVisibleTimeRange, zoom],
  )

  // Add function to find closest point to click
  const findClosestPoint = useCallback(
    (x: number, y: number): TimelineData | null => {
      const { start, end } = getVisibleTimeRange()
      const visibleData = data.filter(
        (point) => point.timestamp >= start && point.timestamp <= end,
      )

      if (visibleData.length === 0) return null

      const canvasRect = canvasRef.current?.getBoundingClientRect()
      if (!canvasRect) return null

      // Convert click coordinates to canvas space
      const canvasX = x - canvasRect.left
      const canvasY = y - canvasRect.top

      // Find the closest point within a reasonable radius (10px)
      const maxDistance = 10
      let closestPoint: TimelineData | null = null
      let minDistance = Infinity

      visibleData.forEach((point) => {
        const pointX = timestampToX(point.timestamp)
        const pointY = height / 2 // All points are drawn at this y-coordinate
        const distance = Math.sqrt(
          Math.pow(pointX - canvasX, 2) + Math.pow(pointY - canvasY, 2),
        )

        if (distance < maxDistance && distance < minDistance) {
          minDistance = distance
          closestPoint = point
        }
      })

      return closestPoint
    },
    [data, getVisibleTimeRange, timestampToX, height],
  )

  // Add click handler
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const point = findClosestPoint(e.clientX, e.clientY)
      if (point) {
        setSelectedPoint(point)
        setIsMetadataPanelVisible(true)
      }
    },
    [findClosestPoint],
  )

  // Modify drawDataPoints to highlight selected point
  const drawDataPoints = useCallback(
    (ctx: CanvasRenderingContext2D): void => {
      const { start, end } = getVisibleTimeRange()

      // Filter visible data points
      const visibleData = data.filter(
        (point) => point.timestamp >= start && point.timestamp <= end,
      )

      // If we have too many points, we need to aggregate them
      const maxPoints = Math.floor(width / 2) // minimum 2px between points
      if (visibleData.length > maxPoints) {
        const bucketSize = Math.ceil(visibleData.length / maxPoints)
        for (let i = 0; i < visibleData.length; i += bucketSize) {
          const bucket = visibleData.slice(i, i + bucketSize)
          const avgTimestamp =
            bucket.reduce((sum, point) => sum + point.timestamp, 0) /
            bucket.length

          const x = timestampToX(avgTimestamp)

          // Check if this bucket contains the selected point
          const isSelected =
            selectedPoint && bucket.some((p) => p === selectedPoint)

          ctx.fillStyle = isSelected
            ? 'rgba(255, 128, 0, 0.8)'
            : 'rgba(0, 128, 255, 0.5)'

          ctx.beginPath()
          const radius = isSelected ? 12 : 10
          ctx.arc(x, height / 2, radius, 0, Math.PI * 2)
          ctx.fill()
        }
      } else {
        // Draw individual points
        visibleData.forEach((point) => {
          const x = timestampToX(point.timestamp)
          const isSelected = point === selectedPoint

          ctx.fillStyle = isSelected
            ? 'rgba(255, 128, 0, 0.8)'
            : 'rgba(0, 128, 255, 0.8)'

          ctx.beginPath()
          const radius = isSelected ? 5 : 3
          ctx.arc(x, height / 2, radius, 0, Math.PI * 2)
          ctx.fill()
        })
      }
    },
    [data, width, height, timestampToX, getVisibleTimeRange, selectedPoint],
  )

  // Main render function
  const render = useCallback((): void => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Draw background first
    ctx.fillStyle = '#111'
    ctx.fillRect(0, 0, width, height)

    // Draw time markers
    drawTimeMarkers(ctx)

    // Draw data points last
    drawDataPoints(ctx)

    // Draw time range at bottom
    ctx.fillStyle = '#666'
    ctx.font = '24px IBM Plex Mono'
    const { start, end } = getVisibleTimeRange()
    const startLabel = new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(start))

    const endLabel = new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(end))

    ctx.fillText(`${startLabel} - ${endLabel}`, 10, height - 20)
  }, [width, height, drawTimeMarkers, drawDataPoints, getVisibleTimeRange])

  // Handle wheel event for zooming
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

  // Add event listeners for wheel
  useEffect((): (() => void) => {
    const canvas = canvasRef.current
    if (!canvas) return (): void => {}

    canvas.addEventListener('wheel', handleWheel)
    return (): void => {
      canvas.removeEventListener('wheel', handleWheel)
    }
  }, [handleWheel])

  // Handle mouse events for panning
  const handleMouseDown = useCallback((e: React.MouseEvent): void => {
    setIsDragging(true)
    setLastMouseX(e.clientX)
  }, [])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent): void => {
      if (!isDragging) return

      const deltaX = e.clientX - lastMouseX
      const timeDelta = (deltaX / width) * (MS_PER_YEAR / zoom)
      setCenterTimestamp(centerTimestamp - timeDelta)
      setLastMouseX(e.clientX)
    },
    [isDragging, lastMouseX, width, zoom, centerTimestamp],
  )

  const handleMouseUp = useCallback((): void => {
    setIsDragging(false)
  }, [])

  // Setup and cleanup effects
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.addEventListener('wheel', handleWheel)
    return () => canvas.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  useEffect(() => {
    render()
  }, [render])

  return (
    <div style={{ position: 'relative' }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleCanvasClick}
        style={{ cursor: 'pointer' }}
      />
      <MetadataPanel
        isVisible={isMetadataPanelVisible}
        metadata={
          selectedPoint?.metadata || {
            timestamp: selectedPoint?.timestamp
              ? new Date(selectedPoint.timestamp).toLocaleString()
              : '',
            value: selectedPoint?.value,
          }
        }
        onClose={(): void => {
          setIsMetadataPanelVisible(false)
          setSelectedPoint(null)
        }}
      />
    </div>
  )
}

export default TimelinePanel
