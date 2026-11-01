import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, expect, it } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'

beforeEach(() => localStorage.clear())

const renderSidebar = async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  return screen.findByRole('complementary', { name: 'dev' })
}

it('splits the sidebar into resizable panes that scroll on their own', async () => {
  const sidebar = await renderSidebar()
  const panes = sidebar.querySelectorAll('[data-slot="sidebar-pane"]')
  expect(panes).toHaveLength(6)
  expect(within(sidebar).getAllByRole('separator')).toHaveLength(5)
  for (const pane of panes) {
    expect(pane.closest('[data-slot="resizable-panel"]')).not.toBeNull()
    expect(pane.querySelector('[data-slot="scroll-area"]')).not.toBeNull()
  }
  // Panes scroll on their own; nothing else in the sidebar adds a scroll area.
  expect(sidebar.querySelectorAll('.overflow-y-auto')).toHaveLength(0)
  for (const pane of panes) {
    expect(pane.querySelector('[class*="max-h-"]')).toBeNull()
    expect(pane.querySelector('.overflow-y-auto')).toBeNull()
  }
})

it('uses VS Code metrics: 22 px headers and rows, 13 px labels and 16 px icons', async () => {
  const sidebar = await renderSidebar()
  const specs = within(sidebar).getByRole('region', { name: /Specs/ })
  const header = within(specs).getByRole('button', { name: /^Specs/ })
  expect(header.closest('[data-slot="pane-header"]')).toHaveClass('h-[22px]')
  expect(header).toHaveClass('text-[11px]', 'font-bold', 'uppercase')
  const row = within(specs).getByRole('button', { name: /^login-oauth\/SPEC.md/ })
  expect(row).toHaveClass('h-[22px]', 'text-[13px]')
  expect(row.querySelector('svg')).toHaveClass('size-4')
})

it('shows row badges and actions only on hover or focus', async () => {
  const sidebar = await renderSidebar()
  const specs = within(sidebar).getByRole('region', { name: /Specs/ })
  const row = within(specs).getByRole('button', { name: /^login-oauth\/SPEC.md/ })
  const paneRow = row.closest('[data-slot="pane-row"]')!
  expect(paneRow).toHaveClass('relative')
  const hover = paneRow.querySelector('[data-slot="row-hover"]')!
  // Badges and actions overlay the end of the name instead of shrinking it.
  expect(hover).toHaveClass('absolute', 'right-0', 'bg-accent', 'hidden', 'group-hover/row:flex')
  expect(hover).toHaveClass('group-focus-within/row:flex')
  // Clicks on badges reach the row; only the action buttons take pointer events.
  expect(hover).toHaveClass('pointer-events-none', '[&_button]:pointer-events-auto')
  expect(hover.querySelector('[data-slot="status-badge"]')).not.toBeNull()
  expect(within(hover as HTMLElement).getByRole('button', { name: /^Archive/ })).toBeInTheDocument()
  const actions = specs.querySelector('[data-slot="pane-actions"]')!
  expect(actions).toHaveClass('absolute', 'invisible', 'group-hover/pane:visible')
  expect(actions).toHaveClass('group-focus-within/pane:visible')
  expect(
    within(actions as HTMLElement).getByRole('button', { name: 'New spec' }),
  ).toBeInTheDocument()
})

it('keeps an empty pane expanded with an empty message', async () => {
  const source = createMockSource({ locale: 'en' })
  const snapshot = await source.loadProject('dev')
  const artifacts = snapshot.artifacts.filter((item) => item.kind !== 'review')
  render(
    <WorkbenchPage
      source={{ ...source, loadProject: async () => ({ ...snapshot, artifacts }) }}
      initialProjectId="dev"
    />,
  )
  const sidebar = await screen.findByRole('complementary', { name: 'dev' })
  const reviews = within(sidebar).getByRole('region', { name: /Reviews/ })
  expect(within(reviews).getByRole('button', { name: /^Reviews/ })).toHaveAttribute(
    'aria-expanded',
    'true',
  )
  expect(reviews).toHaveTextContent('No reviews yet.')
})

it('collapses a pane to its header and expands it again', async () => {
  const sidebar = await renderSidebar()
  const plans = within(sidebar).getByRole('region', { name: /Plans/ })
  const header = within(plans).getByRole('button', { name: /^Plans/ })
  fireEvent.click(header)
  expect(header).toHaveAttribute('aria-expanded', 'false')
  await waitFor(() => expect(plans.querySelector('[data-slot="pane-body"]')).not.toBeVisible())
  fireEvent.click(header)
  expect(header).toHaveAttribute('aria-expanded', 'true')
})

it('animates a toggle like VS Code and keeps the body until the pane has closed', async () => {
  const sidebar = await renderSidebar()
  const group = sidebar.querySelector('[data-slot="resizable-panel-group"]') as HTMLElement
  const plans = within(sidebar).getByRole('region', { name: /Plans/ })
  const body = plans.querySelector('[data-slot="pane-body"]') as HTMLElement
  expect(group).not.toHaveAttribute('data-animated')
  fireEvent.click(within(plans).getByRole('button', { name: /^Plans/ }))
  // paneview.ts: the view is marked animated for 200 ms and the body leaves after it.
  expect(group).toHaveAttribute('data-animated')
  expect(body).toBeVisible()
  await waitFor(() => expect(body).not.toBeVisible())
  expect(group).not.toHaveAttribute('data-animated')
})

it('shows no tooltip over rows', async () => {
  const sidebar = await renderSidebar()
  const specs = within(sidebar).getByRole('region', { name: /Specs/ })
  const row = within(specs).getByRole('button', { name: /^login-oauth\/SPEC.md/ })
  expect(row).not.toHaveAttribute('data-state')
  fireEvent.focus(row)
  fireEvent.pointerMove(row)
  expect(screen.queryByRole('tooltip')).toBeNull()
})

it('keeps every header count at the same right edge, with actions to its left', async () => {
  const sidebar = await renderSidebar()
  for (const header of within(sidebar).getAllByRole('button', { expanded: true })) {
    if (!header.closest('[data-slot="pane-header"]')) continue
    expect(header.querySelector('[data-slot="pane-count"]')).toHaveClass(
      'ml-auto',
      'min-w-6',
      'text-right',
    )
  }
  const specs = within(sidebar).getByRole('region', { name: /Specs/ })
  // The count stays visible on hover; actions sit just left of it.
  expect(specs.querySelector('[data-slot="pane-actions"]')).toHaveClass('right-8')
})

it('separates panes with a border and leaves a filler so collapsed panes stack on top', async () => {
  const sidebar = await renderSidebar()
  for (const separator of within(sidebar).getAllByRole('separator'))
    expect(separator).toHaveClass('bg-border')
  expect(sidebar.querySelector('[data-slot="pane-filler"]')).not.toBeNull()
})

it('starts Skills and Memories collapsed, like VS Code secondary views', async () => {
  const sidebar = await renderSidebar()
  for (const title of ['Chats', 'Specs', 'Plans', 'Reviews'])
    expect(within(sidebar).getByRole('button', { name: new RegExp('^' + title) })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  for (const title of ['Skills', 'Memories'])
    expect(within(sidebar).getByRole('button', { name: new RegExp('^' + title) })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
})
