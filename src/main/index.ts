import { registerProjectDirectoryPicker } from './project-directory'
import { registerTerminals } from './terminals'
import { createPtyService, resolveDefaultShell } from '../core/terminals/pty-service'
import { spawn as spawnPty } from 'node-pty'
import { accessSync, constants } from 'node:fs'
import { userInfo } from 'node:os'
import { app, BrowserWindow, utilityProcess, type UtilityProcess } from 'electron'
import { join } from 'node:path'

let core: UtilityProcess | undefined
let terminals: ReturnType<typeof registerTerminals> | undefined

const executable = (path: string) => {
  try {
    accessSync(path, constants.X_OK)
    return true
  } catch {
    return false
  }
}
const accountShell = () => {
  try {
    return userInfo().shell ?? undefined
  } catch {
    return undefined
  }
}

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
  registerProjectDirectoryPicker()
  terminals = registerTerminals((callbacks) =>
    createPtyService({
      ...callbacks,
      spawn: spawnPty,
      shell: () =>
        resolveDefaultShell({
          accountShell: accountShell(),
          envShell: process.env.SHELL,
          executable,
        }),
    }),
  )
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
app.on('before-quit', () => {
  terminals?.closeAll()
  core?.kill()
})
