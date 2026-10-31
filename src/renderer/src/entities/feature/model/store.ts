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
  retryLoad(): Promise<void>
  loadProjects(): Promise<void>
  openFeatureIds: string[]
  recipients: Record<string, RoleId>
  composeActivation: number
  setRecipient(id: string, role: RoleId): void
  startCompose(role?: RoleId): void
  createFeatureFromPrompt(prompt: string, role: RoleId): string
  selectFeature(id: string): void
  closeFeature(id: string): void
  appendPrompt(id: string, prompt: string, role: RoleId): void
  openProject(id: string): Promise<void>
  navigate(view: View): void
  back(): void
  forward(): void
  togglePanel(panel: 'left' | 'right' | 'terminal'): void
}
export function createWorkbenchStore(source: WorkbenchSource) {
  let request = 0
  let failedOperation: { kind: 'projects' } | { kind: 'project'; id: string } | null = null
  return createStore<WorkbenchState>((set, get) => ({
    source,
    openFeatureIds: [],
    recipients: {},
    composeActivation: 0,
    setRecipient(id, role) {
      if (get().snapshot?.features.some((f) => f.id === id))
        set((state) => ({ recipients: { ...state.recipients, [id]: role } }))
    },
    startCompose(role = 'research') {
      if (!get().snapshot) return
      get().navigate({ kind: 'compose', role })
      set((state) => ({ composeActivation: state.composeActivation + 1 }))
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
    appendPrompt(id, prompt, role) {
      const snapshot = get().snapshot
      if (!snapshot || !prompt.trim() || !snapshot.features.some((f) => f.id === id)) return
      set((state) => ({
        snapshot: {
          ...snapshot,
          features: snapshot.features.map((feature) =>
            feature.id === id
              ? {
                  ...feature,
                  messages: [
                    ...feature.messages,
                    {
                      id: `${id}:user-${feature.messages.length + 1}`,
                      role: 'user',
                      text: prompt.trim(),
                    },
                  ],
                }
              : feature,
          ),
        },
        recipients: { ...state.recipients, [id]: role },
      }))
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
      let historyIndex = -1
      let history: View[] = []
      state.history.forEach((entry, index) => {
        if (entry.kind === 'conversation' && entry.featureId === id) return
        history.push(entry)
        if (index <= state.historyIndex) historyIndex = history.length - 1
      })
      if (state.view.kind === 'conversation' && state.view.featureId === id) {
        history = history.slice(0, historyIndex + 1)
        if (JSON.stringify(history.at(-1)) !== JSON.stringify(view)) history.push(view)
        historyIndex = history.length - 1
      }
      set({ openFeatureIds, view, history, historyIndex })
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
    async retryLoad() {
      const operation = failedOperation
      if (operation?.kind === 'project') await get().openProject(operation.id)
      else if (operation?.kind === 'projects') await get().loadProjects()
    },
    async loadProjects() {
      set({ error: null })
      try {
        set({ projects: await source.listProjects() })
        failedOperation = null
      } catch {
        failedOperation = { kind: 'projects' }
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
        failedOperation = null
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
        if (token === request) {
          failedOperation = { kind: 'project', id }
          set({ loading: false, error: 'Unable to load project' })
        }
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
