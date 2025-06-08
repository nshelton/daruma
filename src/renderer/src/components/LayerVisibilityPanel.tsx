import React, { useState } from 'react'
import { Layer } from './layers/LayerTypes'

interface LayerVisibilityPanelProps {
  layers: Layer[]
  onToggle: (layerId: string) => void
}

const LayerVisibilityPanel: React.FC<LayerVisibilityPanelProps> = ({ layers, onToggle }) => {
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <div
      style={{
        position: 'fixed',
        top: '50vh',
        left: 0,
        width: '200px',
        height: isCollapsed ? '20px' : '50vh',
        backgroundColor: 'rgba(0,0,0,0.5)',
        color: '#fff',
        padding: '20px',
        borderRight: '1px solid #333',
        overflowY: isCollapsed ? 'hidden' : 'auto',
        fontFamily: 'IBM Plex Mono',
        zIndex: 1000,
        transition: 'height 0.3s ease-in-out',
      }}
    >
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          background: 'none',
          border: 'none',
          color: '#999',
          cursor: 'pointer',
          fontSize: '24px',
          lineHeight: 1,
          padding: 0,
        }}
      >
        {isCollapsed ? '▾' : '▴'}
      </button>
      <div
        style={{
          visibility: isCollapsed ? 'hidden' : 'visible',
          opacity: isCollapsed ? 0 : 1,
          transition: 'visibility 0s, opacity 0.3s linear',
        }}
      >
        <h3
          style={{
            marginTop: 0,
            color: '#999',
            borderBottom: '1px solid #555',
            paddingBottom: '10px',
          }}
        >
          Layers
        </h3>
        {layers.map(layer => (
          <div key={layer.id} style={{ margin: '10px 0' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={layer.isVisible}
                onChange={() => onToggle(layer.id)}
                style={{ marginRight: '10px' }}
              />
              {layer.name}
            </label>
          </div>
        ))}
      </div>
    </div>
  )
}

export default LayerVisibilityPanel
