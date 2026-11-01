import userEvent from '@testing-library/user-event'
import { createWorkbenchStore } from '../../src/renderer/src/entities/feature'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'

beforeEach(() => localStorage.clear())

it('archives a feature with its documents, blocks running ones and restores from Archived', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  const sidebar = await screen.findByRole('complementary', { name: 'dev' })
  expect(within(sidebar).getByRole('button', { name: 'Archive Login with OAuth' })).toBeDisabled()
  fireEvent.click(within(sidebar).getByRole('button', { name: 'Archive Catalog search' }))
  expect(within(sidebar).queryByText('Catalog search')).toBeNull()
  expect(screen.queryByRole('tab', { name: /Catalog search/ })).toBeNull()
  fireEvent.click(within(sidebar).getByRole('button', { name: 'Archived' }))
  const archived = screen.getByRole('region', { name: 'Archived' })
  expect(within(archived).getByText('Catalog search')).toBeInTheDocument()
  fireEvent.click(within(archived).getByRole('button', { name: 'Restore Catalog search' }))
  expect(within(sidebar).getAllByText('Catalog search').length).toBeGreaterThan(0)
})

it('remembers collapsed sections across restarts', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  const header = await screen.findByRole('button', { name: /^Specs/ })
  fireEvent.click(header)
  expect(header).toHaveAttribute('aria-expanded', 'false')
  cleanup()
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  expect(await screen.findByRole('button', { name: /^Specs/ })).toHaveAttribute(
    'aria-expanded',
    'false',
  )
})

it('explains why a running feature cannot be archived', async () => {
  const user = userEvent.setup()
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  const button = await screen.findByRole('button', { name: 'Archive Login with OAuth' })
  await user.hover(button.parentElement!)
  expect(await screen.findByRole('tooltip')).toHaveTextContent(
    'Interrupt the agent before archiving',
  )
})

it('keeps archived source records, restores a plan with its spec and keeps restored features closed', async () => {
  const source = createMockSource({ locale: 'en' })
  const store = createWorkbenchStore(source)
  await store.getState().openProject('dev')
  const initial = store.getState().snapshot!
  const feature = initial.features.find((f) => f.name === 'Catalog search')!
  const spec = initial.artifacts.find((a) => a.kind === 'spec' && a.featureId === feature.id)!
  const plan = initial.artifacts.find((a) => a.kind === 'plan' && a.specId === spec.id)!
  await store.getState().openDocument(spec.id)
  await store.getState().openDocument(plan.id)
  store.getState().openFeature(feature.id)
  const before = store.getState().openFeatureIds
  const index = before.indexOf(feature.id)
  const remaining = before.filter((id) => id !== feature.id)
  store.getState().archiveItem({ kind: 'feature', id: feature.id })
  expect(store.getState().view).toEqual({
    kind: 'conversation',
    featureId: remaining[Math.min(index, remaining.length - 1)],
  })
  expect(store.getState().openDocumentIds).not.toContain(spec.id)
  expect(store.getState().openDocumentIds).not.toContain(plan.id)
  const saved = await source.loadProject('dev')
  expect(saved.features).toHaveLength(initial.features.length)
  expect(saved.artifacts).toHaveLength(initial.artifacts.length)
  expect(saved.features.find((f) => f.id === feature.id)?.archived).toBe(true)
  expect(saved.artifacts.find((a) => a.id === plan.id)?.archived).toBe(true)
  store.getState().restoreItem({ kind: 'plan', id: plan.id })
  expect(store.getState().snapshot!.artifacts.find((a) => a.id === spec.id)?.archived).toBe(false)
  expect(store.getState().snapshot!.features.find((f) => f.id === feature.id)?.archived).toBe(true)
  store.getState().restoreItem({ kind: 'feature', id: feature.id })
  expect(store.getState().openFeatureIds).not.toContain(feature.id)
  store.getState().openFeature(feature.id)
  expect(store.getState().openFeatureIds).toContain(feature.id)
})

it('blocks running features in the store and falls back to the empty state after the last tab is archived', async () => {
  const store = createWorkbenchStore(createMockSource({ locale: 'en' }))
  await store.getState().openProject('dev')
  const initial = store.getState().snapshot!
  const running = initial.features.find((f) => f.state === 'running')!
  store.getState().archiveItem({ kind: 'feature', id: running.id })
  expect(store.getState().snapshot).toBe(initial)
  const target = initial.features.find((f) => f.name === 'Catalog search')!
  for (const id of [...store.getState().openFeatureIds]) {
    if (id !== target.id) store.getState().closeFeature(id)
  }
  store.getState().openFeature(target.id)
  store.getState().archiveItem({ kind: 'feature', id: target.id })
  expect(store.getState().view).toEqual({ kind: 'home' })
})

it('archives unlinked artifacts without inventing a slug cascade', async () => {
  const source = createMockSource({ locale: 'en' })
  const snapshot = await source.loadProject('dev')
  const store = createWorkbenchStore({
    ...source,
    loadProject: async () => ({
      ...snapshot,
      artifacts: [
        { id: 's', name: 'same/SPEC.md', kind: 'spec', state: 'draft', author: 'research' },
        { id: 'p', name: 'same/PLAN.md', kind: 'plan', state: 'draft', author: 'planner' },
      ],
    }),
  })
  await store.getState().openProject('dev')
  store.getState().archiveItem({ kind: 'spec', id: 's' })
  expect(store.getState().snapshot!.artifacts[0].archived).toBe(true)
  expect(store.getState().snapshot!.artifacts[1].archived).toBeUndefined()
  store.getState().archiveItem({ kind: 'plan', id: 'p' })
  expect(store.getState().snapshot!.artifacts[1].archived).toBe(true)
})

it('collapses each section with the keyboard while preserving the heading count', async () => {
  const user = userEvent.setup()
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  const sidebar = await screen.findByRole('complementary', { name: 'dev' })
  for (const title of ['Chats', 'Specs', 'Plans', 'Reviews', 'Skills', 'Memories']) {
    const section = within(sidebar).getByRole('region', { name: new RegExp('^' + title) })
    const header = within(section).getByRole('button', { name: new RegExp('^' + title) })
    const name = header.textContent
    const wasOpen = header.getAttribute('aria-expanded') === 'true'
    header.focus()
    await user.keyboard('{Enter}')
    expect(header).toHaveAttribute('aria-expanded', String(!wasOpen))
    expect(header.textContent).toBe(name)
    const body = document.getElementById(header.getAttribute('aria-controls')!)
    if (wasOpen) await waitFor(() => expect(body).not.toBeVisible())
    else expect(body).toBeVisible()
    // Chats keeps the `features` storage key so remembered layouts survive the rename.
    const key = title === 'Chats' ? 'features' : title.toLowerCase()
    expect(localStorage.getItem('forja.sidebar.' + key)).toBe(String(!wasOpen))
  }
})

it('keeps disclosures usable when viewer storage is unavailable', async () => {
  const read = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('Unavailable')
  })
  const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Unavailable')
  })
  try {
    render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
    const header = await screen.findByRole('button', { name: /^Specs/ })
    fireEvent.click(header)
    expect(header).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(header)
    expect(header).toHaveAttribute('aria-expanded', 'true')
  } finally {
    read.mockRestore()
    write.mockRestore()
  }
})

it('archives a spec and its linked plan from the row action and restores the plan in Archived', async () => {
  const source = createMockSource({ locale: 'en' })
  const snapshot = await source.loadProject('dev')
  const spec = snapshot.artifacts.find((a) => a.kind === 'spec' && !a.archived)!
  const plan = snapshot.artifacts.find((a) => a.kind === 'plan' && a.specId === spec.id)!
  render(<WorkbenchPage source={source} initialProjectId="dev" />)
  const sidebar = await screen.findByRole('complementary', { name: 'dev' })
  fireEvent.click(within(sidebar).getByRole('button', { name: 'Archive ' + spec.name }))
  expect(within(sidebar).queryByText(spec.name)).toBeNull()
  expect(within(sidebar).queryByText(plan.name)).toBeNull()
  fireEvent.click(within(sidebar).getByRole('button', { name: 'Archived' }))
  const archived = screen.getByRole('region', { name: 'Archived' })
  fireEvent.click(within(archived).getByRole('button', { name: 'Restore ' + plan.name }))
  expect(within(sidebar).getByText(plan.name)).toBeInTheDocument()
  expect(
    within(within(sidebar).getByRole('region', { name: /^Specs/ })).getByText(spec.name),
  ).toBeInTheDocument()
})
