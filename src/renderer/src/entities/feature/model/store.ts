import type { ToolId } from '@/shared/ui'
import {
  archiveCascade,
  restoreCascade,
  type ArchiveTarget,
} from '@/renderer/src/shared/lib/archive'
import { selectProjectDirectory } from '@/renderer/src/shared/lib/directory-picker'
import { getDictionary } from '@/shared/i18n'
import { featureIdentity } from './feature-name'
import { createStore } from 'zustand/vanilla'
import type {
  FeatureSnapshot,
  LibraryDocument,
  LibraryKind,
  LibraryScope,
  MemoryRecord,
  ProjectSnapshot,
  ProjectSummary,
  RoleId,
  SettingsTab,
  WorkbenchSource,
} from '@/renderer/src/shared/api'
export type View =
  | { kind: 'authoring' }
  | { kind: 'home' }
  | { kind: 'archived' }
  | { kind: 'compose'; role: RoleId }
  | { kind: 'conversation'; featureId: string }
  | { kind: 'settings'; tab?: SettingsTab; role?: RoleId }
  | { kind: 'document'; documentId: string }
export interface WorkbenchState {
  memories: MemoryRecord[]
  libraryDocuments: Record<string, LibraryDocument>
  authoring: {
    kind: LibraryKind
    scope: LibraryScope
    name?: string
    messages: string[]
    running: boolean
  } | null
  startAuthoring(kind: LibraryKind, scope: LibraryScope, name?: string): void
  sendAuthoring(text: string): void
  source: WorkbenchSource
  agentTools: Partial<Record<RoleId, ToolId>>
  agentModels: Partial<Record<RoleId, string>>
  refreshAgentTools(): Promise<void>
  refreshSkills(root?: string): Promise<void>
  projects: ProjectSummary[]
  snapshot: ProjectSnapshot | null
  loading: boolean
  error: string | null
  view: View
  history: View[]
  historyIndex: number
  panels: { left: boolean; right: boolean; terminal: boolean; terminalMaximized: boolean }
  palette: { open: boolean; scope: 'all' | 'recent' }
  openPalette(scope: 'all' | 'recent'): void
  closePalette(): void
  retryLoad(): Promise<void>
  openDirectory(): Promise<void>
  pickingDirectory: boolean
  loadProjects(): Promise<void>
  openDocumentIds: string[]
  documents: Record<string, string>
  openDocument(id: string): Promise<void>
  closeDocument(id: string): void
  approveDocument(id: string): void
  archiveItem(target: ArchiveTarget): void
  restoreItem(target: ArchiveTarget): void
  openFeatureIds: string[]
  settingsOpen: boolean
  lastSettings: { tab?: SettingsTab; role?: RoleId }
  drafts: Record<string, string>
  setDraft(id: string, text: string): void
  prefillDraft(id: string, draft: { recipient: RoleId; text: string }): void
  recipients: Record<string, RoleId>
  focusComposer(): void
  composerFocusPending: boolean
  consumeComposerFocus(): void
  composeActivation: number
  setRecipient(id: string, role: RoleId): void
  startCompose(role?: RoleId): void
  openSettings(options?: { tab?: SettingsTab; role?: RoleId }): void
  closeSettings(): void
  createFeatureFromPrompt(prompt: string, role: RoleId): string
  openFeature(id: string): void
  selectFeature(id: string): void
  closeFeature(id: string): void
  sendMessage(id: string, text: string): void
  interrupt(id: string): void
  appendPrompt(id: string, prompt: string, role: RoleId): void
  openProject(id: string): Promise<void>
  navigate(view: View): void
  back(): void
  forward(): void
  togglePanel(panel: 'left' | 'right' | 'terminal' | 'terminalMaximized'): void
  setPanel(panel: 'left' | 'right' | 'terminal' | 'terminalMaximized', open: boolean): void
  terminalTabs: Record<string, string>
  selectTerminal(featureId: string, terminalId: string): void
  openTerminal(featureId: string, terminalId?: string): void
  addShell(featureId: string): void
  stopTerminal(featureId: string, terminalId: string): void
  closeTerminal(featureId: string, terminalId: string): void
  toggleTerminals(scopeId?: string): void
  markTerminalExited(featureId: string, terminalId: string, exitCode: number): void
  setTerminalShell(featureId: string, terminalId: string, shell: string): void
  setTerminalProcess(featureId: string, terminalId: string, name: string): void
}
const shellNumber = (id: string) => Number(/-shell-(\d+)$/.exec(id)?.[1] ?? 0)

// Terminals opened with no feature selected belong to the project and start in its folder
// (REQ-031: feature worktree, then target repository, then the opened folder).
export const projectTerminalScopeId = (projectId: string) => `project:${projectId}`

export function projectTerminalScope(snapshot: ProjectSnapshot): FeatureSnapshot {
  return {
    id: projectTerminalScopeId(snapshot.project.id),
    lastActivityAt: snapshot.project.lastOpenedAt,
    slug: snapshot.project.id,
    name: snapshot.project.name,
    state: 'draft',
    mode: 'guided',
    tool: 'claude',
    destination: snapshot.project.path,
    branch: '',
    worktree: null,
    target: snapshot.project.path,
    stage: 'research',
    messages: [],
    terminals: snapshot.terminals ?? [],
  }
}

export function createWorkbenchStore(source: WorkbenchSource) {
  const replies = new Map<string, { cancel: () => void }>()
  const documentReads = new Map<string, Promise<string>>()
  let authoringCancel: (() => void) | undefined
  let previousDocumentView: View = { kind: 'home' }
  let request = 0
  let skillsRequest = 0
  let failedOperation:
    { kind: 'projects' } | { kind: 'project'; id: string } | { kind: 'directory' } | null = null
  return createStore<WorkbenchState>((set, get) => {
    const scopeOf = (id: string) => {
      const snapshot = get().snapshot
      if (!snapshot) return undefined
      return id === projectTerminalScopeId(snapshot.project.id)
        ? projectTerminalScope(snapshot)
        : snapshot.features.find((feature) => feature.id === id)
    }
    const updateFeature = (id: string, update: (feature: FeatureSnapshot) => FeatureSnapshot) =>
      set((state) =>
        state.snapshot && id === projectTerminalScopeId(state.snapshot.project.id)
          ? {
              snapshot: {
                ...state.snapshot,
                terminals: update(projectTerminalScope(state.snapshot)).terminals,
              },
            }
          : state.snapshot
            ? {
                snapshot: {
                  ...state.snapshot,
                  features: state.snapshot.features.map((feature) =>
                    feature.id === id ? update(feature) : feature,
                  ),
                },
              }
            : {},
      )
    return {
      source,
      agentTools: {},
      agentModels: {},
      async refreshAgentTools() {
        try {
          const settings = await source.loadSettings()
          set({
            agentTools: Object.fromEntries(settings.agents.map((agent) => [agent.id, agent.tool])),
            agentModels: Object.fromEntries(
              settings.agents.flatMap((agent) => (agent.model ? [[agent.id, agent.model]] : [])),
            ),
          })
        } catch {
          // Keep the previous mapping when settings are temporarily unavailable.
        }
      },
      memories: [],
      libraryDocuments: {},
      authoring: null,
      startAuthoring(kind, scope, name) {
        authoringCancel?.()
        set({ authoring: { kind, scope, name, messages: [], running: false } })
        get().navigate({ kind: 'authoring' })
        get().sendAuthoring(getDictionary(source.locale).app.authoringPrompt)
      },
      sendAuthoring(text) {
        const current = get().authoring
        if (!current || current.running || !text.trim()) return
        const messages = [...current.messages, text.trim(), '']
        let conversation = { ...current, messages, running: true }
        set({ authoring: conversation })
        authoringCancel = source.streamReply(
          { featureId: 'authoring', role: 'research', prompt: text, authoring: current.kind },
          (event) => {
            if (event.type === 'start' || get().authoring !== conversation) return
            if (event.type === 'text') messages[messages.length - 1] += event.chunk
            conversation = {
              ...conversation,
              messages: [...messages],
              running: event.type !== 'completed' && event.type !== 'interrupted',
            }
            set({ authoring: conversation })
          },
          {
            instant:
              typeof matchMedia === 'function' &&
              matchMedia('(prefers-reduced-motion: reduce)').matches,
          },
        )
      },
      async refreshSkills(root) {
        const currentRequest = ++skillsRequest
        const projectId = get().snapshot?.project.id
        const folder = root ?? (await source.loadSettings()).general?.skillsRoot ?? '~/.skills'
        const skills = await source.scanSkills(folder)
        set((state) =>
          // Mock loadProject includes library skills only for the dev fixture.
          currentRequest === skillsRequest &&
          projectId === 'dev' &&
          state.snapshot &&
          state.snapshot.project.id === projectId
            ? {
                documents: Object.fromEntries(
                  Object.entries(state.documents).filter(
                    ([id]) => !id.startsWith('library:skill:'),
                  ),
                ),
                libraryDocuments: {
                  ...Object.fromEntries(
                    Object.entries(state.libraryDocuments).filter(
                      ([id]) => !id.startsWith('library:skill:'),
                    ),
                  ),
                  ...Object.fromEntries(
                    skills
                      .filter((skill) => skill.id.startsWith('library:skill:'))
                      .map((skill) => [skill.id, { ...skill, kind: 'skill' as const }]),
                  ),
                },
                snapshot: {
                  ...state.snapshot,
                  skills: [
                    ...state.snapshot.skills.filter(
                      (skill) => !skill.id.startsWith('library:skill:'),
                    ),
                    ...skills.filter((skill) => skill.id.startsWith('library:skill:')),
                  ],
                },
              }
            : {},
        )
      },
      pickingDirectory: false,
      async openDirectory() {
        if (get().pickingDirectory) return
        set({ pickingDirectory: true, error: null })
        try {
          const selected = await selectProjectDirectory()
          if (selected.status === 'cancelled') return
          if (selected.status !== 'selected') {
            failedOperation = { kind: 'directory' }
            set({
              error:
                selected.status === 'unavailable'
                  ? 'Directory picker unavailable'
                  : 'Unable to load project',
            })
            return
          }
          await source.addProject({
            id: selected.id,
            name: selected.name,
            path: selected.path,
            lastOpenedAt: new Date().toISOString(),
          })
          await get().openProject(selected.id)
        } catch {
          failedOperation = { kind: 'directory' }
          set({ error: 'Unable to load project' })
        } finally {
          set({ pickingDirectory: false })
        }
      },
      openDocumentIds: [],
      documents: {},
      async openDocument(id) {
        const snapshot = get().snapshot
        const skill = snapshot?.skills.find((item) => item.id === id)
        const libraryDocument = skill
          ? { ...skill, kind: 'skill' as const }
          : get().libraryDocuments[id]
        if (
          !snapshot ||
          (!snapshot.artifacts.some((artifact) => artifact.id === id && !artifact.archived) &&
            !libraryDocument)
        )
          throw new Error('Unknown artifact')
        if (libraryDocument)
          set((state) => ({
            libraryDocuments: { ...state.libraryDocuments, [id]: libraryDocument },
          }))
        const token = request
        let content = get().documents[id]
        if (content === undefined) {
          let pending = documentReads.get(id)
          if (!pending) {
            pending = source.readArtifact(id)
            documentReads.set(id, pending)
          }
          try {
            content = await pending
          } finally {
            if (documentReads.get(id) === pending) documentReads.delete(id)
          }
        }
        if (
          token !== request ||
          get().snapshot?.project.id !== snapshot.project.id ||
          get().snapshot?.artifacts.some((artifact) => artifact.id === id && artifact.archived)
        )
          return
        if (get().view.kind !== 'document') previousDocumentView = get().view
        set((state) => ({
          documents: { ...state.documents, [id]: content },
          openDocumentIds: state.openDocumentIds.includes(id)
            ? state.openDocumentIds
            : [...state.openDocumentIds, id],
        }))
        get().navigate({ kind: 'document', documentId: id })
      },
      closeDocument(id) {
        const state = get()
        const index = state.openDocumentIds.indexOf(id)
        if (index < 0) return
        const openDocumentIds = state.openDocumentIds.filter((item) => item !== id)
        const isTarget = (view: View) => view.kind === 'document' && view.documentId === id
        const active = isTarget(state.view)
        const view: View = active
          ? openDocumentIds.length
            ? {
                kind: 'document',
                documentId: openDocumentIds[Math.min(index, openDocumentIds.length - 1)],
              }
            : previousDocumentView.kind === 'conversation' &&
                !state.openFeatureIds.includes(previousDocumentView.featureId)
              ? state.openFeatureIds[0]
                ? { kind: 'conversation', featureId: state.openFeatureIds[0] }
                : { kind: 'home' }
              : previousDocumentView
          : state.view
        let historyIndex = -1
        let history: View[] = []
        state.history.forEach((entry, entryIndex) => {
          if (isTarget(entry)) return
          history.push(entry)
          if (entryIndex <= state.historyIndex) historyIndex = history.length - 1
        })
        if (active) {
          history = history.slice(0, historyIndex + 1)
          if (JSON.stringify(history.at(-1)) !== JSON.stringify(view)) history.push(view)
          historyIndex = history.length - 1
        }
        set({ openDocumentIds, view, history, historyIndex })
      },
      approveDocument(id) {
        // Mock-only stand-in for explicit human approval; agent events never invoke this action.
        const snapshot = get().snapshot
        if (snapshot?.artifacts.find((artifact) => artifact.id === id)?.state !== 'draft')
          throw new Error('Only drafts can be approved')
        set({
          snapshot: {
            ...snapshot,
            artifacts: snapshot.artifacts.map((artifact) =>
              artifact.id === id ? { ...artifact, state: 'approved' } : artifact,
            ),
          },
        })
      },
      archiveItem(target) {
        const snapshot = get().snapshot
        if (!snapshot) return
        if (
          target.kind === 'feature' &&
          snapshot.features.find((f) => f.id === target.id)?.state === 'running'
        )
          return
        const next = archiveCascade(snapshot, target)
        if (next === snapshot) return
        set({ snapshot: next })
        if (target.kind === 'feature') get().closeFeature(target.id)
        for (const artifact of next.artifacts) {
          if (artifact.archived) get().closeDocument(artifact.id)
        }
        source.saveArchiveState?.(next)
      },
      restoreItem(target) {
        const snapshot = get().snapshot
        if (!snapshot) return
        const next = restoreCascade(snapshot, target)
        set({ snapshot: next })
        source.saveArchiveState?.(next)
      },
      openFeatureIds: [],
      settingsOpen: false,
      lastSettings: {},
      drafts: {},
      setDraft(id, text) {
        if (!get().snapshot?.features.some((feature) => feature.id === id)) return
        set((state) => ({ drafts: { ...state.drafts, [id]: text } }))
      },
      prefillDraft(id, draft) {
        if (!get().snapshot?.features.some((feature) => feature.id === id)) return
        const existing = get().drafts[id] ?? ''
        get().setDraft(id, existing ? `${existing}\n${draft.text}` : draft.text)
        get().setRecipient(id, draft.recipient)
        get().focusComposer()
      },
      recipients: {},
      composeActivation: 0,
      focusComposer() {
        set((state) => ({
          composeActivation: state.composeActivation + 1,
          composerFocusPending: true,
        }))
      },
      composerFocusPending: false,
      consumeComposerFocus() {
        if (get().composerFocusPending) set({ composerFocusPending: false })
      },
      setRecipient(id, role) {
        if (get().snapshot?.features.some((f) => f.id === id))
          set((state) => ({ recipients: { ...state.recipients, [id]: role } }))
      },
      startCompose(role = 'research') {
        if (!get().snapshot) return
        get().navigate({ kind: 'compose', role })
        set((state) => ({ composeActivation: state.composeActivation + 1 }))
      },
      openSettings(options = {}) {
        const next = { ...get().lastSettings, ...options }
        set({ settingsOpen: true, lastSettings: next })
        get().navigate({ kind: 'settings', ...next })
      },
      closeSettings() {
        const state = get()
        if (!state.settingsOpen) return
        const history: View[] = []
        let historyIndex = -1
        state.history.forEach((entry, index) => {
          if (entry.kind === 'settings') return
          history.push(entry)
          if (index <= state.historyIndex) historyIndex = history.length - 1
        })
        let view = state.view
        if (view.kind === 'settings') {
          view =
            history[historyIndex] ??
            (state.openFeatureIds.length
              ? { kind: 'conversation', featureId: state.openFeatureIds[0] }
              : { kind: 'home' })
          if (historyIndex < 0) {
            history.push(view)
            historyIndex = history.length - 1
          }
        }
        set({ settingsOpen: false, view, history, historyIndex })
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
          lastActivityAt: new Date().toISOString(),
          mode: 'guided' as const,
          tool: 'claude' as const,
          destination: snapshot.project.path,
          branch: `feature/${slug}`,
          worktree: null,
          target: snapshot.project.path,
          stage: role,
          messages: [],
          terminals: [],
        }
        set((state) => ({
          snapshot: { ...snapshot, features: [...snapshot.features, feature] },
          openFeatureIds: [...state.openFeatureIds, id],
          recipients: { ...state.recipients, [id]: role },
        }))
        get().navigate({ kind: 'conversation', featureId: id })
        get().sendMessage(id, prompt)
        return id
      },
      openFeature(id) {
        const feature = get().snapshot?.features.find((item) => item.id === id)
        if (!feature || feature.archived) return
        if (!get().openFeatureIds.includes(id))
          set((state) => ({ openFeatureIds: [...state.openFeatureIds, id] }))
        get().selectFeature(id)
      },
      selectFeature(id) {
        if (get().openFeatureIds.includes(id))
          get().navigate({ kind: 'conversation', featureId: id })
      },
      sendMessage(id, text) {
        const feature = get().snapshot?.features.find((item) => item.id === id)
        const prompt = text.trim()
        if (!feature || !prompt) return
        get().interrupt(id)
        const role = get().recipients[id] ?? feature.stage
        const messageId = `${id}:agent-${feature.messages.length + 2}`
        const startedAt = Date.now()
        const createdAt = new Date(startedAt).toISOString()
        // Mock usage: about four characters per token over the visible context.
        const contextChars =
          feature.messages.reduce((total, message) => total + message.text.length, 0) +
          prompt.length
        set((state) => ({
          snapshot: {
            ...state.snapshot!,
            features: state.snapshot!.features.map((item) =>
              item.id === id
                ? {
                    ...item,
                    state: 'running',
                    messages: [
                      ...item.messages,
                      {
                        id: `${id}:user-${item.messages.length + 1}`,
                        role: 'user',
                        text: prompt,
                        createdAt,
                      },
                      {
                        id: messageId,
                        role: 'agent',
                        author: role,
                        tool: state.agentTools[role] ?? feature.tool,
                        text: '',
                        status: 'running',
                        createdAt,
                        model: state.agentModels[role],
                      },
                    ],
                  }
                : item,
            ),
          },
        }))
        const reply = { cancel: () => {} }
        const terminalIds = new Set<string>()
        replies.set(id, reply)
        reply.cancel = source.streamReply(
          { featureId: id, role, prompt },
          (event) => {
            if (replies.get(id) !== reply || event.type === 'start') return
            const finalStatus =
              event.type === 'completed' || event.type === 'interrupted' ? event.type : undefined
            const resumed = event.type === 'terminal' && !terminalIds.has(event.terminalId)
            if (event.type === 'terminal') terminalIds.add(event.terminalId)
            set((state) => ({
              snapshot: {
                ...state.snapshot!,
                features: state.snapshot!.features.map((item) => {
                  if (item.id !== id) return item
                  let terminals = item.terminals
                  if (event.type === 'terminal') {
                    const existing = terminals.find((terminal) => terminal.id === event.terminalId)
                    terminals = existing
                      ? terminals.map((terminal) =>
                          terminal.id === event.terminalId &&
                          (resumed || terminal.state !== 'interrupted')
                            ? {
                                ...terminal,
                                state: 'running',
                                output: terminal.output
                                  ? `${terminal.output}\n${event.line}`
                                  : event.line,
                              }
                            : terminal,
                        )
                      : [
                          ...terminals,
                          {
                            id: event.terminalId,
                            label: `${getDictionary(source.locale).product[role]} · ${event.line.includes('npm test') ? 'tests' : 'dev'}`,
                            state: 'running',
                            output: event.line,
                            kind: 'agent',
                            agent: role,
                            command: event.line.replace(/^\$\s*/, ''),
                            cwd: item.worktree ?? item.destination,
                          },
                        ]
                  }
                  return {
                    ...item,
                    state: finalStatus === 'completed' ? 'waiting' : (finalStatus ?? item.state),
                    messages: item.messages.map((message) =>
                      message.id === messageId
                        ? {
                            ...message,
                            text: event.type === 'text' ? message.text + event.chunk : message.text,
                            parts:
                              event.type === 'part'
                                ? [...(message.parts ?? []), event.part]
                                : message.parts,
                            status: finalStatus ?? message.status,
                            ...(finalStatus
                              ? {
                                  durationMs: Date.now() - startedAt,
                                  usage: {
                                    input: Math.ceil(contextChars / 4),
                                    cached: 0,
                                    output: Math.ceil(
                                      (event.type === 'text'
                                        ? message.text + event.chunk
                                        : message.text
                                      ).length / 4,
                                    ),
                                  },
                                }
                              : {}),
                          }
                        : message,
                    ),
                    terminals: finalStatus
                      ? terminals.map((terminal) =>
                          terminalIds.has(terminal.id) && terminal.state === 'running'
                            ? {
                                ...terminal,
                                state: finalStatus,
                              }
                            : terminal,
                        )
                      : terminals,
                  }
                }),
              },
            }))
            if (finalStatus) replies.delete(id)
          },
          {
            instant:
              typeof matchMedia === 'function' &&
              matchMedia('(prefers-reduced-motion: reduce)').matches,
          },
        )
      },
      interrupt(id) {
        replies.get(id)?.cancel()
      },
      appendPrompt(id, prompt, role) {
        if (!prompt.trim() || !get().snapshot?.features.some((feature) => feature.id === id)) return
        get().setRecipient(id, role)
        get().sendMessage(id, prompt)
      },
      closeFeature(id) {
        if (!get().openFeatureIds.includes(id)) return
        get().interrupt(id)
        const state = get()
        const openFeatureIds = state.openFeatureIds.filter((item) => item !== id)
        const view: View =
          state.view.kind === 'conversation' && state.view.featureId === id
            ? openFeatureIds.length
              ? {
                  kind: 'conversation',
                  featureId:
                    openFeatureIds[
                      Math.min(state.openFeatureIds.indexOf(id), openFeatureIds.length - 1)
                    ],
                }
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
      panels: { left: true, right: true, terminal: false, terminalMaximized: false },
      palette: { open: false, scope: 'all' },
      openPalette(scope) {
        set({ palette: { open: true, scope } })
      },
      closePalette() {
        set((state) => ({ palette: { ...state.palette, open: false } }))
      },
      async retryLoad() {
        const operation = failedOperation
        if (operation?.kind === 'directory') await get().openDirectory()
        else if (operation?.kind === 'project') await get().openProject(operation.id)
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
          const [projects, snapshot, memories] = await Promise.all([
            source.listProjects(),
            source.loadProject(id),
            source.loadMemories(),
          ])
          if (token !== request) return
          for (const reply of replies.values()) reply.cancel()
          replies.clear()
          authoringCancel?.()
          failedOperation = null
          documentReads.clear()
          previousDocumentView = { kind: 'home' }
          const first = snapshot.features.find((feature) => !feature.archived)
          const view: View = first
            ? { kind: 'conversation', featureId: first.id }
            : { kind: 'home' }
          set({
            projects,
            snapshot,
            memories,
            authoring: null,
            libraryDocuments: Object.fromEntries(
              memories.map((memory) => [
                `memory:${memory.id}`,
                {
                  id: `memory:${memory.id}`,
                  name: memory.title,
                  kind: 'memory' as const,
                  scope: memory.scope,
                },
              ]),
            ),
            view,
            history: [view],
            historyIndex: 0,
            loading: false,
            openFeatureIds: snapshot.features.filter((f) => !f.archived).map((f) => f.id),
            recipients: Object.fromEntries(snapshot.features.map((f) => [f.id, f.stage])),
            terminalTabs: {},
            openDocumentIds: [],
            documents: {},
            drafts: {},
          })
          await get().refreshAgentTools()
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
        if (historyIndex > 0)
          set({ view: history[historyIndex - 1], historyIndex: historyIndex - 1 })
      },
      forward() {
        const { history, historyIndex } = get()
        if (historyIndex < history.length - 1)
          set({ view: history[historyIndex + 1], historyIndex: historyIndex + 1 })
      },
      togglePanel(panel) {
        set((state) => ({ panels: { ...state.panels, [panel]: !state.panels[panel] } }))
      },
      setPanel(panel, open) {
        set((state) => ({ panels: { ...state.panels, [panel]: open } }))
      },
      terminalTabs: {},
      selectTerminal(featureId, terminalId) {
        const feature = scopeOf(featureId)
        if (!feature?.terminals.some((terminal) => terminal.id === terminalId)) return
        set((state) => ({ terminalTabs: { ...state.terminalTabs, [featureId]: terminalId } }))
      },
      openTerminal(featureId, terminalId) {
        if (terminalId) get().selectTerminal(featureId, terminalId)
        get().setPanel('terminal', true)
      },
      addShell(featureId) {
        const feature = scopeOf(featureId)
        if (!feature) return
        const next =
          Math.max(
            0,
            ...feature.terminals.map((terminal) =>
              terminal.kind === 'shell' ? shellNumber(terminal.id) || 0 : 0,
            ),
          ) + 1
        const cwd = feature.worktree ?? feature.destination
        const terminal = {
          id: `${featureId}-shell-${next}`,
          label: 'zsh',
          state: 'draft' as const,
          kind: 'shell' as const,
          cwd,
          output: `${cwd} $ `,
        }
        updateFeature(featureId, (item) => ({ ...item, terminals: [...item.terminals, terminal] }))
        get().selectTerminal(featureId, terminal.id)
      },
      toggleTerminals(scopeId) {
        const opening = !get().panels.terminal
        get().togglePanel('terminal')
        if (opening && scopeId && scopeOf(scopeId)?.terminals.length === 0) get().addShell(scopeId)
      },
      closeTerminal(featureId, terminalId) {
        const feature = scopeOf(featureId)
        const index = feature?.terminals.findIndex((terminal) => terminal.id === terminalId) ?? -1
        if (!feature || index < 0) return
        const target = feature.terminals[index]
        if (target.kind === 'agent' && target.state === 'running') return
        const remaining = feature.terminals.filter((terminal) => terminal.id !== terminalId)
        const selected = get().terminalTabs[featureId] ?? feature.terminals[0]?.id
        updateFeature(featureId, (item) => ({ ...item, terminals: remaining }))
        if (!remaining.length)
          set((state) => ({
            panels: { ...state.panels, terminal: false, terminalMaximized: false },
          }))
        const terminalTabs = { ...get().terminalTabs }
        if (selected === terminalId) {
          const next = remaining[Math.min(index, remaining.length - 1)]
          if (next) terminalTabs[featureId] = next.id
          else delete terminalTabs[featureId]
        }
        set({ terminalTabs })
      },
      setTerminalShell(featureId, terminalId, shell) {
        const name = shell.trim()
        if (!/^[\w.+-]{1,32}$/.test(name)) return
        updateFeature(featureId, (item) => ({
          ...item,
          terminals: item.terminals.map((terminal) => {
            if (terminal.id !== terminalId || terminal.kind !== 'shell') return terminal
            return { ...terminal, label: name, shell: name }
          }),
        }))
      },
      setTerminalProcess(featureId, terminalId, name) {
        const process = name.trim().slice(0, 64)
        if (!process) return
        updateFeature(featureId, (item) => ({
          ...item,
          terminals: item.terminals.map((terminal) => {
            if (terminal.id !== terminalId || terminal.kind !== 'shell') return terminal
            if (terminal.state !== 'draft' && terminal.state !== 'running') return terminal
            const idle = process === (terminal.shell ?? terminal.label)
            return idle
              ? {
                  ...terminal,
                  label: terminal.shell ?? process,
                  state: 'draft',
                  command: undefined,
                }
              : {
                  ...terminal,
                  shell: terminal.shell ?? terminal.label,
                  label: process,
                  state: 'running',
                  command: process,
                }
          }),
        }))
      },
      markTerminalExited(featureId, terminalId, exitCode) {
        updateFeature(featureId, (item) => ({
          ...item,
          terminals: item.terminals.map((terminal) =>
            terminal.id === terminalId
              ? { ...terminal, state: exitCode === 0 ? 'completed' : 'failed' }
              : terminal,
          ),
        }))
      },
      stopTerminal(featureId, terminalId) {
        updateFeature(featureId, (item) => ({
          ...item,
          terminals: item.terminals.map((terminal) =>
            terminal.id === terminalId && terminal.state === 'running'
              ? { ...terminal, state: 'interrupted' }
              : terminal,
          ),
        }))
      },
    }
  })
}
export type WorkbenchStore = ReturnType<typeof createWorkbenchStore>
