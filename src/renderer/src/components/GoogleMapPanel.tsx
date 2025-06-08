import { useState, useEffect } from 'react'
import { APIProvider, Map, useMap, MapCameraChangedEvent } from '@vis.gl/react-google-maps'
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
    if (map && !overlay) {
      const newOverlayInstance = new DeckOverlay({
        layers,
      } as unknown as GoogleMapsOverlayProps)
      newOverlayInstance.setMap(map)
      setOverlay(newOverlayInstance)
    }

    return (): void => {
      if (overlay) {
        overlay.setMap(null)
      }
    }
  }, [map, layers])

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

  const [currentCenter, setCurrentCenter] = useState({ lat: 34.08, lng: -118.29 })
  const [currentZoom, setCurrentZoom] = useState(10)
  const [isProgrammaticViewSet, setIsProgrammaticViewSet] = useState(false)

  useEffect(() => {
    if (targetPoint) {
      setIsProgrammaticViewSet(true)
      setCurrentCenter({ lat: targetPoint.lat, lng: targetPoint.lng })
      setCurrentZoom(15)
      if (onTargetProcessed) {
        onTargetProcessed()
      }
      const timer = setTimeout(() => setIsProgrammaticViewSet(false), 50)
      return (): void => clearTimeout(timer)
    }
  }, [targetPoint, onTargetProcessed])

  const handleCenterChanged = (ev: MapCameraChangedEvent): void => {
    if (isProgrammaticViewSet) return
    setCurrentCenter({ lat: ev.detail.center.lat, lng: ev.detail.center.lng })
  }

  const handleZoomChanged = (ev: MapCameraChangedEvent): void => {
    if (isProgrammaticViewSet) return
    setCurrentZoom(ev.detail.zoom)
  }

  const vizLayers = [
    new ScatterplotLayer({
      id: 'scatter-plot',
      data: points, // This should be the transformed points array
      radiusScale: 5,
      opacity: 1,
      radiusMinPixels: 1,
      getPosition: (d: number[]): [number, number, number] => [d[0], d[1], 0], // d is now [lng, lat]
      getFillColor: (): [number, number, number] => [255, 128, 0],
      getRadius: 1,
    }),
  ]

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <div style={{ height: height, width: width }}>
        <Map
          center={currentCenter}
          zoom={currentZoom}
          onCenterChanged={handleCenterChanged}
          onZoomChanged={handleZoomChanged}
          defaultCenter={{ lat: 34.08, lng: -118.29 }}
          defaultZoom={10}
          gestureHandling={'greedy'}
          disableDefaultUI={false}
        >
          <GoogleDeckGLOverlay layers={vizLayers} />
        </Map>
      </div>
    </APIProvider>
  )
}
