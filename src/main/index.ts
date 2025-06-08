import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import {
  getAllEvents,
  getAllLocationsInRange,
  initializeAllLocationsCache,
  initializeCustomEventsDb,
  getAllCustomEvents,
  createCustomEvent,
  updateCustomEvent,
  deleteCustomEvent,
} from './db'
import icon from '../../resources/icon.png?asset'
import { Event, CustomEvent } from '../types'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1800,
    height: 1200,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler(details => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli. Default NAN HMR port is 5173.
  // DEV CLIENT ALT PORT declare var process: { env: { ELECTRON_RENDERER_URL: string } }
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  optimizer.watchWindowShortcuts(null) // Pass null if no mainWindow is available yet

  // Initialize the location cache
  initializeAllLocationsCache((err, count) => {
    if (err) {
      console.error('Failed to initialize location cache:', err)
    } else {
      console.log(`Location cache initialized successfully with ${count} items.`)
    }
  })

  // Initialize the custom events database
  initializeCustomEventsDb()

  // Create the main window
  createWindow()

  // Set up other IPC handlers
  ipcMain.on('get-events', event => {
    console.log('get-events')
    getAllEvents((err: Error | null, data: Event[]) => {
      if (err) {
        console.error('Error fetching events:', err)
        event.reply('event-data', [])
        return
      }
      event.reply('event-data', data)
    })
  })

  ipcMain.on('get-custom-events', event => {
    getAllCustomEvents((err: Error | null, data: CustomEvent[]) => {
      if (err) {
        console.error('Error fetching custom events:', err)
        event.reply('custom-event-data', [])
        return
      }
      event.reply('custom-event-data', data)
    })
  })

  ipcMain.on('create-custom-event', (event, customEvent: Omit<CustomEvent, 'id'>) => {
    createCustomEvent(customEvent, (err, newId) => {
      if (err) {
        console.error('Error creating custom event:', err)
        event.reply('custom-event-created', { error: err.message })
        return
      }
      event.reply('custom-event-created', { id: newId })
    })
  })

  ipcMain.on('update-custom-event', (event, customEvent: CustomEvent) => {
    updateCustomEvent(customEvent, err => {
      if (err) {
        console.error('Error updating custom event:', err)
        event.reply('custom-event-updated', { error: err.message })
        return
      }
      event.reply('custom-event-updated', { id: customEvent.id })
    })
  })

  ipcMain.on('delete-custom-event', (event, id: number) => {
    deleteCustomEvent(id, err => {
      if (err) {
        console.error('Error deleting custom event:', err)
        event.reply('custom-event-deleted', { error: err.message })
        return
      }
      event.reply('custom-event-deleted', { id })
    })
  })

  // Updated IPC handler for locations
  ipcMain.on('get-locations-in-range', (event, timeRange: { start: number; end: number }) => {
    if (!timeRange || typeof timeRange.start !== 'number' || typeof timeRange.end !== 'number') {
      console.error('Invalid timeRange received for get-locations-in-range:', timeRange)
      event.reply('location-data', []) // Send empty array or error
      return
    }
    console.log(
      `get-locations-in-range: ${new Date(timeRange.start).toISOString()} to ${new Date(timeRange.end).toISOString()}`,
    )
    getAllLocationsInRange(timeRange.start, timeRange.end, (err, data) => {
      if (err) {
        console.error('Error fetching locations:', err)
        event.reply('location-data', []) // Send empty on error
        return
      }
      event.reply('location-data', data)
    })
  })

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
