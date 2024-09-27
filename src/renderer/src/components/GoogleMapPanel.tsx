import React, { useState, useEffect, useCallback } from 'react';
import { APIProvider, Map, useMap } from '@vis.gl/react-google-maps';
import { GeoJsonLayer, ArcLayer } from '@deck.gl/layers';
import { GoogleMapsOverlay as DeckOverlay } from '@deck.gl/google-maps';
import { ArcPoint } from '../../../types';
import { ScatterplotLayer } from '@deck.gl/layers'
import { HeatmapLayer } from '@deck.gl/aggregation-layers'
import { turboColorsUint8 } from '@renderer/ColorSchemes'
import { GOOGLE_MAPS_API_KEY } from './secrets'


function GoogleDeckGLOverlay({ layers }) {
  const map = useMap();
  const [overlay, setOverlay] = useState(null);

  useEffect(() => {
    if (map && !overlay) {
      const newOverlay = new DeckOverlay({ layers });
      newOverlay.setMap(map);
      setOverlay(newOverlay);
    }

    return () => {
      if (overlay) {
        overlay.setMap(null);
      }
    };
  }, [map, overlay, layers]);

  useEffect(() => {
    if (overlay) {
      overlay.setProps({ layers });
    }
  }, [overlay, layers]);

  return null;
}

export default function GoogleMapPanel({ data }: { data: ArcPoint[] }): JSX.Element {
  // const [mapLoaded, setMapLoaded] = useState(false);

  // const onMapLoad = useCallback(() => {
  //   setMapLoaded(true);
  // }, []);


  const points = data.map((d) => [d.lng, d.lat])
  console.log(points)

  const layers = [
    new ScatterplotLayer<ArcPoint>({
      id: 'scatter-plot',
      data: points,
      radiusScale: 5,
      opacity: 1,
      radiusMinPixels: 1,
      getPosition: (d: ArcPoint): [number, number, number] => [d[0], d[1], 0],
      getFillColor: (): [number, number, number] => [255, 128, 0],
      getRadius: 1
    })
  ]
  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <div style={{ height: '1000px', width: '500px' }}>
        <Map defaultCenter={{ lat: 34.08, lng: -118.29 }} defaultZoom={10}>
          <GoogleDeckGLOverlay layers={layers} />
        </Map>
      </div>
    </APIProvider>
  );
}
