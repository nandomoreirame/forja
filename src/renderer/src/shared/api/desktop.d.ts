import type { DesktopApi } from '@/shared/desktop'
export interface BrowserDirectoryHandle {
  name: string
  kind: 'directory'
  isSameEntry(other: BrowserDirectoryHandle): Promise<boolean>
}
declare global {
  interface Window {
    forja?: DesktopApi
    showDirectoryPicker?: (options: { mode: 'read' }) => Promise<BrowserDirectoryHandle>
  }
}
