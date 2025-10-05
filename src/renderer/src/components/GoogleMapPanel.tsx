import React, { useState, useEffect } from 'react'
import { APIProvider, Map, useMap } from '@vis.gl/react-google-maps'
import { GoogleMapsOverlay as DeckOverlay, GoogleMapsOverlayProps } from '@deck.gl/google-maps'
import { ArcPoint, PhotoPoint } from '../../../types'
import { ScatterplotLayer } from '@deck.gl/layers'
import { COORDINATE_SYSTEM } from '@deck.gl/core'
import { GOOGLE_MAPS_API_KEY } from './secrets'

interface GoogleMapPanelProps {
  data: ArcPoint[]
  photos?: PhotoPoint[]
  width?: string | number
  height?: string | number
  targetPoint?: ArcPoint | null
  onTargetProcessed?: () => void
  onArcPointClick?: (point: ArcPoint) => void
  onPhotoPointClick?: (point: PhotoPoint) => void
  clickToleranceMeters?: number
}

interface GoogleDeckGLOverlayComponentProps {
  layers: any[]
}

function GoogleDeckGLOverlay({ layers }: GoogleDeckGLOverlayComponentProps): null {
  const map = useMap()
  const [overlay, setOverlay] = useState<DeckOverlay | null>(null)

  useEffect(() => {
    if (map) {
      const newOverlayInstance = new DeckOverlay({
        layers,
      } as unknown as GoogleMapsOverlayProps)
      newOverlayInstance.setMap(map)
      setOverlay(newOverlayInstance)

      return (): void => {
        newOverlayInstance.setMap(null)
        setOverlay(null)
      }
    }
    return undefined
  }, [map])

  useEffect(() => {
    if (overlay) {
      overlay.setProps({ layers } as unknown as GoogleMapsOverlayProps)
    }
  }, [overlay, layers])

  return null
}

export default function GoogleMapPanel({
  data,
  photos = [],
  width = '100%',
  height = '500px',
  targetPoint = null,
  onTargetProcessed,
  onArcPointClick,
  onPhotoPointClick,
  clickToleranceMeters = 50,
}: GoogleMapPanelProps): JSX.Element {
  const arcData = data
  const photoData = photos

  const [isDarkMode, setIsDarkMode] = useState(true)
  const [pointSize, setPointSize] = useState(5)

  // Imperatively control camera to avoid locking the map with controlled props
  function CameraUpdater({
    targetPoint,
    onDone,
  }: {
    targetPoint: ArcPoint | null
    onDone?: () => void
  }): null {
    const map = useMap()
    useEffect(() => {
      if (!map || !targetPoint) return
      map.setZoom(15)
      map.panTo({ lat: targetPoint.lat, lng: targetPoint.lng })
      if (onDone) onDone()
    }, [map, targetPoint, onDone])
    return null
  }

  const vizLayers = React.useMemo(() => [
    new ScatterplotLayer<ArcPoint>({
      id: 'arc-points',
      data: arcData,
      coordinateSystem: COORDINATE_SYSTEM.LNGLAT,
      radiusUnits: 'pixels',
      getRadius: pointSize,
      // Ensure Deck layer does not capture mouse so Google Map stays interactive
      pickable: true,
      opacity: 1,
      getPosition: (d: ArcPoint): [number, number] => [d.lng, d.lat],
      getFillColor: (): [number, number, number] => [128, 255, 128],
      onClick: (info: unknown): void => {
        const picked = (info as { object?: unknown })?.object as ArcPoint | undefined
        if (picked && onArcPointClick) onArcPointClick(picked)
      },
    }),
    new ScatterplotLayer<PhotoPoint>({
      id: 'photo-points',
      data: photoData,
      coordinateSystem: COORDINATE_SYSTEM.LNGLAT,
      radiusUnits: 'pixels',
      getRadius: pointSize,
      pickable: true,
      opacity: 1,
      getPosition: (d: PhotoPoint): [number, number] => [d.lng, d.lat],
      getFillColor: (): [number, number, number] => [255, 128, 255],
      onClick: (info: unknown): void => {
        const picked = (info as { object?: unknown })?.object as PhotoPoint | undefined
        if (picked && onPhotoPointClick) onPhotoPointClick(picked)
      },
    }),
  ], [arcData, photoData, pointSize, onArcPointClick, onPhotoPointClick])

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <div style={{ height: height, width: width, position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            zIndex: 1000,
            background: 'rgba(255, 255, 255, 0.9)',
            padding: '10px',
            borderRadius: '5px',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            minWidth: '200px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Dark Mode:</label>
            <input
              type="checkbox"
              checked={isDarkMode}
              onChange={e => setIsDarkMode(e.target.checked)}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>
              Point Size: {pointSize}
            </label>
            <input
              type="range"
              min="1"
              max="20"
              value={pointSize}
              onChange={e => setPointSize(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
        </div>
        <Map
          defaultCenter={{ lat: 34.08, lng: -118.29 }}
          defaultZoom={10}
          gestureHandling={'greedy'}
          disableDefaultUI={false}
          mapTypeId="roadmap"
          styles={isDarkMode ? [
            { elementType: 'geometry', stylers: [{ color: '#212121' }] },
            { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
            { elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
            { elementType: 'labels.text.stroke', stylers: [{ color: '#212121' }] },
            { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#757575' }] },
            { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
            { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
            { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#bdbdbd' }] },
            { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
            { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#181818' }] },
            { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
            { featureType: 'poi.park', elementType: 'labels.text.stroke', stylers: [{ color: '#1b1b1b' }] },
            { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#2c2c2c' }] },
            { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#8a8a8a' }] },
            { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#373737' }] },
            { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3c3c3c' }] },
            { featureType: 'road.highway.controlled_access', elementType: 'geometry', stylers: [{ color: '#4e4e4e' }] },
            { featureType: 'road.local', elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
            { featureType: 'transit', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
            { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#000000' }] },
            { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3d3d3d' }] }
          ] : undefined}
        >
          {/* Prevent overlay container from blocking pointer events over the map */}
          <div style={{ pointerEvents: 'none' }}>
            <GoogleDeckGLOverlay layers={vizLayers} />
          </div>
          {/* Imperatively recenter/zoom when a target is provided */}
          <CameraUpdater targetPoint={targetPoint} onDone={onTargetProcessed} />
        </Map>
      </div>
    </APIProvider>
  )
}
