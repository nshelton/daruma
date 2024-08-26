import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'

import { EventParser, Event} from './EventParser'
import fs from 'fs'

const root_dir =
  '/Users/nshelton/Library/Mobile Documents/iCloud~is~workflow~my~workflows/Documents'


app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  ipcMain.on('ping', () => console.log('pong'))

  ipcMain.on('get-file-content', (event) => {

    const all_file_contents = [[]]
    //const result = new EventParser('2024-08-24').parseEvents()s
    for (let i = 0; i < 365; i++) {
      const date = new Date(2024, 0, i + 1)
      const fname = date.toISOString().split('T')[0]

      const filePath = `${root_dir}/${fname}.txt`
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf-8')
        const lines = fileContent.split('\n')
        const rawFileContent = lines.map((line) => line.split(','))
        rawFileContent.forEach((line) => line.unshift(fname))
        all_file_contents.push(...rawFileContent)
      }
    }
    const all_events = new EventParser().parseEvents(all_file_contents)

    event.reply('event-list', all_events)
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon: '../../resources/icon.png' } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
