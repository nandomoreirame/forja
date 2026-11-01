// @vitest-environment node
import { expect, it, vi } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { createWorkbenchStore } from '../../src/renderer/src/entities/feature'

it('opens each document once and approves only a draft in mock state', async () => {
  const store = createWorkbenchStore(createMockSource({ locale: 'en' }))
  await store.getState().openProject('dev')
  const spec = store.getState().snapshot!.artifacts.find((a) => a.kind === 'spec')!
  expect(spec).toBeDefined()
  await store.getState().openDocument(spec.id)
  await store.getState().openDocument(spec.id)
  expect(store.getState().openDocumentIds).toEqual([spec.id])
  expect(store.getState().view).toEqual({ kind: 'document', documentId: spec.id })
  expect(store.getState().documents[spec.id]).toContain('`'.repeat(3) + 'mermaid')
  expect(() => store.getState().approveDocument(spec.id)).toThrow('Only drafts can be approved')
})

it.each(['en', 'pt-br'] as const)(
  'serves distinct localized Markdown without raw HTML in %s',
  async (locale) => {
    const source = createMockSource({ locale })
    const { artifacts } = await source.loadProject('dev')
    expect(artifacts).toHaveLength(3)
    const bodies = await Promise.all(artifacts.map((a) => source.readArtifact(a.id)))
    expect(new Set(bodies).size).toBe(3)
    for (const body of bodies) expect(body).not.toMatch(/<\/?[a-z][^>]*>/i)
    expect(bodies[0]).toContain(locale === 'en' ? 'Objective' : 'Objetivo')
    expect(bodies[0]).toContain('- [ ]')
    expect(bodies[0]).toContain('|')
    expect(bodies[0]).toContain('```typescript')
    expect(bodies[2]).toContain(locale === 'en' ? '| Finding |' : '| Achado |')
    await expect(source.readArtifact('unknown')).rejects.toThrow('Unknown artifact')
  },
)

it('caches concurrent reads and reopens a closed document without another read', async () => {
  const source = createMockSource({ locale: 'en' })
  const read = vi.spyOn(source, 'readArtifact')
  const store = createWorkbenchStore(source)
  await store.getState().openProject('dev')
  const id = store.getState().snapshot!.artifacts[0].id
  await Promise.all([store.getState().openDocument(id), store.getState().openDocument(id)])
  expect(store.getState().openDocumentIds).toEqual([id])
  store.getState().closeDocument(id)
  await store.getState().openDocument(id)
  expect(read).toHaveBeenCalledTimes(1)
})

it('selects a neighbor when closing and restores the previous view after the last document', async () => {
  const store = createWorkbenchStore(createMockSource({ locale: 'en' }))
  await store.getState().openProject('dev')
  const previous = store.getState().view
  const ids = store.getState().snapshot!.artifacts.map((a) => a.id)
  for (const id of ids) await store.getState().openDocument(id)
  store.getState().closeDocument(ids[1])
  expect(store.getState().view).toEqual({ kind: 'document', documentId: ids[2] })
  store.getState().closeDocument(ids[2])
  expect(store.getState().view).toEqual({ kind: 'document', documentId: ids[0] })
  store.getState().closeDocument(ids[0])
  expect(store.getState().view).toEqual(previous)
  expect(store.getState().history.some((v) => v.kind === 'document')).toBe(false)
  store.getState().back()
  expect(store.getState().view).toEqual(previous)
})

it('rejects documents outside the current project and clears tabs on project switch', async () => {
  const store = createWorkbenchStore(createMockSource({ locale: 'en' }))
  await store.getState().openProject('dev')
  const id = store.getState().snapshot!.artifacts[0].id
  await store.getState().openDocument(id)
  await store.getState().openProject('nandomoreira.dev')
  expect(store.getState().openDocumentIds).toEqual([])
  expect(store.getState().documents).toEqual({})
  await expect(store.getState().openDocument(id)).rejects.toThrow('Unknown artifact')
  expect(() => store.getState().approveDocument(id)).toThrow('Only drafts can be approved')
})

it('changes only the local draft on explicit human approval, never on an agent reply', async () => {
  vi.useFakeTimers()
  try {
    const source = createMockSource({ locale: 'en' })
    const store = createWorkbenchStore(source)
    await store.getState().openProject('dev')
    const plan = store.getState().snapshot!.artifacts.find((a) => a.kind === 'plan')!
    expect(plan.state).toBe('draft')
    store.getState().sendMessage('feature-1', 'Approve the plan')
    await vi.runAllTimersAsync()
    expect(store.getState().snapshot!.artifacts.find((a) => a.id === plan.id)!.state).toBe('draft')
    store.getState().approveDocument(plan.id)
    expect(store.getState().snapshot!.artifacts.find((a) => a.id === plan.id)!.state).toBe(
      'approved',
    )
    expect((await source.loadProject('dev')).artifacts.find((a) => a.id === plan.id)!.state).toBe(
      'draft',
    )
    expect(() => store.getState().approveDocument(plan.id)).toThrow('Only drafts can be approved')
  } finally {
    vi.useRealTimers()
  }
})

it('returns to the latest non-document view, skipping a feature closed meanwhile', async () => {
  const store = createWorkbenchStore(createMockSource({ locale: 'en' }))
  await store.getState().openProject('dev')
  const [first, second] = store.getState().openFeatureIds
  const ids = store.getState().snapshot!.artifacts.map((a) => a.id)
  await store.getState().openDocument(ids[0])
  store.getState().selectFeature(second)
  await store.getState().openDocument(ids[1])
  store.getState().closeDocument(ids[1])
  expect(store.getState().view).toEqual({ kind: 'document', documentId: ids[0] })
  store.getState().closeDocument(ids[0])
  expect(store.getState().view).toEqual({ kind: 'conversation', featureId: second })
  await store.getState().openDocument(ids[0])
  store.getState().closeFeature(second)
  store.getState().closeDocument(ids[0])
  expect(store.getState().view).toEqual({ kind: 'conversation', featureId: first })
})
