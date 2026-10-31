import { fireEvent, render, screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'
it('renders the shell and toggles both sidebars and terminal', async () => {
  render(
    <WorkbenchPage
      source={createMockSource({ locale: 'en' })}
      initialProjectId="nandomoreira.dev"
    />,
  )
  expect(await screen.findByRole('complementary', { name: 'nandomoreira.dev' })).toHaveTextContent(
    'Agents5',
  )
  expect(screen.getByRole('complementary', { name: 'Project' })).toHaveTextContent('main')
  expect(screen.getByRole('banner')).toBeInTheDocument()
  expect(screen.getByRole('main')).toBeInTheDocument()
  expect(screen.getByRole('contentinfo')).toHaveTextContent('~/dev/projects/nandomoreira.dev')
  fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }))
  expect(screen.queryByRole('complementary', { name: 'nandomoreira.dev' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Expand sidebar' }))
  expect(screen.getByRole('complementary', { name: 'nandomoreira.dev' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Collapse project panel' }))
  expect(screen.queryByRole('complementary', { name: 'Project' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Expand project panel' }))
  fireEvent.click(screen.getByRole('button', { name: 'Toggle terminals' }))
  expect(screen.getByRole('button', { name: 'Toggle terminals' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})
it('renders the localized shell', async () => {
  render(
    <WorkbenchPage
      source={createMockSource({ locale: 'pt-br' })}
      initialProjectId="nandomoreira.dev"
    />,
  )
  expect(await screen.findByRole('complementary', { name: 'nandomoreira.dev' })).toHaveTextContent(
    'Agentes5',
  )
  expect(screen.getByRole('complementary', { name: 'Projeto' })).toBeInTheDocument()
})

it('shows the project switcher in the topbar next to the brand', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  const sidebar = await screen.findByRole('complementary', { name: 'dev' })
  const header = screen.getByText('FORJA').closest('header')!
  const switcher = within(header).getByRole('button', { name: 'dev, switch project' })
  expect(within(header).queryByRole('button', { name: 'Project actions' })).toBeNull()
  fireEvent.focus(switcher)
  expect(await screen.findByRole('tooltip')).toHaveTextContent('Project actions')
  expect(within(sidebar).queryByRole('button', { name: 'dev, switch project' })).toBeNull()
  expect(within(sidebar).getByRole('button', { name: 'Collapse sidebar' })).toBeInTheDocument()
  fireEvent.click(switcher)
  expect(screen.getByRole('dialog', { name: 'Recent projects' })).toBeInTheDocument()
})
