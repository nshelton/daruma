import Versions from './components/Versions'
import ThreeCanvas from './ThreeCanvas';
import React from 'react';

function App(): JSX.Element {
  // const ipcHandle = (): void => window.electron.ipcRenderer.send('ping')

  return (
    <div id="main-canvas">
      <ThreeCanvas />
    </div>
  );
}

export default App;
