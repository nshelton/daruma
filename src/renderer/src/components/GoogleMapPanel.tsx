import React, { useState, useEffect } from 'react'
import { APIProvider, Map, useMap } from '@vis.gl/react-google-maps'
import { GoogleMapsOverlay as DeckOverlay, GoogleMapsOverlayProps } from '@deck.gl/google-maps'
import { ArcPoint } from '../../../types'
import { ScatterplotLayer } from '@deck.gl/layers'
import { GOOGLE_MAPS_API_KEY } from './secrets'

interface GoogleMapPanelProps {
  data: ArcPoint[]
  width?: string | number
  height?: string | number
  targetPoint?: ArcPoint | null
  onTargetProcessed?: () => void
}

interface GoogleDeckGLOverlayComponentProps {
  layers: ScatterplotLayer<number[]>[] // Made layer type more specific
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
  width = '100%',
  height = '500px',
  targetPoint = null,
  onTargetProcessed,
}: GoogleMapPanelProps): JSX.Element {
  const points = data.map(d => [d.lng, d.lat])

  const [isDarkMode, setIsDarkMode] = useState(true)
  const [pointSize, setPointSize] = useState(5)

  // Imperatively control camera to avoid locking the map with controlled props
  function CameraUpdater({ targetPoint, onDone }: { targetPoint: ArcPoint | null; onDone?: () => void }): null {
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
    new ScatterplotLayer({
      id: 'scatter-plot',
      data: points,
      radiusScale: pointSize,
      // Ensure Deck layer does not capture mouse so Google Map stays interactive
      pickable: false,
      opacity: 1,
      radiusMinPixels: 1,
      getPosition: (d: number[]): [number, number, number] => [d[0], d[1], 0],
      getFillColor: (): [number, number, number] => [255, 128, 0],
      getRadius: 1,
    }),
  ], [points, pointSize])

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
              onChange={(e) => setIsDarkMode(e.target.checked)}
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
              onChange={(e) => setPointSize(Number(e.target.value))}
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
