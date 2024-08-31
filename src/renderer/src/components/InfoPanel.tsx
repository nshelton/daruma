import React from 'react'
import 'bootstrap-icons/font/bootstrap-icons.css'

interface InfoPanelProps {
  onClose: () => void;
  message: string;
}

function InfoPanel({ onClose, message }: InfoPanelProps): JSX.Element {
  return (
    <div id="info-panel">
      <button className="btn btn-primary" onClick={onClose}>
        <i className="bi bi-x"></i>
      </button>
      <h2>Information Panel</h2>
      <p>{message}</p>
    </div>
  );
}

export default InfoPanel
