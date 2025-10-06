import React, { useState, useEffect, useCallback, useRef } from 'react'
import { TimelinePanel } from './TimelinePanel'
import { ArcPoint, Event, CustomEvent, PhotoPoint } from '../../../types'
import { TimeRange as LayerTimeRange } from './layers/LayerTypes'
import GoogleMapPanel from './GoogleMapPanel'
import FpsCounter from './FpsCounter'

const DEBOUNCE_DELAY = 500 // Milliseconds for debounce

interface DashboardProps extends Record<string, never> {
  // No props expected for Dashboard
}

export const Dashboard: React.FC<DashboardProps> = (): JSX.Element => {
  const [arcPoints, setArcPoints] = useState<ArcPoint[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [customEvents, setCustomEvents] = useState<CustomEvent[]>([])
  const [photos, setPhotos] = useState<PhotoPoint[]>([])
  const [currentTimelineRange, setCurrentTimelineRange] = useState<LayerTimeRange | null>(null)
  const [selectedArcPointForMap, setSelectedArcPointForMap] = useState<ArcPoint | null>(null)
  const [timelineFocusTime, setTimelineFocusTime] = useState<number | null>(null)
  const [isTimelineFocusing, setIsTimelineFocusing] = useState(false)
  const [mapBounds, setMapBounds] = useState<{ north: number; east: number; south: number; west: number } | null>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [isLoadingLocations, setIsLoadingLocations] = useState(false)
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false)

  // IPC listener for location data
  const handleLocationData = useCallback((_event: unknown, receivedData: ArcPoint[]): void => {
    console.log('Dashboard received location-data:', receivedData.length, 'points')
    // Ensure time is a Date object if it's not already
    const processedData = receivedData.map(p => ({
      ...p,
      time: new Date(p.time), // Ensure time is a Date object
    }))
    setArcPoints(processedData)
    setIsLoadingLocations(false)
  }, [])

  // IPC listener for event data
  const handleEventData = useCallback((_event: unknown, receivedData: Event[]): void => {
    console.log('Dashboard received event-data:', receivedData.length, 'events')
    const processedData = receivedData.map(e => ({
      ...e,
      start: new Date(e.start), // Ensure start is a Date object
      end: new Date(e.end), // Ensure end is a Date object
    }))
    setEvents(processedData)
  }, [])

  const handleCustomEventData = useCallback(
    (_event: unknown, receivedData: CustomEvent[]): void => {
      setCustomEvents(receivedData)
    },
    [],
  )

  const handlePhotoData = useCallback((_event: unknown, receivedData: PhotoPoint[]): void => {
    console.log('Dashboard received photo-data:', receivedData.length, 'photos')
    const processed = receivedData.map(p => ({ ...p, time: new Date(p.time) }))
    console.log('Dashboard processed photos length:', processed.length)
    setPhotos(processed)
    setIsLoadingPhotos(false)
  }, [])

  useEffect(() => {
    const locationListener = (_event: unknown, receivedData: ArcPoint[]): void =>
      handleLocationData(_event, receivedData)
    window.electron.ipcRenderer.on('location-data', locationListener)

    const eventListener = (_event: unknown, receivedData: Event[]): void =>
      handleEventData(_event, receivedData)
    window.electron.ipcRenderer.on('event-data', eventListener)

    const customEventListener = (_event: unknown, receivedData: CustomEvent[]): void =>
      handleCustomEventData(_event, receivedData)
    window.electron.ipcRenderer.on('custom-event-data', customEventListener)
    const photoListener = (_event: unknown, receivedData: PhotoPoint[]): void =>
      handlePhotoData(_event, receivedData)
    window.electron.ipcRenderer.on('photo-data', photoListener)

    // Request events when component mounts
    window.electron.ipcRenderer.send('get-events')
    window.electron.ipcRenderer.send('get-custom-events')

    const handleCustomEventCreated = (): void => {
      window.electron.ipcRenderer.send('get-custom-events')
    }
    window.electron.ipcRenderer.on('custom-event-created', handleCustomEventCreated)

    const handleCustomEventDeleted = (): void => {
      window.electron.ipcRenderer.send('get-custom-events')
    }
    window.electron.ipcRenderer.on('custom-event-deleted', handleCustomEventDeleted)

    const handleCustomEventUpdated = (): void => {
      window.electron.ipcRenderer.send('get-custom-events')
    }
    window.electron.ipcRenderer.on('custom-event-updated', handleCustomEventUpdated)

    return (): void => {
      window.electron.ipcRenderer.removeListener('location-data', locationListener)
      window.electron.ipcRenderer.removeListener('event-data', eventListener)
      window.electron.ipcRenderer.removeListener('custom-event-data', customEventListener)
      window.electron.ipcRenderer.removeListener('photo-data', photoListener)
      window.electron.ipcRenderer.removeListener('custom-event-created', handleCustomEventCreated)
      window.electron.ipcRenderer.removeListener('custom-event-deleted', handleCustomEventDeleted)
      window.electron.ipcRenderer.removeListener('custom-event-updated', handleCustomEventUpdated)
    }
  }, [handleLocationData, handleEventData, handleCustomEventData, handlePhotoData])

  const requestDataForRange = useCallback((range: LayerTimeRange): void => {
    console.log('Dashboard: Requesting data for range:', range)
    setIsLoadingLocations(true)
    window.electron.ipcRenderer.send('get-locations-in-range', {
      start: range.start,
      end: range.end,
    })
    setIsLoadingPhotos(true)
    window.electron.ipcRenderer.send('get-photos-in-range', {
      start: range.start,
      end: range.end,
    })
  }, [])

  // Effect for debounced fetching ArcPoint/Photo data via IPC when timeline range changes
  useEffect(() => {
    if (!currentTimelineRange) return
    if (isTimelineFocusing) return // suppress repeated fetches during focus animation

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      requestDataForRange(currentTimelineRange)
    }, DEBOUNCE_DELAY)

    return (): void => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [currentTimelineRange, isTimelineFocusing, requestDataForRange])

  const handleTimelineRangeChange = useCallback((timeRange: LayerTimeRange): void => {
    setCurrentTimelineRange(timeRange)
  }, [])

  // Map click -> set focus on timeline (avoid loops by using a separate handler)
  const handleArcPointClickOnMap = useCallback((point: ArcPoint): void => {
    console.log('Dashboard: ArcPoint clicked on map:', point)
    setSelectedArcPointForMap(point)
    setIsTimelineFocusing(true)
    setTimelineFocusTime(new Date(point.time).getTime())
  }, [])

  // Timeline selection should not set focusTime again (prevents feedback loop)
  const handleArcPointSelectFromTimeline = useCallback((point: ArcPoint): void => {
    console.log('Dashboard: ArcPoint selected in timeline:', point)
    setSelectedArcPointForMap(point)
  }, [])

  const handlePhotoPointClick = useCallback((point: PhotoPoint): void => {
    console.log('Dashboard: PhotoPoint clicked on map:', point)
    // Placeholder: wire to whatever action you want (open preview, center map, etc.)
  }, [])

  const handleMapTargetProcessed = useCallback((): void => {
    console.log('Dashboard: Map target processed, clearing selection.')
    setSelectedArcPointForMap(null)
  }, [setSelectedArcPointForMap])

  const panelWidth = window.innerWidth
  const panelHeight = window.innerHeight / 2

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', height: '100vh', position: 'relative' }}
    >
      <FpsCounter />
      {(isLoadingLocations || isLoadingPhotos) && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: 'linear-gradient(90deg, #0ea5e9 0%, #22d3ee 50%, #34d399 100%)',
            opacity: 0.9,
            zIndex: 1000,
          }}
        />
      )}
      <div
        style={{
          flex: '1 1 auto',
          borderBottom: '1px solid #444',
          overflow: 'hidden',
        }}
      >
        <GoogleMapPanel
          data={arcPoints}
          photos={photos}
          width={panelWidth}
          height={panelHeight}
          targetPoint={selectedArcPointForMap}
          onTargetProcessed={handleMapTargetProcessed}
          onArcPointClick={handleArcPointClickOnMap}
          onPhotoPointClick={handlePhotoPointClick}
          onBoundsChange={setMapBounds}
        />
      </div>
      <div style={{ flex: '1 1 auto', overflow: 'hidden' }}>
        <TimelinePanel
          arcPoints={arcPoints}
          photos={photos}
          events={events}
          customEvents={customEvents}
          onVisibleTimeRangeChange={handleTimelineRangeChange}
          onArcPointSelect={handleArcPointSelectFromTimeline}
          focusTime={timelineFocusTime}
          onFocusTimeApplied={() => {
            setTimelineFocusTime(null)
            setIsTimelineFocusing(false)
            if (currentTimelineRange) requestDataForRange(currentTimelineRange)
          }}
          visibleMapBounds={mapBounds}
          width={panelWidth}
          height={panelHeight}
        />
      </div>
    </div>
  )
}

export default Dashboard
