// import Versions from './components/Versions'
import ThreeCanvas from './ThreeCanvas'
import InfoPanel from './components/InfoPanel';

function App(): JSX.Element {
  // const ipcHandle = (): void => window.electron.ipcRenderer.send('ping')

  return (
    <div id="main-canvas">
      <ThreeCanvas />
      <InfoPanel />
    </div>
  );
}

export default App
