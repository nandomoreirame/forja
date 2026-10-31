import type { Locale } from '@/shared/i18n'
import { mockReplies } from './mock-replies'
import { mockProjects } from './mock-data'
import {
  roleIds,
  type ReplyEvent,
  type ReplyTimer,
  type SettingsSnapshot,
  type WorkbenchSource,
} from './workbench-source'
export function createMockSource({ locale }: { locale: Locale }): WorkbenchSource {
  const fixtures = mockProjects(locale)
  let settings: SettingsSnapshot = {
    agents: roleIds.map((id, index) => ({
      id,
      tool: (['claude', 'codex', 'opencode', 'agy', 'grok'] as const)[index],
      model: undefined,
      effort: 'default',
      instructions: '',
      skills: index === 2 ? ['rpi-implement', 'git-commit'] : ['rpi-implement'],
      autoInvoke: false,
    })),
    general: {
      skillsRoot: '~/.claude/skills',
      interruptPolicy: 'interrupt' as const,
      guidedMode: true as const,
      correctionRounds: 3 as const,
      inactivityMinutes: 30,
    },
  }
  const unavailable = async (): Promise<never> => {
    throw new Error('Not implemented in this slice')
  }
  return {
    locale,
    async addProject(project) {
      const existing = fixtures.find((item) => item.project.id === project.id)
      if (existing) {
        existing.project = structuredClone(project)
        return structuredClone(existing)
      }
      const snapshot = {
        project: structuredClone(project),
        agents: roleIds.map((id) => ({ id, state: 'draft' as const })),
        artifacts: [],
        skills: [],
        branches: [],
        changes: [],
        features: [],
      }
      fixtures.unshift(snapshot)
      return structuredClone(snapshot)
    },
    async listProjects() {
      return structuredClone(fixtures.map((item) => item.project))
    },
    async loadProject(id) {
      const snapshot = fixtures.find((item) => item.project.id === id)
      if (!snapshot) throw new Error('Unknown project')
      return structuredClone(snapshot)
    },
    readArtifact: unavailable,
    streamReply(request, onEvent, options = {}) {
      const script = mockReplies[locale][request.role]
      const size = Math.ceil(script.text.length / 12)
      const events: ReplyEvent[] = []
      for (let offset = 0; offset < script.text.length; offset += size) {
        events.push({ type: 'text', chunk: script.text.slice(offset, offset + size) })
      }
      script.terminalLines?.forEach((line, index) => {
        events.splice(1 + index * 3, 0, {
          type: 'terminal',
          terminalId: `${request.featureId}-${request.role}`,
          line,
        })
      })
      if (script.part) events.push({ type: 'part', part: script.part })
      events.push({ type: 'completed' })
      const schedule = options.setTimeout ?? setTimeout
      const unschedule = options.clearTimeout ?? clearTimeout
      const timers: ReplyTimer[] = []
      let finished = false
      onEvent({ type: 'start' })
      const emit = (event: ReplyEvent) => {
        if (finished) return
        if (event.type === 'completed') finished = true
        onEvent(event)
      }
      events.forEach((event, index) => {
        if (options.instant) emit(event)
        else timers.push(schedule(() => emit(event), (index + 1) * 120))
      })
      return () => {
        if (finished) return
        finished = true
        timers.forEach((timer) => unschedule(timer))
        onEvent({ type: 'interrupted' })
      }
    },
    async loadSettings() {
      return structuredClone(settings)
    },
    async saveSettings(next) {
      settings = structuredClone(next)
    },
  }
}
