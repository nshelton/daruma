import React from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleMapsOverlay } from '@deck.gl/google-maps'

import { Map } from 'react-map-gl/maplibre'
import DeckGL from '@deck.gl/react'
import { ScatterplotLayer } from '@deck.gl/layers'
import { HeatmapLayer } from '@deck.gl/aggregation-layers'

import type { MapViewState } from '@deck.gl/core'
import { Color } from 'maplibre-gl'
import { ArcPoint } from '../../../types'
import { turboColorsUint8 } from '@renderer/ColorSchemes'

const INITIAL_VIEW_STATE: MapViewState = {
  longitude: -118.29,
  latitude: 34.08,
  zoom: 11,
  maxZoom: 16,
  pitch: 0,
  bearing: 0
}

const MAP_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json"
// const MAP_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
// const MAP_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
export default function MapView({ data }: { data: ArcPoint[] }): JSX.Element {

  const points = data.map((d) => [d.lng, d.lat])
  console.log(points)

  const layers = [
    new ScatterplotLayer<ArcPoint>({
      id: 'scatter-plot',
      data: points,
      radiusScale: 5,
      opacity: 0.5,
      radiusMinPixels: 0.25,
      getPosition: (d: ArcPoint): [number, number, number] => [d[0], d[1], 0],
      getFillColor: (): [number, number, number] => [0, 200, 200],
      getRadius: 1
    }),
    new HeatmapLayer({
      id: 'HeatmapLayer',
      data: points,
      aggregation: 'SUM',
      colorRange: turboColorsUint8,
      getPosition: (d: ArcPoint): [number, number, number] => [d[0], d[1], 0],
      getWeight: (_: ArcPoint): number => 1,
      radiusPixels: 10
    })
  ]


  return (
    <DeckGL layers={layers} initialViewState={INITIAL_VIEW_STATE} controller={true}>
      {/* <Map reuseMaps mapStyle={MAP_STYLE} /> */}
    </DeckGL>
  )
}
