import { fireEvent, render, screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'

it('collapses to the toolbar, reopens the exact tab and adds a manual shell', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  fireEvent.click(await screen.findByRole('button', { name: 'Toggle terminals' }))
  fireEvent.click(screen.getByRole('tab', { name: /Implementer · tests/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Close panel' }))
  fireEvent.click(screen.getByRole('button', { name: /tests/ }))
  expect(screen.getByRole('tab', { name: /Implementer · tests/ })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  fireEvent.click(screen.getByRole('button', { name: 'New terminal' }))
  expect(screen.getByRole('tab', { name: /zsh/ })).toHaveAttribute('aria-selected', 'true')
})

it('keeps running state when collapsed, stops without losing output and follows the feature', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  fireEvent.click(await screen.findByRole('button', { name: 'Toggle terminals' }))
  const panel = screen.getByRole('region', { name: 'Terminals' })
  expect(within(panel).getByRole('tab', { name: /Implementer · dev/ })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  expect(panel).toHaveTextContent('npm run dev')
  fireEvent.click(screen.getByRole('button', { name: 'Close panel' }))
  const toolbar = screen.getByRole('toolbar', { name: 'Background terminals' })
  expect(within(toolbar).getByRole('button', { name: /Implementer · dev/ })).toHaveTextContent(
    'Running',
  )
  fireEvent.click(within(toolbar).getByRole('button', { name: /Implementer · dev/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Stop process' }))
  const reopened = screen.getByRole('region', { name: 'Terminals' })
  expect(within(reopened).getByRole('tab', { name: /Implementer · dev/ })).toHaveTextContent(
    'Stopped',
  )
  expect(reopened).toHaveTextContent('npm run dev')
  expect(screen.queryByRole('button', { name: 'Stop process' })).toBeNull()
  fireEvent.click(screen.getByRole('tab', { name: /Catalog search/ }))
  expect(screen.getByRole('region', { name: 'Terminals' })).toHaveTextContent(
    'No terminals for this feature.',
  )
})

it('keeps the terminal toggle and collapsed terminals in the status bar instead of the topbar', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  const footer = (await screen.findByText('~/dev', { selector: 'footer span' })).closest('footer')!
  expect(within(footer).getByRole('button', { name: 'Toggle terminals' })).toBeInTheDocument()
  expect(screen.getAllByRole('button', { name: 'Toggle terminals' })).toHaveLength(1)
  expect(footer).not.toHaveTextContent('UTF-8')
  const toolbar = within(footer).getByRole('toolbar', { name: 'Background terminals' })
  fireEvent.click(within(toolbar).getByRole('button', { name: /Implementer · tests/ }))
  expect(screen.getByRole('tab', { name: /Implementer · tests/ })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  expect(within(footer).getByRole('toolbar')).toBeInTheDocument()
})

it('keeps footer terminals while the panel is open and closes only idle or finished terminals', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  fireEvent.click(await screen.findByRole('button', { name: 'Toggle terminals' }))
  const footer = screen.getByText('~/dev', { selector: 'footer span' }).closest('footer')!
  const toolbar = within(footer).getByRole('toolbar', { name: 'Background terminals' })
  fireEvent.click(within(toolbar).getByRole('button', { name: /Implementer · tests/ }))
  expect(screen.getByRole('tab', { name: /Implementer · tests/ })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  expect(screen.queryByRole('button', { name: 'Close Implementer · dev' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'New terminal' }))
  fireEvent.click(screen.getByRole('button', { name: 'Close zsh' }))
  expect(screen.queryByRole('tab', { name: /zsh/ })).toBeNull()
  expect(screen.getByRole('tab', { name: /Implementer · tests/ })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  fireEvent.click(screen.getByRole('button', { name: 'Close Implementer · tests' }))
  expect(screen.queryByRole('tab', { name: /Implementer · tests/ })).toBeNull()
  expect(within(toolbar).queryByRole('button', { name: /Implementer · tests/ })).toBeNull()
})

it('maximizes the terminal panel over the conversation and closes it with the close icon', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  fireEvent.click(await screen.findByRole('button', { name: 'Toggle terminals' }))
  fireEvent.click(screen.getByRole('button', { name: 'Maximize panel' }))
  expect(screen.queryByRole('list', { name: 'Conversation' })).toBeNull()
  expect(screen.getByRole('region', { name: 'Terminals' })).toHaveAttribute(
    'data-maximized',
    'true',
  )
  fireEvent.click(screen.getByRole('button', { name: 'Restore panel' }))
  expect(screen.getByRole('list', { name: 'Conversation' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Close panel' }))
  expect(screen.queryByRole('region', { name: 'Terminals' })).toBeNull()
})

it('adds a mock shell to a project without features in the browser build', async () => {
  render(
    <WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="contrateum.dev" />,
  )
  fireEvent.click(await screen.findByRole('button', { name: 'Toggle terminals' }))
  fireEvent.click(screen.getByRole('button', { name: 'New terminal' }))
  expect(screen.getByRole('tab', { name: /zsh/ })).toHaveAttribute('aria-selected', 'true')
  expect(screen.getByRole('region', { name: 'Terminals' })).toHaveTextContent(
    '~/dev/projects/contrateum.dev $',
  )
})
