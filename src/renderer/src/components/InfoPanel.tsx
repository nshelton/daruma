import React from 'react'
import 'bootstrap-icons/font/bootstrap-icons.css'
import { Event } from '../../../types/Event.ts'

interface InfoPanelProps {
  onToggle: (show: boolean) => void
  message: Event
}

function InfoPanel({ onToggle, message }: InfoPanelProps): JSX.Element {

  function formatDuration(start: Date, end: Date): string {
    if (!start || !end) return ''

    const diffMs = end.getTime() - start.getTime()

    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000)
    let result = ''
    if (hours > 0) {
      result += `${hours}h `
    }
    if (minutes > 0) {
      result += `${minutes}m `
    }
    if (seconds > 0) {
      result += `${seconds}s`
    }
    return result
  }
  return (
    <div id="info-panel">
      <button className="btn btn-primary" onClick={() => onToggle(false)}>
        <i className="bi bi-x"></i>
      </button>
      <h2>{formatDuration(message.start, message.end)} {message.eventType}</h2>
      <p>
        {message.start?.toLocaleDateString()} {message.start?.toLocaleTimeString()} - {message.end?.toLocaleTimeString()}
      </p>
    </div>
  );
}

export default InfoPanel
