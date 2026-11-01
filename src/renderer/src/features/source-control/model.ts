import type { FileNode, GitStatus, ProjectSnapshot } from '@/renderer/src/shared/api'

// VS Code's SCM colors on Terminal Noir tokens: modified warns, new files succeed, deletions err.
export const statusTone: Record<GitStatus, string> = {
  M: 'text-warning',
  U: 'text-success',
  A: 'text-success',
  D: 'text-destructive',
}

/** Folders first, then files, each alphabetical (case-insensitive), as in Explorer. */
export function sortNodes(nodes: FileNode[]) {
  return [...nodes].sort(
    (a, b) =>
      Number(!a.children) - Number(!b.children) ||
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
  )
}

/** Status per changed file path, and per folder holding changes (modified wins, then new). */
export function changeIndex(changes: ProjectSnapshot['changes']) {
  const files = new Map<string, GitStatus>()
  const folders = new Map<string, GitStatus>()
  const rank: Record<GitStatus, number> = { M: 3, U: 2, A: 2, D: 1 }
  for (const { path, status } of changes) {
    files.set(path, status)
    const parts = path.split('/')
    for (let depth = 1; depth < parts.length; depth++) {
      const folder = parts.slice(0, depth).join('/')
      const current = folders.get(folder)
      if (!current || rank[status] > rank[current]) folders.set(folder, status)
    }
  }
  return { files, folders }
}

export function splitPath(path: string) {
  const index = path.lastIndexOf('/')
  return { name: path.slice(index + 1), dir: index < 0 ? '' : path.slice(0, index) }
}
