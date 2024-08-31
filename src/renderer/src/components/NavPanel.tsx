import React from 'react'

interface NavPanelProps {
  onShowInfoPanel: (message: string) => void
}

function NavPanel({ onShowInfoPanel }: NavPanelProps): JSX.Element {
  return (
    <div id="nav-panel">
      <button className="btn btn-primary" onClick={() => onShowInfoPanel('Message from NavPanel')}>
        Show Info Panel
      </button>
    </div>
  )
}

export default NavPanel
