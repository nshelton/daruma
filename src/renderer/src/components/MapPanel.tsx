import React from 'react';
import { createRoot } from 'react-dom/client';
import { Map } from 'react-map-gl/maplibre';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer } from '@deck.gl/layers'

import type { MapViewState } from '@deck.gl/core'
import { Color } from 'maplibre-gl'

// Source data CSV
const arc_points = [
  [-118.29, 34.08],
  [-118.29, 34.01]
]

const INITIAL_VIEW_STATE: MapViewState = {
  longitude: -118.29,
  latitude: 34.08,
  zoom: 11,
  maxZoom: 16,
  pitch: 0,
  bearing: 0
}

type ArcPoint = [longitude: number, latitude: number]

export default function MapView({
  data = arc_points,
  radius = 30,
  // mapStyle = 'https://basemaps.cartocdn.com/gl/positron-nolabels-gl-style/style.json'
  // mapStyle = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
  mapStyle = "https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json"
}: {
  data?: string | ArcPoint[]
  radius?: number
  maleColor?: Color
  femaleColor?: Color
  mapStyle?: string
}): JSX.Element {

  const layers = [
    new ScatterplotLayer<ArcPoint>({
      id: 'scatter-plot',
      data,
      radiusScale: radius,
      radiusMinPixels: 0.25,
      getPosition: (d: ArcPoint): [number, number, number] => [d[0], d[1], 0],
      getFillColor: (): [number, number, number] => [200, 200, 255],
      getRadius: 1
      // updateTriggers: {
        // getFillColor: ['green', 'red']
      // }
    })
  ]

  return (
    <DeckGL layers={layers} initialViewState={INITIAL_VIEW_STATE} controller={true}>
      <Map reuseMaps mapStyle={mapStyle} />
    </DeckGL>
  )
}
