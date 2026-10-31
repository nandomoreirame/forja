import type { RoleId } from '@/renderer/src/shared/api'
import type { ToolId } from '@/shared/ui'

export interface AgentProfile {
  role?: RoleId
  id?: RoleId
  tool: ToolId
  model?: string
  effort: string
  instructions: string
  skills: readonly string[]
  autoInvoke: boolean
}

export interface GeneralSettings {
  skillsRoot: string
  interruptPolicy: 'interrupt' | 'queue'
  guidedMode: true
  correctionRounds: 3
  inactivityMinutes: number
}

export const normalizeProfile = (profile: AgentProfile): AgentProfile => ({
  ...profile,
  model: profile.model?.trim() || undefined,
  instructions: profile.instructions.trim(),
  skills: [...new Set(profile.skills)].sort(),
})

export const isDirty = (saved: AgentProfile, draft: AgentProfile) =>
  JSON.stringify(normalizeProfile(saved)) !== JSON.stringify(normalizeProfile(draft))

const supportedEffort: Partial<Record<ToolId, string[]>> = {
  claude: ['default', 'low', 'medium', 'high'],
  codex: ['default', 'low', 'medium', 'high'],
  opencode: ['default', 'low', 'medium', 'high'],
}

export const effortOptions = (tool: ToolId): string[] => supportedEffort[tool] ?? ['default']

export const inactivityError = (minutes: number): string | undefined =>
  Number.isInteger(minutes) && minutes >= 1 && minutes <= 120
    ? undefined
    : 'Inactivity must be between 1 and 120 minutes'
