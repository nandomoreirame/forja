import { fireEvent, render, screen, within } from '@testing-library/react'
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
  expect(sidebar.querySelector('[class*="max-h-"]')).toBeNull()
  expect(sidebar.querySelector('.overflow-y-auto')).toBeNull()
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
  const hover = row.closest('[data-slot="pane-row"]')!.querySelector('[data-slot="row-hover"]')!
  expect(hover).toHaveClass('hidden', 'group-hover/row:flex', 'group-focus-within/row:flex')
  expect(hover.querySelector('[data-slot="status-badge"]')).not.toBeNull()
  expect(within(hover as HTMLElement).getByRole('button', { name: /^Archive/ })).toBeInTheDocument()
  const actions = specs.querySelector('[data-slot="pane-actions"]')!
  expect(actions).toHaveClass('opacity-0', 'group-hover/pane:opacity-100')
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
  expect(plans.querySelector('[data-slot="pane-body"]')).not.toBeVisible()
  fireEvent.click(header)
  expect(header).toHaveAttribute('aria-expanded', 'true')
})
