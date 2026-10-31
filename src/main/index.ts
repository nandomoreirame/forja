import { app, BrowserWindow, utilityProcess, type UtilityProcess } from 'electron'
import { join } from 'node:path'

let core: UtilityProcess | undefined

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1280,
    height: 1024,
    minWidth: 360,
    minHeight: 480,
    title: 'Forja',
    frame: false,
    backgroundColor: '#0e0e0e',
    show: false,
    webPreferences: {
      preload: join(import.meta.dirname, '../preload/index.cjs'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  window.webContents.on('will-navigate', (event) => event.preventDefault())
  window.once('ready-to-show', () => window.show())
  if (process.env.ELECTRON_RENDERER_URL) void window.loadURL(process.env.ELECTRON_RENDERER_URL)
  else void window.loadFile(join(import.meta.dirname, '../renderer/index.html'))
}

void app.whenReady().then(() => {
  if (!app.isPackaged) app.setPath('userData', join(app.getPath('appData'), 'Forja Dev'))
  core = utilityProcess.fork(join(import.meta.dirname, 'core.js'), [], {
    env: { ...process.env, FORJA_DATA_DIR: app.getPath('userData') },
  })
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
app.on('before-quit', () => core?.kill())
