import type { Locale } from '@/shared/i18n'
import type { ToolId, UiState } from '@/shared/ui'
export const roleIds = ['research', 'planner', 'implementer', 'tester', 'reviewer'] as const
export type RoleId = (typeof roleIds)[number]
export interface ProjectSummary {
  id: string
  name: string
  path: string
  lastOpenedAt: string
}
export interface ImageAttachment {
  kind: 'image'
  name: string
  src: string
  alt: string
}
export type MessagePart =
  | { kind: 'command'; command: string; exitCode: number; output: string; cwd?: string }
  | { kind: 'log'; title: string; lines: string[]; level?: 'info' | 'warn' | 'error' }
export interface ChatMessage {
  id: string
  role: 'user' | 'agent' | 'event'
  text: string
  status?: 'running' | 'completed' | 'interrupted'
  linkTo?: string
  author?: RoleId
  parts?: MessagePart[]
  attachments?: ImageAttachment[]
}
export interface MockTerminal {
  id: string
  label: string
  state: UiState
  output: string
  kind?: 'agent' | 'shell'
  agent?: RoleId
  command?: string
  cwd?: string
  shell?: string
}
export interface FeatureSnapshot {
  lastActivityAt: string
  endState?: 'integrated' | 'abandoned'
  stalled?: boolean
  archived?: boolean
  id: string
  slug: string
  name: string
  state: UiState
  mode: 'guided'
  tool: ToolId
  destination: string
  branch: string
  worktree: string | null
  target: string
  stage: RoleId
  messages: ChatMessage[]
  terminals: MockTerminal[]
}
export interface ProjectSnapshot {
  project: ProjectSummary
  agents: { id: RoleId; state: UiState }[]
  artifacts: {
    id: string
    name: string
    kind: 'spec' | 'plan' | 'review'
    featureId?: string
    specId?: string
    archived?: boolean
    state: UiState
    author: RoleId
  }[]
  skills: { id: string; name: string; scope: 'project' | 'global' }[]
  branches: string[]
  changes: { path: string; status: string }[]
  features: FeatureSnapshot[]
  /** Shells opened while no feature is selected; they run in the project folder. */
  terminals?: MockTerminal[]
}
export interface SettingsSnapshot {
  agents: {
    id: RoleId
    tool: ToolId
    model?: string
    effort: string
    instructions: string
    skills: readonly string[]
    autoInvoke: boolean
  }[]
  general?: {
    skillsRoot: string
    interruptPolicy: 'interrupt' | 'queue'
    guidedMode: true
    correctionRounds: 3
    inactivityMinutes: number
  }
}
export type SettingsTab = 'agents' | 'general' | 'connectors'
export type LibraryKind = 'skill' | 'memory'
export type LibraryScope = 'project' | 'global'
export interface LibraryDocument {
  id: string
  name: string
  kind: LibraryKind
  scope: LibraryScope
}
export interface MemoryRecord {
  scope: 'project' | 'global'
  id: string
  title: string
  kind: string
  author: RoleId
  date: string
}
export interface ConnectorSnapshot {
  id: string
  name: string
  transport: string
  status: 'connected' | 'available' | 'offline'
  enabled: boolean
}
export interface UsageWindow {
  id: string
  label: string
  usedPercent: number
  pacePercent: number
  resetLabel: string
  paceLabel: string
}
export interface ToolUsage {
  tool: ToolId
  plan?: string
  account?: string
  updatedLabel?: string
  windows: readonly UsageWindow[]
}
export type ReplyEvent =
  | { type: 'start' }
  | { type: 'text'; chunk: string }
  | { type: 'terminal'; terminalId: string; line: string }
  | { type: 'part'; part: MessagePart }
  | { type: 'completed' }
  | { type: 'interrupted' }
export type ReplyTimer = number | ReturnType<typeof setTimeout>
export interface ReplyOptions {
  instant?: boolean
  setTimeout?: (callback: () => void, delay: number) => ReplyTimer
  clearTimeout?: (timer: ReplyTimer) => void
}
export interface WorkbenchSource {
  readonly locale: Locale
  addProject(project: ProjectSummary): Promise<ProjectSnapshot>
  listProjects(): Promise<ProjectSummary[]>
  loadProject(id: string): Promise<ProjectSnapshot>
  scanSkills(root: string): Promise<ProjectSnapshot['skills']>
  readArtifact(id: string): Promise<string>
  streamReply(
    request: { featureId: string; role: RoleId; prompt: string; authoring?: LibraryKind },
    onEvent: (event: ReplyEvent) => void,
    options?: ReplyOptions,
  ): () => void
  loadSettings(): Promise<SettingsSnapshot>
  saveSettings(settings: SettingsSnapshot): Promise<void>
  loadMemories(): Promise<MemoryRecord[]>
  loadConnectors(): Promise<ConnectorSnapshot[]>
  loadUsage(): Promise<ToolUsage[]>
}
