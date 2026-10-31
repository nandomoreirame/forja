import { createStore } from 'zustand/vanilla'
import type {
  ProjectSnapshot,
  ProjectSummary,
  RoleId,
  WorkbenchSource,
} from '@/renderer/src/shared/api'
export type View =
  | { kind: 'home' }
  | { kind: 'compose'; role: RoleId }
  | { kind: 'conversation'; featureId: string }
  | { kind: 'settings' }
  | { kind: 'document'; artifactId: string }
export interface WorkbenchState {
  source: WorkbenchSource
  projects: ProjectSummary[]
  snapshot: ProjectSnapshot | null
  loading: boolean
  error: string | null
  view: View
  history: View[]
  historyIndex: number
  panels: { left: boolean; right: boolean; terminal: boolean }
  palette: { open: boolean; scope: 'all' | 'recent' }
  openProject(id: string): Promise<void>
  navigate(view: View): void
  back(): void
  forward(): void
  togglePanel(panel: 'left' | 'right' | 'terminal'): void
}
export function createWorkbenchStore(source: WorkbenchSource) {
  let request = 0
  return createStore<WorkbenchState>((set, get) => ({
    source,
    projects: [],
    snapshot: null,
    loading: false,
    error: null,
    view: { kind: 'home' },
    history: [{ kind: 'home' }],
    historyIndex: 0,
    panels: { left: true, right: true, terminal: false },
    palette: { open: false, scope: 'all' },
    async openProject(id) {
      const token = ++request
      set({ loading: true, error: null })
      try {
        const [projects, snapshot] = await Promise.all([
          source.listProjects(),
          source.loadProject(id),
        ])
        if (token !== request) return
        const view: View = snapshot.features[0]
          ? { kind: 'conversation', featureId: snapshot.features[0].id }
          : { kind: 'home' }
        set({ projects, snapshot, view, history: [view], historyIndex: 0, loading: false })
      } catch {
        if (token === request) set({ loading: false, error: 'Unable to load project' })
      }
    },
    navigate(view) {
      const state = get()
      if (JSON.stringify(state.view) === JSON.stringify(view)) return
      const history = [...state.history.slice(0, state.historyIndex + 1), view]
      set({ view, history, historyIndex: history.length - 1 })
    },
    back() {
      const { history, historyIndex } = get()
      if (historyIndex > 0) set({ view: history[historyIndex - 1], historyIndex: historyIndex - 1 })
    },
    forward() {
      const { history, historyIndex } = get()
      if (historyIndex < history.length - 1)
        set({ view: history[historyIndex + 1], historyIndex: historyIndex + 1 })
    },
    togglePanel(panel) {
      set((state) => ({ panels: { ...state.panels, [panel]: !state.panels[panel] } }))
    },
  }))
}
export type WorkbenchStore = ReturnType<typeof createWorkbenchStore>
