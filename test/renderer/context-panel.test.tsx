import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, expect, it } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'

beforeEach(() => localStorage.clear())

const renderDev = async () => {
  const source = createMockSource({ locale: 'en' })
  const snapshot = await source.loadProject('dev')
  render(<WorkbenchPage source={source} initialProjectId="dev" />)
  await screen.findByRole('tab', { name: /Login with OAuth/ })
  return { snapshot, panel: screen.getByRole('complementary', { name: 'Project' }) }
}

it('resizes the project panel from a sash, like the sidebar and terminal', async () => {
  const { panel } = await renderDev()
  expect(screen.getByRole('separator', { name: 'Resize project panel' })).toBeInTheDocument()
  expect(panel.closest('[data-panel]')).toHaveAttribute('id', 'context')
  const header = document.querySelector('header')!
  fireEvent.click(within(header).getByRole('button', { name: 'Collapse project panel' }))
  expect(screen.queryByRole('complementary', { name: 'Project' })).toBeNull()
  expect(screen.queryByRole('separator', { name: 'Resize project panel' })).toBeNull()
  fireEvent.click(within(header).getByRole('button', { name: 'Expand project panel' }))
  expect(screen.getByRole('complementary', { name: 'Project' })).toBeInTheDocument()
})

it('stacks collapsible Project, Explorer, Changes and Branches sections', async () => {
  const { panel } = await renderDev()
  const regions = within(panel).getAllByRole('region')
  expect(
    regions.map(
      (region) => region.getAttribute('aria-labelledby') && region.querySelector('h2')!.textContent,
    ),
  ).toEqual([
    expect.stringMatching(/^Project/),
    expect.stringMatching(/^Explorer/),
    expect.stringMatching(/^Changes/),
    expect.stringMatching(/^Branches/),
  ])
  const explorer = within(panel).getByRole('button', { name: /^Explorer/ })
  expect(explorer).toHaveAttribute('aria-expanded', 'true')
  fireEvent.click(explorer)
  expect(explorer).toHaveAttribute('aria-expanded', 'false')
})

it('lists changed files with their folder and git status, like Source Control', async () => {
  const { snapshot, panel } = await renderDev()
  expect(snapshot.changes.length).toBeGreaterThan(3)
  const changes = within(panel).getByRole('region', { name: /^Changes/ })
  expect(within(changes).getByRole('heading')).toHaveTextContent(String(snapshot.changes.length))
  const list = within(changes).getByRole('list', { name: 'Changes' })
  expect(within(list).getAllByRole('listitem')).toHaveLength(snapshot.changes.length)
  const modified = snapshot.changes.find(
    (change) => change.status === 'M' && change.path.includes('/'),
  )!
  const name = modified.path.split('/').at(-1)!
  const row = within(list).getByRole('listitem', { name: new RegExp(`^${name}`) })
  expect(row).toHaveAccessibleName(`${name}, ${modified.path.slice(0, -name.length - 1)}, Modified`)
  expect(row).toHaveTextContent('M')
})

it('browses the project tree in Explorer with git decorations', async () => {
  const { snapshot, panel } = await renderDev()
  const tree = within(panel).getByRole('tree', { name: 'Explorer' })
  const src = within(tree).getByRole('treeitem', { name: /^src/ })
  expect(src).toHaveAttribute('aria-expanded', 'false')
  // A folder with changes inside carries a dot, like VS Code.
  expect(src.querySelector('[data-slot="change-dot"]')).not.toBeNull()
  fireEvent.click(within(src).getByRole('button', { name: /^src/ }))
  expect(src).toHaveAttribute('aria-expanded', 'true')
  expect(within(src).getByRole('treeitem', { name: /^main/ })).toBeInTheDocument()
  const claude = within(tree).getByRole('treeitem', { name: /^CLAUDE\.md/ })
  const status = snapshot.changes.find((change) => change.path === 'CLAUDE.md')!.status
  expect(claude).toHaveTextContent(status)
  // Folders come before files.
  const top = within(tree)
    .getAllByRole('treeitem')
    .filter((item) => item.getAttribute('aria-level') === '1')
  const firstFile = top.findIndex((item) => !item.hasAttribute('aria-expanded'))
  expect(top.slice(firstFile).every((item) => !item.hasAttribute('aria-expanded'))).toBe(true)
})

it('shows empty states for a project without files or changes', async () => {
  render(
    <WorkbenchPage
      source={createMockSource({ locale: 'en' })}
      initialProjectId="nandomoreira.dev"
    />,
  )
  const panel = await screen.findByRole('complementary', { name: 'Project' })
  expect(within(panel).getByRole('region', { name: /^Changes/ })).toHaveTextContent('No changes')
  expect(within(panel).getByRole('region', { name: /^Explorer/ })).toHaveTextContent('No files')
})
