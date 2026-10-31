import type { Locale } from '@/shared/i18n'
import type { UiState } from '@/shared/ui'
export const roleIds = ['research', 'planner', 'implementer', 'tester', 'reviewer'] as const
export type RoleId = (typeof roleIds)[number]
export interface ProjectSummary {
  id: string
  name: string
  path: string
  lastOpenedAt: string
}
export interface ChatMessage {
  id: string
  role: 'user' | 'agent' | 'event'
  text: string
  status?: 'running' | 'completed' | 'interrupted'
  linkTo?: string
  author?: RoleId
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
}
export interface FeatureSnapshot {
  id: string
  slug: string
  name: string
  state: UiState
  mode: 'guided'
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
  artifacts: { id: string; name: string; kind: 'spec' | 'plan'; state: UiState; author: RoleId }[]
  skills: { id: string; name: string }[]
  branches: string[]
  changes: { path: string; status: string }[]
  features: FeatureSnapshot[]
}
export interface SettingsSnapshot {
  agents: { id: RoleId; model: string; instructions: string }[]
}
export type ReplyEvent =
  | { type: 'start' }
  | { type: 'text'; chunk: string }
  | { type: 'terminal'; terminalId: string; line: string }
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
  readArtifact(id: string): Promise<string>
  streamReply(
    request: { featureId: string; role: RoleId; prompt: string },
    onEvent: (event: ReplyEvent) => void,
    options?: ReplyOptions,
  ): () => void
  loadSettings(): Promise<SettingsSnapshot>
  saveSettings(settings: SettingsSnapshot): Promise<void>
}
