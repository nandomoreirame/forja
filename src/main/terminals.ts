import {
  BrowserWindow,
  ipcMain,
  type IpcMainEvent,
  type IpcMainInvokeEvent,
  type WebContents,
} from 'electron'
import type { PtyCreateResult, PtyService, PtyServiceOptions } from '../core/terminals/pty-service'
import {
  isTerminalCreateRequest,
  terminalCloseChannel,
  terminalCreateChannel,
  terminalDataChannel,
  terminalExitChannel,
  terminalResizeChannel,
  terminalWriteChannel,
} from '../shared/desktop'

type Callbacks = Required<Pick<PtyServiceOptions, 'onData' | 'onExit'>>

const record = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined

export function registerTerminals(create: (callbacks: Callbacks) => PtyService) {
  const owners = new Map<number, WebContents>()
  const send = (owner: number, channel: string, payload: unknown) => {
    const contents = owners.get(owner)
    if (contents && !contents.isDestroyed()) contents.send(channel, payload)
  }
  const service = create({
    onData: (owner, id, data) => send(owner, terminalDataChannel, { id, data }),
    onExit: (owner, id, exitCode) => send(owner, terminalExitChannel, { id, exitCode }),
  })
  const trusted = (event: IpcMainEvent | IpcMainInvokeEvent) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    return Boolean(window && !window.isDestroyed() && event.senderFrame === event.sender.mainFrame)
  }

  ipcMain.handle(
    terminalCreateChannel,
    async (event, request: unknown, ...rest: unknown[]): Promise<PtyCreateResult> => {
      if (rest.length || !trusted(event) || !isTerminalCreateRequest(request))
        return { status: 'error' }
      const owner = event.sender.id
      if (!owners.has(owner)) {
        owners.set(owner, event.sender)
        event.sender.once('destroyed', () => {
          service.closeOwner(owner)
          owners.delete(owner)
        })
      }
      return service.create(owner, request)
    },
  )
  ipcMain.on(terminalWriteChannel, (event, payload: unknown) => {
    const data = record(payload)
    if (trusted(event) && typeof data?.id === 'string' && typeof data.data === 'string')
      service.write(event.sender.id, data.id, data.data)
  })
  ipcMain.on(terminalResizeChannel, (event, payload: unknown) => {
    const data = record(payload)
    if (
      trusted(event) &&
      typeof data?.id === 'string' &&
      typeof data.cols === 'number' &&
      typeof data.rows === 'number'
    )
      service.resize(event.sender.id, data.id, data.cols, data.rows)
  })
  ipcMain.on(terminalCloseChannel, (event, payload: unknown) => {
    const data = record(payload)
    if (trusted(event) && typeof data?.id === 'string') service.close(event.sender.id, data.id)
  })
  return { closeAll: () => service.closeAll() }
}
