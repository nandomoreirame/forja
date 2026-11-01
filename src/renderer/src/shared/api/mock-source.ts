import type { MockLibrary } from './mock-library'
import { getDictionary, type Locale } from '@/shared/i18n'
import { authoringReplies, mockReplies } from './mock-replies'
import { mockArtifactMarkdown, mockProjects } from './mock-data'
import {
  roleIds,
  type ReplyEvent,
  type ReplyTimer,
  type SettingsSnapshot,
  type ProjectSnapshot,
  type WorkbenchSource,
} from './workbench-source'
export function createMockSource({
  locale,
  library,
  loadSkills,
}: {
  locale: Locale
  library?: MockLibrary
  loadSkills?: (root: string) => Promise<{ id: string; name: string; markdown: string }[]>
}): WorkbenchSource {
  const fixtures = mockProjects(locale)
  const libraryMarkdown = new Map<string, string>()
  const dev = fixtures.find((item) => item.project.id === 'dev')
  if (library?.documents.length && dev) {
    // Real repository documents replace the sample artifacts so previews show only real files.
    dev.artifacts = []
    for (const document of library.documents) {
      const id = `library:${document.kind}:${document.slug}`
      dev.artifacts.push({
        id,
        name: document.name,
        kind: document.kind,
        state: document.state,
        author: document.kind === 'spec' ? 'research' : 'planner',
      })
      libraryMarkdown.set(id, document.markdown)
    }
  }
  const mockSkills = structuredClone(dev?.skills ?? [])
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
      skillsRoot: '~/.skills',
      interruptPolicy: 'interrupt' as const,
      guidedMode: true as const,
      correctionRounds: 3 as const,
      inactivityMinutes: 30,
    },
  }
  const scanSkills = async (root: string): Promise<ProjectSnapshot['skills']> => {
    if (!loadSkills) return structuredClone(mockSkills)
    const skills = await loadSkills(root).catch(() => [])
    for (const id of libraryMarkdown.keys()) {
      if (id.startsWith('library:skill:')) libraryMarkdown.delete(id)
    }
    return [
      ...structuredClone(mockSkills),
      ...skills.map((skill) => {
        const id = `library:skill:${skill.id}`
        libraryMarkdown.set(id, skill.markdown)
        return { id, name: skill.name, scope: 'global' as const }
      }),
    ]
  }
  return {
    locale,
    scanSkills,
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
    saveArchiveState(snapshot) {
      const fixture = fixtures.find((item) => item.project.id === snapshot.project.id)
      if (!fixture) return
      fixture.features = fixture.features.map((item) => ({
        ...item,
        archived: snapshot.features.find((feature) => feature.id === item.id)?.archived,
      }))
      fixture.artifacts = fixture.artifacts.map((item) => ({
        ...item,
        archived: snapshot.artifacts.find((artifact) => artifact.id === item.id)?.archived,
      }))
    },
    async loadProject(id) {
      const snapshot = fixtures.find((item) => item.project.id === id)
      if (!snapshot) throw new Error('Unknown project')
      if (id === 'dev' && loadSkills)
        snapshot.skills = await scanSkills(settings.general!.skillsRoot)
      return structuredClone(snapshot)
    },
    async readArtifact(id) {
      if (libraryMarkdown.has(id)) return libraryMarkdown.get(id)!
      const skill = fixtures.flatMap((item) => item.skills).find((item) => item.id === id)
      if (skill)
        return `---\nname: ${skill.name}\nscope: ${skill.scope}\n---\n# ${skill.name}\n\n${getDictionary(locale).app.mockSkillInstructions}`
      if (id.startsWith('memory:')) {
        const memory = (await this.loadMemories()).find((item) => `memory:${item.id}` === id)
        if (memory) return `# ${memory.title}\n\n${getDictionary(locale).app.mockMemoryBody}`
      }
      const artifact = fixtures.flatMap((item) => item.artifacts).find((item) => item.id === id)
      if (!artifact) throw new Error('Unknown artifact')
      const feature = fixtures
        .flatMap((item) => item.features)
        .find((item) => item.id === artifact.featureId)
      if (!feature) throw new Error('Unknown artifact feature')
      return mockArtifactMarkdown(locale, artifact, feature)
    },
    streamReply(request, onEvent, options = {}) {
      const script = request.authoring
        ? authoringReplies[locale][request.authoring]
        : mockReplies[locale][request.role]
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
        {
          id: 'memory-1',
          title: locale === 'en' ? 'OAuth callback decision' : 'Decisão sobre callback OAuth',
          scope: 'project',
          kind: 'decision',
          author: 'research',
          date: '2026-10-31',
        },
        {
          id: 'memory-2',
          title: locale === 'en' ? 'Regression test requested' : 'Teste de regressão solicitado',
          scope: 'global',
          kind: 'reference',
          author: 'reviewer',
          date: '2026-10-30',
        },
      ]
    },
    async loadConnectors() {
      return [
        {
          id: 'github',
          name: 'GitHub',
          transport: 'MCP',
          status: 'connected' as const,
          enabled: true,
        },
        {
          id: 'filesystem',
          name: 'Filesystem',
          transport: 'stdio',
          status: 'available' as const,
          enabled: false,
        },
      ]
    },
    async summarizeConversation(featureId) {
      const feature = fixtures.flatMap((item) => item.features).find((f) => f.id === featureId)
      if (!feature) throw new Error('Unknown feature')
      const count = feature.messages.length
      return locale === 'en'
        ? `${feature.name}: the user asked for OAuth login with clear error feedback. Research mapped the provider errors, the Planner split the work, the Implementer changed the callback and the Tester requested a fix for the cancelled login message (${count} messages).`
        : `${feature.name}: o usuário pediu login OAuth com mensagens de erro claras. A pesquisa mapeou os erros do provedor, o Planejador dividiu o trabalho, o Implementador alterou o callback e o Testador pediu uma correção na mensagem de login cancelado (${count} mensagens).`
    },
    async loadUsage() {
      return [
        {
          tool: 'claude' as const,
          plan: 'Pro',
          account: 'dev@example.com',
          updatedLabel: 'updated now',
          windows: [
            {
              id: 'session',
              label: 'Session (5h)',
              usedPercent: 35,
              pacePercent: 30,
              resetLabel: 'resets in 3h16m',
              paceLabel: 'on pace',
            },
            {
              id: 'week',
              label: 'Weekly',
              usedPercent: 11,
              pacePercent: 20,
              resetLabel: 'resets in 6d5h',
              paceLabel: 'on pace',
            },
          ],
        },
        {
          tool: 'codex' as const,
          plan: 'Plus',
          account: 'dev@example.com',
          updatedLabel: 'updated 2 min ago',
          windows: [
            {
              id: 'session',
              label: 'Session',
              usedPercent: 22,
              pacePercent: 25,
              resetLabel: 'resets in 2h',
              paceLabel: 'on pace',
            },
          ],
        },
        { tool: 'opencode' as const, windows: [] },
        {
          tool: 'agy' as const,
          windows: [
            {
              id: 'week',
              label: 'Weekly',
              usedPercent: 18,
              pacePercent: 20,
              resetLabel: 'resets in 5d',
              paceLabel: 'on pace',
            },
          ],
        },
        {
          tool: 'grok' as const,
          windows: [
            {
              id: 'week',
              label: 'Weekly',
              usedPercent: 42,
              pacePercent: 35,
              resetLabel: 'resets in 4d',
              paceLabel: 'on pace',
            },
          ],
        },
      ]
    },
  }
}
