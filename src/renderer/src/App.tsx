import React, { useState } from 'react'
import InfoPanel from './components/InfoPanel'
import NavPanel from './components/NavPanel'
import ThreeCanvas from './timelineView/ThreeCanvas'
import './main.css'

function App(): JSX.Element {
  const [isInfoPanelVisible, setIsInfoPanelVisible] = useState(false)
  const [infoMessage, setInfoMessage] = useState({})

  const handleToggleInfoPanel = (show: boolean, message: string = '') => {
    setInfoMessage(message)
    setIsInfoPanelVisible(show)
  }

  return (
    <div>
      <NavPanel onShowInfoPanel={(message) => handleToggleInfoPanel(true, message)} />
      <ThreeCanvas infoPanelCallback={(message) => handleToggleInfoPanel(true, message)} />
      {isInfoPanelVisible && <InfoPanel onToggle={handleToggleInfoPanel} message={infoMessage} />}
    </div>
  )
}

export default App
