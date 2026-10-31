import type { Locale } from '@/shared/i18n'
import { mockProjects } from './mock-data'
import type { WorkbenchSource } from './workbench-source'
export function createMockSource({ locale }: { locale: Locale }): WorkbenchSource {
  const fixtures = mockProjects(locale)
  const unavailable = async (): Promise<never> => {
    throw new Error('Not implemented in this slice')
  }
  return {
    locale,
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
