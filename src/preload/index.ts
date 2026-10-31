import { contextBridge, ipcRenderer } from 'electron'
import { isDirectorySelection, selectDirectoryChannel, type DesktopApi } from '../shared/desktop'
const api: DesktopApi = {
  async selectDirectory() {
    try {
      const result: unknown = await ipcRenderer.invoke(selectDirectoryChannel)
      return isDirectorySelection(result) ? result : { status: 'error' }
    } catch {
      return { status: 'error' }
    }
  },
}
contextBridge.exposeInMainWorld('forja', api)
