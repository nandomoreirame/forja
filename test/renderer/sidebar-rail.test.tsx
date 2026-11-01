import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, expect, it } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'

beforeEach(() => {
  localStorage.clear()
  document.cookie = 'sidebar_state=; max-age=0; path=/'
})

const renderDev = async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  return screen.findByRole('complementary', { name: 'dev' })
}

it('toggles the sidebar from the topbar, next to the brand', async () => {
  const sidebar = await renderDev()
  expect(within(sidebar).queryByRole('button', { name: 'Collapse sidebar' })).toBeNull()
  const header = screen.getByText('FORJA').closest('header')!
  const toggle = within(header).getByRole('button', { name: 'Collapse sidebar' })
  fireEvent.focus(toggle)
  expect(await screen.findByRole('tooltip')).toHaveTextContent(/Collapse sidebar.*Ctrl.*B/)
  fireEvent.click(toggle)
  expect(screen.queryByRole('complementary', { name: 'dev' })).toBeNull()
  expect(within(header).getByRole('button', { name: 'Expand sidebar' })).toBeInTheDocument()
})

it('toggles the sidebar with Ctrl+B and shows a section icon rail while collapsed', async () => {
  await renderDev()
  fireEvent.keyDown(window, { key: 'b', ctrlKey: true })
  expect(screen.queryByRole('complementary', { name: 'dev' })).toBeNull()
  const rail = screen.getByRole('navigation', { name: 'Sidebar sections' })
  const names = within(rail)
    .getAllByRole('button')
    .map((button) => button.getAttribute('aria-label'))
  expect(names).toEqual([
    'Chats',
    'Specs',
    'Plans',
    'Reviews',
    'Skills',
    'Memories',
    'Backlog',
    'Board',
    'Archived',
    'Connectors',
    'Settings',
  ])
  fireEvent.focus(within(rail).getByRole('button', { name: 'Plans' }))
  expect(await screen.findByRole('tooltip')).toHaveTextContent('Plans')
  fireEvent.keyDown(window, { key: 'b', ctrlKey: true })
  expect(await screen.findByRole('complementary', { name: 'dev' })).toBeInTheDocument()
  expect(screen.queryByRole('navigation', { name: 'Sidebar sections' })).toBeNull()
})

it('opens the sidebar on the clicked section', async () => {
  const sidebar = await renderDev()
  const plans = within(sidebar).getByRole('button', { name: /^Plans/ })
  fireEvent.click(plans)
  expect(plans).toHaveAttribute('aria-expanded', 'false')
  fireEvent.keyDown(window, { key: 'b', ctrlKey: true })
  const rail = screen.getByRole('navigation', { name: 'Sidebar sections' })
  fireEvent.click(within(rail).getByRole('button', { name: 'Plans' }))
  const reopened = await screen.findByRole('complementary', { name: 'dev' })
  expect(within(reopened).getByRole('button', { name: /^Plans/ })).toHaveAttribute(
    'aria-expanded',
    'true',
  )
})
