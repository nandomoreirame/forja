import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, expect, it } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'

beforeEach(() => localStorage.clear())

const renderDev = async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  await screen.findByRole('tab', { name: /Login with OAuth/ })
}

it('shows the initial empty state without tabs once every tab is closed', async () => {
  await renderDev()
  const strip = document.querySelector('[data-slot="tab-strip"]') as HTMLElement
  for (const close of within(strip).getAllByRole('button', { name: /^Close / })) {
    fireEvent.click(close)
  }
  expect(screen.queryByRole('tablist')).toBeNull()
  expect(screen.queryByRole('textbox', { name: /Send your prompt/ })).toBeNull()
  expect(screen.getByText('Recent projects')).toBeInTheDocument()
})

it('adds a new conversation from a + right of the tabs, not from the sidebar', async () => {
  await renderDev()
  const sidebar = screen.getByRole('complementary', { name: 'dev' })
  expect(within(sidebar).queryByRole('button', { name: 'New chat' })).toBeNull()
  const strip = document.querySelector('[data-slot="tab-strip"]') as HTMLElement
  const add = within(strip).getByRole('button', { name: 'New chat' })
  expect(add.closest('[role="tablist"]')).toBeNull()
  const tabs = within(strip).getAllByRole('tab')
  expect(tabs.at(-1)!.compareDocumentPosition(add) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  fireEvent.click(add)
  expect(screen.getByRole('tab', { name: /New chat/ })).toHaveAttribute('aria-selected', 'true')
})

it('moves the project button to the footer start with the full project path', async () => {
  await renderDev()
  const header = document.querySelector('header')!
  const footer = screen.getByRole('contentinfo')
  expect(within(header).queryByRole('button', { name: /switch project/ })).toBeNull()
  const project = within(footer).getByRole('button', { name: 'dev, switch project' })
  expect(project).toHaveTextContent('~/dev')
  expect(footer.firstElementChild).toContainElement(project)
  fireEvent.click(project)
  expect(await screen.findByRole('dialog')).toBeInTheDocument()
})

it('never shows the home folder in the footer project path', async () => {
  const source = createMockSource({ locale: 'en' })
  const loadProject = source.loadProject
  source.loadProject = async (id) => {
    const snapshot = await loadProject(id)
    return {
      ...snapshot,
      project: {
        ...snapshot.project,
        path: ['', 'home', 'ana', 'dev', 'projects', 'forja'].join('/'),
      },
    }
  }
  render(<WorkbenchPage source={source} initialProjectId="dev" />)
  const footer = await screen.findByRole('contentinfo')
  const project = await within(footer).findByRole('button', { name: /switch project/ })
  expect(project).toHaveTextContent('~/dev/projects/forja')
  expect(project).not.toHaveTextContent('/home/')
})
