import React from 'react'

interface MetadataPanelProps {
  isVisible: boolean
  metadata: any // We'll keep this as any for now to support different types of events
  onClose: () => void
}

const MetadataPanel: React.FC<MetadataPanelProps> = ({
  isVisible,
  metadata,
  onClose,
}) => {
  if (!isVisible) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        color: '#fff',
        padding: '20px',
        borderTop: '1px solid #333',
        maxHeight: '30vh',
        overflowY: 'auto',
        fontFamily: 'IBM Plex Mono',
        zIndex: 1000,
        transition: 'transform 0.3s ease-in-out',
        transform: isVisible ? 'translateY(0)' : 'translateY(100%)',
      }}
    >
      <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#666',
            cursor: 'pointer',
            fontSize: '20px',
          }}
        >
          ×
        </button>
      </div>

      <div style={{ marginTop: '20px' }}>
        {Object.entries(metadata).map(([key, value]) => (
          <div key={key} style={{ marginBottom: '10px' }}>
            <span style={{ color: '#666' }}>{key}: </span>
            <span>{String(value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default MetadataPanel
