import type { Locale } from '@/shared/i18n'
import { mockProjects } from './mock-data'
import { roleIds, type WorkbenchSource } from './workbench-source'
export function createMockSource({ locale }: { locale: Locale }): WorkbenchSource {
  const fixtures = mockProjects(locale)
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
    streamReply: unavailable,
    loadSettings: unavailable,
    saveSettings: unavailable,
  }
}
