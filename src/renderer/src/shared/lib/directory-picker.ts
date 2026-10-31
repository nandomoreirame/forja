import { isDirectorySelection, type DirectorySelection } from '@/shared/desktop'
import type { BrowserDirectoryHandle } from '@/renderer/src/shared/api/desktop'
const browserDirectories: { handle: BrowserDirectoryHandle; id: string }[] = []
export async function selectProjectDirectory(): Promise<DirectorySelection> {
  try {
    if (window.forja) {
      const result: unknown = await window.forja.selectDirectory()
      return isDirectorySelection(result) ? result : { status: 'error' }
    }
    if (!window.showDirectoryPicker) return { status: 'unavailable' }
    const handle = await window.showDirectoryPicker({ mode: 'read' })
    if (!handle || handle.kind !== 'directory' || !handle.name) return { status: 'error' }
    let id: string | undefined
    for (const item of browserDirectories)
      if (item.handle === handle || (await handle.isSameEntry(item.handle))) {
        id = item.id
        break
      }
    if (!id) {
      id = `browser:${crypto.randomUUID()}`
      browserDirectories.push({ handle, id })
    }
    // Browsers expose a directory name, never its absolute filesystem path.
    const selection = { status: 'selected' as const, id, name: handle.name, path: handle.name }
    return isDirectorySelection(selection) ? selection : { status: 'error' }
  } catch (error) {
    return error instanceof DOMException && error.name === 'AbortError'
      ? { status: 'cancelled' }
      : { status: 'error' }
  }
}
