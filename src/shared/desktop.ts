export const selectDirectoryChannel = 'forja:select-directory'
export type DirectorySelection =
  | { status: 'selected'; id: string; name: string; path: string }
  | { status: 'cancelled' | 'unavailable' | 'error' }
export interface DesktopApi {
  selectDirectory(): Promise<DirectorySelection>
  terminal?: DesktopTerminalApi
}

export function isDirectorySelection(value: unknown): value is DirectorySelection {
  if (!value || typeof value !== 'object') return false
  const data = value as Record<string, unknown>
  if (data.status === 'selected')
    return (
      Object.keys(data).length === 4 &&
      ['id', 'name', 'path'].every(
        (key) =>
          typeof data[key] === 'string' &&
          data[key].length > 0 &&
          data[key].length <= 8192 &&
          !data[key].includes('\0'),
      )
    )
  return (
    Object.keys(data).length === 1 &&
    ['cancelled', 'unavailable', 'error'].includes(String(data.status))
  )
}

export const terminalCreateChannel = 'forja:terminal:create'
export const terminalWriteChannel = 'forja:terminal:write'
export const terminalResizeChannel = 'forja:terminal:resize'
export const terminalCloseChannel = 'forja:terminal:close'
export const terminalDataChannel = 'forja:terminal:data'
export const terminalExitChannel = 'forja:terminal:exit'

export interface TerminalCreateRequest {
  cwd: string
  cols: number
  rows: number
}
export type TerminalCreateResult =
  { status: 'started'; id: string; shell: string; cwd: string } | { status: 'error' }

export function isTerminalCreateRequest(value: unknown): value is TerminalCreateRequest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const data = value as Record<string, unknown>
  return (
    Object.keys(data).length === 3 &&
    typeof data.cwd === 'string' &&
    data.cwd.length > 0 &&
    data.cwd.length <= 8192 &&
    !data.cwd.includes('\0') &&
    Number.isInteger(data.cols) &&
    Number.isInteger(data.rows)
  )
}

export interface DesktopTerminalApi {
  create(request: TerminalCreateRequest): Promise<TerminalCreateResult>
  write(id: string, data: string): void
  resize(id: string, cols: number, rows: number): void
  close(id: string): void
  onData(listener: (event: { id: string; data: string }) => void): () => void
  onExit(listener: (event: { id: string; exitCode: number }) => void): () => void
}
