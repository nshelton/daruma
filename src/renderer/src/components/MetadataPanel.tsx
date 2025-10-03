import React, { useState, useEffect, useRef } from 'react'
import { SelectedItem } from './layers/LayerTypes'

interface MetadataPanelProps {
  isVisible: boolean
  metadata: SelectedItem | null
  onClose: () => void
  onUpdate: (updatedData: Partial<SelectedItem>) => void
  onDelete: (id: number) => void
}

const MetadataPanel: React.FC<MetadataPanelProps> = ({
  isVisible,
  metadata,
  onClose,
  onUpdate,
  onDelete,
}) => {
  const [editableMetadata, setEditableMetadata] = useState<SelectedItem | null>(metadata)
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null)
  const [isPhotoLoading, setIsPhotoLoading] = useState(false)

  useEffect(() => {
    setEditableMetadata(metadata)
    // Load full image if a photo item is selected
    const load = async (): Promise<void> => {
      setPhotoDataUrl(null)
      if (!metadata || metadata.layerId !== 'photos') return
      const pathFromTopLevel = (metadata as unknown as { imgpath?: string }).imgpath
      const pathFromMeta = (metadata.metadata?.imgpath as string | undefined) ?? undefined
      const imgpath = pathFromTopLevel || pathFromMeta
      if (!imgpath) return
      try {
        setIsPhotoLoading(true)
        const url = await window.electron.ipcRenderer.invoke('read-image', imgpath)
        if (url) setPhotoDataUrl(url as string)
      } finally {
        setIsPhotoLoading(false)
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    load()
  }, [metadata])

  const handleInputChange = (key: string, value: string): void => {
    if (!editableMetadata) return
    const newMetadata = { ...editableMetadata, [key]: value }
    setEditableMetadata(newMetadata)

    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      onUpdate(newMetadata)
    }, 500) // 500ms debounce
  }

  if (!isVisible || !editableMetadata) return null

  const renderValue = (key: string, value: unknown): React.ReactNode => {
    if (editableMetadata.layerId === 'customEvents') {
      if (key === 'title') {
        return (
          <input
            type="text"
            value={value as string}
            onChange={e => handleInputChange(key, e.target.value)}
            style={{ background: '#333', color: '#fff', border: '1px solid #555' }}
          />
        )
      }
      if (key === 'color') {
        return (
          <input
            type="color"
            value={value as string}
            onChange={e => handleInputChange(key, e.target.value)}
            style={{ background: '#333', border: '1px solid #555' }}
          />
        )
      }
    }
    return String(value)
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: '50vh',
        bottom: 0,
        right: 0,
        width: isCollapsed ? '60px' : editableMetadata.layerId === 'photos' ? '360px' : '200px',
        backgroundColor: 'rgba(0,0,0,0.5)',
        color: '#fff',
        padding: '20px',
        borderLeft: '1px solid #333',
        overflowY: 'auto',
        fontFamily: 'IBM Plex Mono',
        zIndex: 1000,
        transition: 'transform 0.3s ease-in-out, width 0.3s ease-in-out',
        transform: isVisible ? 'translateX(0)' : 'translateX(100%)',
      }}
    >
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          background: 'none',
          border: 'none',
          color: '#999',
          cursor: 'pointer',
          fontSize: '24px',
          lineHeight: 1,
          padding: 0,
          zIndex: 1001,
        }}
      >
        {isCollapsed ? '«' : '»'}
      </button>

      <div style={{ visibility: isCollapsed ? 'hidden' : 'visible' }}>
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

        {editableMetadata.layerId === 'photos' && (
          <div style={{ marginTop: '10px', marginBottom: '10px' }}>
            {isPhotoLoading && <div style={{ color: '#999' }}>Loading image…</div>}
            {!isPhotoLoading && photoDataUrl && (
              <img
                src={photoDataUrl}
                alt="Selected photo"
                style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '4px' }}
              />
            )}
          </div>
        )}

        {editableMetadata.layerId === 'customEvents' && (
          <button
            onClick={() => onDelete(editableMetadata.id as number)}
            style={{
              position: 'absolute',
              bottom: '10px',
              right: '10px',
              background: 'darkred',
              color: 'white',
              border: 'none',
              padding: '5px 10px',
            }}
          >
            Delete
          </button>
        )}

        <div style={{ marginTop: '20px' }}>
          {Object.entries(editableMetadata).map(([key, value]) => (
            <div key={key} style={{ marginBottom: '10px' }}>
              <span style={{ color: '#666' }}>{key}: </span>
              <span>{renderValue(key, value)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default MetadataPanel
