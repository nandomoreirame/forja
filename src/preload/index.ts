import { contextBridge, ipcRenderer } from 'electron'
import {
  isDirectorySelection,
  selectDirectoryChannel,
  terminalCloseChannel,
  terminalCreateChannel,
  terminalDataChannel,
  terminalExitChannel,
  terminalResizeChannel,
  terminalWriteChannel,
  type DesktopApi,
  type TerminalCreateResult,
} from '../shared/desktop'

const subscribe = <T>(channel: string, listener: (event: T) => void) => {
  const handler = (_event: unknown, payload: T) => listener(payload)
  ipcRenderer.on(channel, handler)
  return () => {
    ipcRenderer.removeListener(channel, handler)
  }
}
const api: DesktopApi = {
  async selectDirectory() {
    try {
      const result: unknown = await ipcRenderer.invoke(selectDirectoryChannel)
      return isDirectorySelection(result) ? result : { status: 'error' }
    } catch {
      return { status: 'error' }
    }
  },
  terminal: {
    async create(request) {
      try {
        const result = (await ipcRenderer.invoke(
          terminalCreateChannel,
          request,
        )) as TerminalCreateResult
        return result?.status === 'started' && typeof result.id === 'string'
          ? result
          : { status: 'error' }
      } catch {
        return { status: 'error' }
      }
    },
    write: (id, data) => ipcRenderer.send(terminalWriteChannel, { id, data }),
    resize: (id, cols, rows) => ipcRenderer.send(terminalResizeChannel, { id, cols, rows }),
    close: (id) => ipcRenderer.send(terminalCloseChannel, { id }),
    onData: (listener) => subscribe(terminalDataChannel, listener),
    onExit: (listener) => subscribe(terminalExitChannel, listener),
  },
}
contextBridge.exposeInMainWorld('forja', api)
