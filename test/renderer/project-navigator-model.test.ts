// @vitest-environment node
import { expect, it } from 'vitest'
import {
  archiveCascade,
  groupFeatures,
  restoreCascade,
} from '../../src/renderer/src/features/project-navigator/model'
import type { FeatureSnapshot } from '../../src/renderer/src/shared/api/workbench-source'
import { createMockSource } from '../../src/renderer/src/shared/api'
const feature = (id: string, state: FeatureSnapshot['state'], activity: string, extra = {}) =>
  ({
    id,
    name: id,
    state,
    stage: 'research',
    lastActivityAt: activity,
    ...extra,
  }) as FeatureSnapshot

it('groups by attention and activity, excluding archived features and prioritizing end states', () => {
  const features = [
    feature('idle-old', 'draft', '2026-10-01'),
    feature('running', 'running', '2026-10-20'),
    feature('approval', 'waiting', '2026-10-10'),
    feature('fix', 'failed', '2026-10-25'),
    feature('done', 'completed', '2026-10-30', { endState: 'integrated' }),
    feature('hidden', 'draft', '2026-10-31', { archived: true }),
    feature('idle-new', 'draft', '2026-10-15'),
    feature('stalled', 'running', '2026-10-26', { stalled: true }),
    feature('abandoned', 'failed', '2026-10-29', { endState: 'abandoned' }),
    feature('running-new', 'running', '2026-10-28'),
  ]
  const before = structuredClone(features)
  const groups = groupFeatures(features)
  expect(groups.attention.map((f) => f.id)).toEqual(['stalled', 'fix', 'approval'])
  expect(groups.running.map((f) => f.id)).toEqual(['running-new', 'running'])
  expect(groups.idle.map((f) => f.id)).toEqual(['idle-new', 'idle-old'])
  expect(groups.finished.map((f) => f.id)).toEqual(['done', 'abandoned'])
  expect(features).toEqual(before)
  expect(groupFeatures([])).toEqual({ attention: [], running: [], idle: [], finished: [] })
})

const items = () =>
  ({
    features: [
      { id: 'f1', archived: false },
      { id: 'f2', archived: false },
    ],
    artifacts: [
      { id: 's1', kind: 'spec', featureId: 'f1', archived: false },
      { id: 'p1', kind: 'plan', specId: 's1', featureId: 'f1', archived: false },
      { id: 'r1', kind: 'review', featureId: 'f1', archived: false },
      { id: 's2', kind: 'spec', featureId: 'f2', archived: false },
      { id: 'p2', kind: 'plan', specId: 's2', featureId: 'f2', archived: false },
    ],
  }) as unknown as Pick<
    import('../../src/renderer/src/shared/api/workbench-source').ProjectSnapshot,
    'features' | 'artifacts'
  >

it('archives a feature and its artifacts without mutating input', () => {
  const original = items()
  const archived = archiveCascade(original, { kind: 'feature', id: 'f1' })
  expect(archived.features[0].archived).toBe(true)
  expect(archived.artifacts.filter((a) => a.archived).map((a) => a.id)).toEqual(['s1', 'p1', 'r1'])
  expect(original).toEqual(items())
  expect(archiveCascade(archived, { kind: 'feature', id: 'f1' })).toBe(archived)
})

it('archives a spec with only its plans and restores a plan with its spec', () => {
  const archived = archiveCascade(items(), { kind: 'spec', id: 's1' })
  expect(archived.artifacts.filter((a) => a.archived).map((a) => a.id)).toEqual(['s1', 'p1'])
  const restored = restoreCascade(archiveCascade(items(), { kind: 'feature', id: 'f1' }), {
    kind: 'plan',
    id: 'p1',
  })
  expect(restored.artifacts.find((a) => a.id === 's1')!.archived).toBe(false)
  expect(restored.artifacts.find((a) => a.id === 'p1')!.archived).toBe(false)
  expect(restored.features[0].archived).toBe(true)
  expect(restored.artifacts.find((a) => a.id === 'r1')!.archived).toBe(true)
})

it('restores a feature with all its artifacts', () => {
  const archived = items()
  archived.features[0].archived = true
  archived.artifacts.slice(0, 3).forEach((a) => {
    a.archived = true
  })
  const restored = restoreCascade(archived, { kind: 'feature', id: 'f1' })
  expect(restored).toEqual(items())
  expect(archived.features[0].archived).toBe(true)
})

it('archives only the target plan and ignores unknown targets', () => {
  expect(
    archiveCascade(items(), { kind: 'plan', id: 'p1' })
      .artifacts.filter((a) => a.archived)
      .map((a) => a.id),
  ).toEqual(['p1'])
  const original = items()
  expect(archiveCascade(original, { kind: 'spec', id: 'missing' })).toBe(original)
  expect(restoreCascade(original, { kind: 'plan', id: 'missing' })).toBe(original)
})

it.each(['en', 'pt-br'] as const)(
  'provides linked fixtures and scoped library records in %s',
  async (locale) => {
    const source = createMockSource({ locale })
    const project = await source.loadProject('dev')
    expect(project.features).toHaveLength(5)
    expect(project.features.some((f) => f.stalled)).toBe(true)
    expect(project.features.some((f) => f.endState === 'integrated')).toBe(true)
    expect(project.features.some((f) => f.archived)).toBe(true)
    for (const f of project.features) {
      expect(f.lastActivityAt).toBeTruthy()
      expect(
        project.artifacts.filter((a) => a.kind === 'spec' && a.featureId === f.id),
      ).toHaveLength(1)
    }
    for (const a of project.artifacts) {
      expect(project.features.some((f) => f.id === a.featureId)).toBe(true)
      if (a.kind === 'plan')
        expect(
          project.artifacts.some(
            (s) => s.kind === 'spec' && s.id === a.specId && s.featureId === a.featureId,
          ),
        ).toBe(true)
    }
    expect(new Set(project.skills.map((s) => s.scope))).toEqual(new Set(['project', 'global']))
    expect(new Set((await source.loadMemories()).map((m) => m.scope))).toEqual(
      new Set(['project', 'global']),
    )
  },
)
