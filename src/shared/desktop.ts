export const selectDirectoryChannel = 'forja:select-directory'
export type DirectorySelection =
  | { status: 'selected'; id: string; name: string; path: string }
  | { status: 'cancelled' | 'unavailable' | 'error' }
export interface DesktopApi {
  selectDirectory(): Promise<DirectorySelection>
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
