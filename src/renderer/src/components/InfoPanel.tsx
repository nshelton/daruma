import { useState } from 'react'
import './InfoPanel.css'
import 'bootstrap-icons/font/bootstrap-icons.css'

function InfoPanel(): JSX.Element {
  const [isVisible, setIsVisible] = useState(true)

  const handleClose = (): void => {
    setIsVisible(false)
  };

  if (!isVisible) {
    return <div />
  }

  return (
    <div id="info-panel">
      <button className="btn btn-primary" onClick={handleClose}>
        <i class="bi bi-x"></i>

      </button>

      <h2>Information Panel</h2>
      <p>This is the info panel content.</p>
      <div id="info-panel-content"></div>
    </div >
  );
}
export default InfoPanel;
