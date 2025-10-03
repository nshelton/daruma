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
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // IPC listener for location data
  const handleLocationData = useCallback((_event: unknown, receivedData: ArcPoint[]): void => {
    console.log('Dashboard received location-data:', receivedData.length, 'points')
    // Ensure time is a Date object if it's not already
    const processedData = receivedData.map(p => ({
      ...p,
      time: new Date(p.time), // Ensure time is a Date object
    }))
    setArcPoints(processedData)
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

  // Effect for debounced fetching ArcPoint data via IPC when timeline range changes
  useEffect(() => {
    if (!currentTimelineRange) return

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      console.log('Dashboard: Requesting locations for range:', currentTimelineRange)
      window.electron.ipcRenderer.send('get-locations-in-range', {
        start: currentTimelineRange.start,
        end: currentTimelineRange.end,
      })
      window.electron.ipcRenderer.send('get-photos-in-range', {
        start: currentTimelineRange.start,
        end: currentTimelineRange.end,
      })
    }, DEBOUNCE_DELAY)

    return (): void => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [currentTimelineRange])

  const handleTimelineRangeChange = useCallback((timeRange: LayerTimeRange): void => {
    setCurrentTimelineRange(timeRange)
  }, [])

  const handleArcPointSelect = useCallback((point: ArcPoint): void => {
    console.log('Dashboard: ArcPoint selected for map:', point)
    setSelectedArcPointForMap(point)
  }, [])

  const handleMapTargetProcessed = useCallback((): void => {
    console.log('Dashboard: Map target processed, clearing selection.')
    setSelectedArcPointForMap(null)
  }, [setSelectedArcPointForMap])

  const panelWidth = window.innerWidth
  const panelHeight = window.innerHeight / 2

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', position: 'relative' }}>
      <FpsCounter />
      <div
        style={{
          flex: '1 1 auto',
          borderBottom: '1px solid #444',
          overflow: 'hidden',
        }}
      >
        <GoogleMapPanel
          data={arcPoints}
          width={panelWidth}
          height={panelHeight}
          targetPoint={selectedArcPointForMap}
          onTargetProcessed={handleMapTargetProcessed}
        />
      </div>
      <div style={{ flex: '1 1 auto', overflow: 'hidden' }}>
        <TimelinePanel
          arcPoints={arcPoints}
          photos={photos}
          events={events}
          customEvents={customEvents}
          onVisibleTimeRangeChange={handleTimelineRangeChange}
          onArcPointSelect={handleArcPointSelect}
          width={panelWidth}
          height={panelHeight}
        />
      </div>
    </div>
  )
}

export default Dashboard
