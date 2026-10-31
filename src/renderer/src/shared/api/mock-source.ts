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
      skills: index === 0 || index === 2 ? ['rpi-implement', 'git-flow'] : ['rpi-implement'],
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
    async loadMemories() {
      return [
        { id: 'memory-1', title: 'OAuth callback decision', kind: 'decision', author: 'research', date: '2026-10-31' },
        { id: 'memory-2', title: 'Regression test requested', kind: 'reference', author: 'reviewer', date: '2026-10-30' },
      ]
    },
    async loadConnectors() {
      return [
        { id: 'github', name: 'GitHub', transport: 'MCP', status: 'connected' as const, enabled: true },
        { id: 'filesystem', name: 'Filesystem', transport: 'stdio', status: 'available' as const, enabled: false },
      ]
    },
    async loadUsage() {
      return [
        { tool: 'claude' as const, plan: 'Pro', account: 'dev@example.com', updatedLabel: 'updated now', windows: [{ id: 'session', label: 'Session (5h)', usedPercent: 35, pacePercent: 30, resetLabel: 'resets in 3h16m', paceLabel: 'on pace' }, { id: 'week', label: 'Weekly', usedPercent: 11, pacePercent: 20, resetLabel: 'resets in 6d5h', paceLabel: 'on pace' }] },
        { tool: 'codex' as const, plan: 'Plus', account: 'dev@example.com', updatedLabel: 'updated 2 min ago', windows: [{ id: 'session', label: 'Session', usedPercent: 22, pacePercent: 25, resetLabel: 'resets in 2h', paceLabel: 'on pace' }] },
        { tool: 'opencode' as const, windows: [] },
        { tool: 'agy' as const, windows: [{ id: 'week', label: 'Weekly', usedPercent: 18, pacePercent: 20, resetLabel: 'resets in 5d', paceLabel: 'on pace' }] },
        { tool: 'grok' as const, windows: [{ id: 'week', label: 'Weekly', usedPercent: 42, pacePercent: 35, resetLabel: 'resets in 4d', paceLabel: 'on pace' }] },
      ]
    },
  }
}
