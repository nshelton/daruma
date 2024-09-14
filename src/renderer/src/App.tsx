import React, { useState, useEffect } from 'react'

import InfoPanel from './components/InfoPanel'
import NavPanel from './components/NavPanel'
import ThreeCanvas from './timelineView/ThreeCanvas'
import './main.css'
import MapPanel from './components/MapPanel'
import { ArcPoint } from '../../types'
import { IpcRendererEvent } from 'electron'


function App(): JSX.Element {
  const [isInfoPanelVisible, setIsInfoPanelVisible] = useState(false)
  const [infoMessage, setInfoMessage] = useState({})

  const handleToggleInfoPanel = (show: boolean, message: string = ''): void => {
    setInfoMessage(message)
    setIsInfoPanelVisible(show)
  }

  const [locationData, setLocationData] = useState<ArcPoint[]>([]);

  const handleLocationList = (_: IpcRendererEvent, location_list: ArcPoint[]): void => {
    // Process the data as needed
    console.log('got locations')
    console.log(location_list)
    setLocationData(location_list)
  }

  useEffect(() => {
    window.electron.ipcRenderer.send('get-location-data');
    window.electron.ipcRenderer.on('location-data', handleLocationList);

    // Cleanup function to remove the event listener
    return () => {
      window.electron.ipcRenderer.removeListener('location-data', handleLocationList);
    };
  }, []);


  return (
    <div id="main-canvas">
      <MapPanel data={locationData} />
      {/* <NavPanel onShowInfoPanel={(message) => handleToggleInfoPanel(true, message)} /> */}
      {/* <ThreeCanvas infoPanelCallback={(message) => handleToggleInfoPanel(true, message)} /> */}
      {/* {isInfoPanelVisible && <InfoPanel onToggle={handleToggleInfoPanel} message={infoMessage} />} */}
    </div>
  )
}

export default App
