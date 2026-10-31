// @vitest-environment node
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
it('serves isolated localized snapshots for both projects', async () => {
  const source = createMockSource({ locale: 'pt-br' })
  expect((await source.listProjects()).map((p) => p.name)).toEqual(['acme-api', 'dev'])
  const fresh = await source.loadProject('acme-api')
  expect(fresh.features).toHaveLength(0)
  expect(fresh.agents.map((a) => a.id)).toEqual([
    'research',
    'planner',
    'implementer',
    'tester',
    'reviewer',
  ])
  const dev = await source.loadProject('dev')
  expect(dev.features.map((f) => f.name)).toEqual(['Login com OAuth', 'Busca no catálogo'])
  dev.features.length = 0
  expect((await source.loadProject('dev')).features).toHaveLength(2)
  await expect(source.loadProject('missing')).rejects.toThrow('Unknown project')
})

it('preserves fixture structure and identifiers across locales', async () => {
  const en = await createMockSource({ locale: 'en' }).loadProject('dev')
  const pt = await createMockSource({ locale: 'pt-br' }).loadProject('dev')
  expect(en.project).toEqual(pt.project)
  expect(en.agents).toEqual(pt.agents)
  expect(en.features.map((f) => ({ ...f, name: '' }))).toEqual(
    pt.features.map((f) => ({ ...f, name: '' })),
  )
  expect(en.features[0].name).toBe('Login with OAuth')
  expect(pt.features[0].name).toBe('Login com OAuth')
})
it('keeps deferred integrations explicitly unavailable', async () => {
  const source = createMockSource({ locale: 'en' })
  await expect(source.readArtifact('missing')).rejects.toThrow('Not implemented in this slice')
  await expect(source.loadSettings()).rejects.toThrow('Not implemented in this slice')
  await expect(source.saveSettings({ agents: [] })).rejects.toThrow('Not implemented in this slice')
  await expect(source.streamReply('id', 'research', 'prompt', () => {})).rejects.toThrow(
    'Not implemented in this slice',
  )
})

it('keeps screens independent from mock modules', () => {
  const root = 'src/renderer/src/pages'
  const visit = (dir: string) => {
    if (!existsSync(dir)) return
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) visit(path)
      else if (/\.tsx?$/.test(path))
        expect(readFileSync(path, 'utf8')).not.toMatch(
          /createMockSource|mockProjects|from\s+['"][^'"]*mock-(source|data)/,
        )
    }
  }
  visit(root)
  visit('src/renderer/src/widgets')
  visit('src/renderer/src/features')
})

it('adds selected projects once and keeps returned metadata and snapshots isolated', async () => {
  const source = createMockSource({ locale: 'en' })
  const project = {
    id: '/projects/selected',
    name: 'selected',
    path: '/projects/selected',
    lastOpenedAt: '2026-10-31T12:00:00Z',
  }
  const snapshot = await source.addProject(project)
  project.name = 'Changed outside source'
  snapshot.features.push({} as never)
  expect((await source.loadProject('/projects/selected')).project.name).toBe('selected')
  expect((await source.loadProject('/projects/selected')).features).toHaveLength(0)
  await source.addProject({ ...project, name: 'selected again' })
  expect((await source.listProjects()).filter((p) => p.id === project.id)).toHaveLength(1)
  expect((await source.loadProject(project.id)).project.name).toBe('selected again')
})
