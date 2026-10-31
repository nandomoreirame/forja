import { BrowserWindow, dialog, ipcMain, type WebContents } from 'electron'
import { realpath, stat } from 'node:fs/promises'
import { basename, isAbsolute, parse } from 'node:path'
import { selectDirectoryChannel, type DirectorySelection } from '../shared/desktop'
export function registerProjectDirectoryPicker() {
  const pending = new WeakSet<WebContents>()
  ipcMain.handle(
    selectDirectoryChannel,
    async (event, ...args: unknown[]): Promise<DirectorySelection> => {
      const owner = BrowserWindow.fromWebContents(event.sender)
      if (
        args.length ||
        !owner ||
        owner.isDestroyed() ||
        event.senderFrame !== event.sender.mainFrame
      )
        return { status: 'error' }
      if (pending.has(event.sender)) return { status: 'cancelled' }
      pending.add(event.sender)
      try {
        const result = await dialog.showOpenDialog(owner, { properties: ['openDirectory'] })
        if (result.canceled) return { status: 'cancelled' }
        const selected = result.filePaths[0]
        if (!selected || !isAbsolute(selected)) return { status: 'error' }
        const path = await realpath(selected)
        if (!(await stat(path)).isDirectory()) return { status: 'error' }
        return { status: 'selected', id: path, path, name: basename(path) || parse(path).root }
      } catch {
        return { status: 'error' }
      } finally {
        pending.delete(event.sender)
      }
    },
  )
}
