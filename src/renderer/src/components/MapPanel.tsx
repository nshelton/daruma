import React from 'react';
import { createRoot } from 'react-dom/client';
import { Map } from 'react-map-gl/maplibre';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer } from '@deck.gl/layers'

import type { MapViewState } from '@deck.gl/core'
import { Color } from 'maplibre-gl'
import { ArcPoint } from '../../../types'

const INITIAL_VIEW_STATE: MapViewState = {
  longitude: -118.29,
  latitude: 34.08,
  zoom: 11,
  maxZoom: 16,
  pitch: 0,
  bearing: 0
}

const MAP_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json"

export default function MapView({ data }: { data: ArcPoint[] }): JSX.Element {
  const layers = [
    new ScatterplotLayer<ArcPoint>({
      id: 'scatter-plot',
      data: data,
      radiusScale: 300,
      radiusMinPixels: 0.25,
      getPosition: (d: ArcPoint): [number, number, number] => [d[0], d[1], 0],
      getFillColor: (): [number, number, number] => [200, 200, 0],
      getRadius: 1
      // updateTriggers: {
      // getFillColor: ['green', 'red']
      // }
    })
  ]

  return (
    <DeckGL layers={layers} initialViewState={INITIAL_VIEW_STATE} controller={true}>
      <Map reuseMaps mapStyle={MAP_STYLE} />
    </DeckGL>
  )
}
