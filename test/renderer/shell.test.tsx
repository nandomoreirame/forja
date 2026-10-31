import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'
it('renders the shell and toggles both sidebars and terminal', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="acme-api" />)
  expect(await screen.findByRole('complementary', { name: 'acme-api' })).toHaveTextContent(
    'Agents5',
  )
  expect(screen.getByRole('complementary', { name: 'Project' })).toHaveTextContent('main')
  expect(screen.getByRole('banner')).toBeInTheDocument()
  expect(screen.getByRole('main')).toBeInTheDocument()
  expect(screen.getByRole('contentinfo')).toHaveTextContent('~/projects/acme-api')
  fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }))
  expect(screen.queryByRole('complementary', { name: 'acme-api' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Expand sidebar' }))
  expect(screen.getByRole('complementary', { name: 'acme-api' })).toBeInTheDocument()
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
    <WorkbenchPage source={createMockSource({ locale: 'pt-br' })} initialProjectId="acme-api" />,
  )
  expect(await screen.findByRole('complementary', { name: 'acme-api' })).toHaveTextContent(
    'Agentes5',
  )
  expect(screen.getByRole('complementary', { name: 'Projeto' })).toBeInTheDocument()
})
