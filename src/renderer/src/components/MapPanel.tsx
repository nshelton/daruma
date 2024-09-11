import React from 'react'
import { API_KEY } from './secrets'

import { APIProvider, Map } from '@vis.gl/react-google-maps';
import vitaminCStyles from './mapstyle';
import { MapOverlay } from './MapOverlay';

function MapPanel(): JSX.Element {

  return (
    <APIProvider apiKey={API_KEY}>
      <Map
        style={{ width: '100vw', height: '100vh' }}
        defaultCenter={{ lat: 34.08864051969305, lng: -118.28890137758805 }}
        defaultZoom={10}
        gestureHandling={'greedy'}
        styles={vitaminCStyles}
      // disableDefaultUI={true}
      >
        <MapOverlay layers={mapOverlay(data)} />

      </Map>
    </APIProvider>
  )
}

export default MapPanel
