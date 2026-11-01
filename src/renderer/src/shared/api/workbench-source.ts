import type { Locale } from '@/shared/i18n'
import type { ToolId, UiState } from '@/shared/ui'
export const roleIds = ['research', 'planner', 'implementer', 'tester', 'reviewer'] as const
export type RoleId = (typeof roleIds)[number]
/** The Ferreiro (general agent) plus the five RPI roles. */
export const agentIds = ['smith', ...roleIds] as const
export type AgentId = (typeof agentIds)[number]
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
  tool?: ToolId
  author?: AgentId
  parts?: MessagePart[]
  attachments?: ImageAttachment[]
  /** ISO timestamp of when the message was sent or the reply started. */
  createdAt?: string
  /** Agent replies: configured model, wall time and token usage of the turn. */
  model?: string
  durationMs?: number
  usage?: { input: number; cached: number; output: number }
}
export interface MockTerminal {
  id: string
  label: string
  state: UiState
  output: string
  kind?: 'agent' | 'shell'
  agent?: AgentId
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
  /** Commits behind and ahead of the base branch. */
  behind?: number
  ahead?: number
  worktree: string | null
  target: string
  stage: AgentId
  messages: ChatMessage[]
  terminals: MockTerminal[]
}
export type GitStatus = 'M' | 'U' | 'A' | 'D'
export interface FileNode {
  name: string
  children?: FileNode[]
  /** Ignored by git (dimmed in Explorer, like build output). */
  ignored?: boolean
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
  /** Working tree changes, with git's short status: M modified, U untracked, A added, D deleted. */
  changes: { path: string; status: GitStatus }[]
  /** Demands waiting in the backlog; starting one turns it into a feature with Research. */
  demands?: Demand[]
  /** Project file tree for Explorer; folders have children. */
  files?: FileNode[]
  features: FeatureSnapshot[]
  /** Shells opened while no feature is selected; they run in the project folder. */
  terminals?: MockTerminal[]
}
export interface SettingsSnapshot {
  agentNames?: Partial<Record<AgentId, string>>
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
    /** App language; absent means the source's own locale. */
    language?: Locale
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
/** Text of one project file; binary and oversized files are reported instead of read. */
export type FileContent =
  { kind: 'text'; text: string } | { kind: 'binary' } | { kind: 'too-large' }
/** Base (HEAD) and working tree text of a changed file; an empty side means added or deleted. */
export type FileDiff = { kind: 'text'; base: string; working: string } | { kind: 'binary' }
export interface Demand {
  id: string
  title: string
  description: string
  createdAt: string
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
  saveArchiveState?(snapshot: ProjectSnapshot): void
  scanSkills(root: string): Promise<ProjectSnapshot['skills']>
  readArtifact(id: string): Promise<string>
  /** Reads a project file for the preview (mock: generated sample text). */
  readFile(path: string): Promise<FileContent>
  /** Reads both sides of a working tree change (mock: generated sample text). */
  readDiff(path: string): Promise<FileDiff>
  streamReply(
    request: { featureId: string; role: AgentId; prompt: string; authoring?: LibraryKind },
    onEvent: (event: ReplyEvent) => void,
    options?: ReplyOptions,
  ): () => void
  loadSettings(): Promise<SettingsSnapshot>
  saveSettings(settings: SettingsSnapshot): Promise<void>
  loadMemories(): Promise<MemoryRecord[]>
  loadConnectors(): Promise<ConnectorSnapshot[]>
  loadUsage(): Promise<ToolUsage[]>
  /** Summarizes the conversation of a feature (mock: deterministic text). */
  summarizeConversation(featureId: string): Promise<string>
}
