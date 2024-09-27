import React, { useState, useEffect } from 'react'

import InfoPanel from './components/InfoPanel'
import NavPanel from './components/NavPanel'
import ThreeCanvas from './timelineView/TimelineView'
import './main.css'
import MapPanel from './components/MapPanel'
import GoogleMapPanel from './components/GoogleMapPanel'
import { ArcPoint } from '../../types'
import { IpcRendererEvent } from 'electron'


function App(): JSX.Element {
  const [isInfoPanelVisible, setIsInfoPanelVisible] = useState(false)
  const [infoMessage, setInfoMessage] = useState({})

  const handleToggleInfoPanel = (show: boolean, message: string = ''): void => {
    setInfoMessage(message)
    setIsInfoPanelVisible(show)
  }

  const [locationData, setLocationData] = useState<ArcPoint[]>([])
  const [eventData, setEventData] = useState<Event[]>([])

  const handleLocationList = (_: IpcRendererEvent, location_list: ArcPoint[]): void => {
    console.log('got locations')
    setLocationData(location_list)
  }

  const handleEventList = (_: IpcRendererEvent, event_list: Event[]): void => {
    console.log('got events', event_list)
    setEventData(event_list)
  }

  useEffect(() => {
    window.electron.ipcRenderer.send('get-locations')
    window.electron.ipcRenderer.on('location-data', handleLocationList)

    window.electron.ipcRenderer.send('get-events')
    window.electron.ipcRenderer.on('event-data', handleEventList)

    return () => {
      window.electron.ipcRenderer.removeListener('location-data', handleLocationList);
      window.electron.ipcRenderer.removeListener('event-data', handleEventList);
    };
  }, []);

  return (
    <div id="main-canvas">
      {/* <MapPanel data={locationData} /> */}
      <GoogleMapPanel data={locationData} />
      <NavPanel onShowInfoPanel={(message) => handleToggleInfoPanel(true, message)} />
      <ThreeCanvas eventData={eventData} locationData={locationData} infoPanelCallback={(message) => handleToggleInfoPanel(true, message)} />
      {isInfoPanelVisible && <InfoPanel onToggle={handleToggleInfoPanel} message={infoMessage} />}
    </div>
  )
}

export default App


