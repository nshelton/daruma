import DeckGL from '@deck.gl/react'
import { ScatterplotLayer } from '@deck.gl/layers'
import { HeatmapLayer } from '@deck.gl/aggregation-layers'

import type { MapViewState, Color } from '@deck.gl/core'
import { ArcPoint } from '../../../types'

// Placeholder for turboColorsUint8 - User should replace with actual import and data
const placeholderColorRange: Color[] = [
  [255, 237, 160], // Example colors for Deck.gl colorRange
  [254, 217, 118],
  [254, 178, 76],
  [253, 141, 60],
  [240, 59, 32],
  [189, 0, 38],
]

interface MapPanelProps {
  data: ArcPoint[]
  width?: string | number // Will be string like '500px' or '100%'
  height?: string | number // Will be string like '500px' or '100%'
}

const INITIAL_VIEW_STATE: MapViewState = {
  longitude: -118.29,
  latitude: 34.08,
  zoom: 11,
  maxZoom: 16,
  pitch: 0,
  bearing: 0,
}

// const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json'; // Unused

export default function MapPanel({
  data,
  width = '100%',
  height = '100%',
}: MapPanelProps): JSX.Element {
  const points = data.map(d => [d.lng, d.lat])
  console.log(points)

  const layers = [
    new ScatterplotLayer<number[]>({
      id: 'scatter-plot',
      data: points,
      radiusScale: 5,
      opacity: 0.5,
      radiusMinPixels: 0.25,
      getPosition: (d: number[]): [number, number, number] => [d[0], d[1], 0],
      getFillColor: (): [number, number, number] => [0, 200, 200],
      getRadius: 1,
    }),
    new HeatmapLayer<number[]>({
      id: 'HeatmapLayer',
      data: points,
      aggregation: 'SUM',
      colorRange: placeholderColorRange,
      getPosition: (d: number[]): [number, number, number] => [d[0], d[1], 0],
      getWeight: (_: number[]): number => 1,
      radiusPixels: 10,
    }),
  ]

  return (
    <div
      style={{
        width,
        height,
        position: 'relative',
      }}
    >
      <DeckGL
        layers={layers}
        initialViewState={INITIAL_VIEW_STATE}
        controller={true}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
        }}
      >
        {/* <Map reuseMaps mapStyle={MAP_STYLE} /> */}
      </DeckGL>
    </div>
  )
}
