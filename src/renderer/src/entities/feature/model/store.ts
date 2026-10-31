import { featureIdentity } from './feature-name'
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
  openPalette(scope: 'all' | 'recent'): void
  closePalette(): void
  loadProjects(): Promise<void>
  openFeatureIds: string[]
  recipients: Record<string, RoleId>
  startCompose(role?: RoleId): void
  createFeatureFromPrompt(prompt: string, role: RoleId): string
  selectFeature(id: string): void
  closeFeature(id: string): void
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
    openFeatureIds: [],
    recipients: {},
    startCompose(role = 'research') {
      if (get().snapshot) get().navigate({ kind: 'compose', role })
    },
    createFeatureFromPrompt(prompt, role) {
      const snapshot = get().snapshot
      if (!snapshot) throw new Error('No open project')
      const { name, slug } = featureIdentity(
        prompt,
        snapshot.features.map((f) => f.slug),
      )
      const id = `mock:${snapshot.project.id}:${slug}`
      const feature = {
        id,
        slug,
        name,
        state: 'running' as const,
        mode: 'guided' as const,
        destination: snapshot.project.path,
        branch: `feature/${slug}`,
        worktree: null,
        target: snapshot.project.path,
        stage: role,
        messages: [{ id: `${id}:user-1`, role: 'user' as const, text: prompt.trim() }],
        terminals: [],
      }
      set((state) => ({
        snapshot: { ...snapshot, features: [...snapshot.features, feature] },
        openFeatureIds: [...state.openFeatureIds, id],
        recipients: { ...state.recipients, [id]: role },
      }))
      get().navigate({ kind: 'conversation', featureId: id })
      return id
    },
    selectFeature(id) {
      if (get().openFeatureIds.includes(id)) get().navigate({ kind: 'conversation', featureId: id })
    },
    closeFeature(id) {
      const state = get()
      if (!state.openFeatureIds.includes(id)) return
      const openFeatureIds = state.openFeatureIds.filter((item) => item !== id)
      const view: View =
        state.view.kind === 'conversation' && state.view.featureId === id
          ? openFeatureIds.length
            ? { kind: 'conversation', featureId: openFeatureIds[openFeatureIds.length - 1] }
            : { kind: 'compose', role: 'research' }
          : state.view
      const history = state.history.filter((v) => v.kind !== 'conversation' || v.featureId !== id)
      if (JSON.stringify(history.at(-1)) !== JSON.stringify(view)) history.push(view)
      set({ openFeatureIds, view, history, historyIndex: history.length - 1 })
    },
    projects: [],
    snapshot: null,
    loading: false,
    error: null,
    view: { kind: 'home' },
    history: [{ kind: 'home' }],
    historyIndex: 0,
    panels: { left: true, right: true, terminal: false },
    palette: { open: false, scope: 'all' },
    openPalette(scope) {
      set({ palette: { open: true, scope } })
    },
    closePalette() {
      set((state) => ({ palette: { ...state.palette, open: false } }))
    },
    async loadProjects() {
      try {
        set({ projects: await source.listProjects() })
      } catch {
        set({ error: 'Unable to load project' })
      }
    },
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
        set({
          projects,
          snapshot,
          view,
          history: [view],
          historyIndex: 0,
          loading: false,
          openFeatureIds: snapshot.features.map((f) => f.id),
          recipients: Object.fromEntries(snapshot.features.map((f) => [f.id, f.stage])),
        })
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
