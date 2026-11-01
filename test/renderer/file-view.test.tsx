import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'
import { createWorkbenchStore } from '../../src/renderer/src/entities/feature'
import { overrideFlags } from '../../src/renderer/src/shared/lib/feature-flags'

afterEach(() => overrideFlags({}))

const panel = () => screen.findByRole('complementary', { name: 'Project' })
const explorerItem = (root: HTMLElement, name: RegExp) =>
  within(within(root).getByRole('tree', { name: 'Explorer' })).getByRole('treeitem', { name })
const changeItem = (root: HTMLElement, name: RegExp) =>
  within(within(root).getByRole('list', { name: 'Changes' })).getByRole('listitem', { name })

it('opens a file preview from Explorer and a diff from Changes as tabs', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  const root = await panel()
  fireEvent.click(explorerItem(root, /^README\.md/))
  expect(await screen.findByRole('tab', { name: /README\.md/ })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  const preview = screen.getByRole('region', { name: /README\.md preview/ })
  expect(within(preview).getAllByRole('row').length).toBeGreaterThan(1)
  expect(within(preview).getByText('1')).toBeInTheDocument()

  fireEvent.click(changeItem(root, /^en\.ts/))
  const diff = await screen.findByRole('region', { name: /en\.ts diff/ })
  expect(diff.querySelector('[data-diff="removed"], [data-diff="changed"]')).not.toBeNull()
  expect(diff.querySelector('[data-diff="added"], [data-diff="changed"]')).not.toBeNull()
  expect(screen.getByRole('tab', { name: /en\.ts/ })).toHaveAttribute('aria-selected', 'true')
})

it('shows an untracked file as added lines and a deleted file as removed lines', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  const root = await panel()
  fireEvent.click(changeItem(root, /^context-panel\.test\.tsx/))
  const added = await screen.findByRole('region', { name: /context-panel\.test\.tsx diff/ })
  expect(added.querySelector('[data-diff="removed"], [data-diff="changed"]')).toBeNull()
  expect(added.querySelector('[data-diff="added"]')).not.toBeNull()
  fireEvent.click(changeItem(root, /^old-deploy\.sh/))
  const removed = await screen.findByRole('region', { name: /old-deploy\.sh diff/ })
  expect(removed.querySelector('[data-diff="added"], [data-diff="changed"]')).toBeNull()
  expect(removed.querySelector('[data-diff="removed"]')).not.toBeNull()
})

it('reuses the tab of a file already open and closes it with Ctrl+W', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  const root = await panel()
  fireEvent.click(explorerItem(root, /^README\.md/))
  await screen.findByRole('region', { name: /README\.md preview/ })
  fireEvent.click(screen.getByRole('tab', { name: /Login with OAuth/ }))
  fireEvent.click(explorerItem(root, /^README\.md/))
  await screen.findByRole('region', { name: /README\.md preview/ })
  expect(screen.getAllByRole('tab', { name: /README\.md/ })).toHaveLength(1)
  fireEvent.keyDown(window, { key: 'w', ctrlKey: true })
  expect(screen.queryByRole('tab', { name: /README\.md/ })).toBeNull()
})

it('opens files from the keyboard', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  const root = await panel()
  const button = within(explorerItem(root, /^README\.md/)).getByRole('button')
  fireEvent.click(button)
  expect(await screen.findByRole('region', { name: /README\.md preview/ })).toBeInTheDocument()
})

it('opens no file view while the flags are off', async () => {
  overrideFlags({ explorer: false, 'source-control': false })
  const store = createWorkbenchStore(createMockSource({ locale: 'en' }))
  await store.getState().openProject('dev')
  await store.getState().openFile('README.md', 'preview')
  await store.getState().openFile('src/shared/i18n/en.ts', 'diff')
  expect(store.getState().fileTabs).toEqual([])
  expect(store.getState().view.kind).not.toBe('file')
})
