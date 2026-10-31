import { fireEvent, render, screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'

it('collapses to the toolbar, reopens the exact tab and adds a manual shell', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  fireEvent.click(await screen.findByRole('button', { name: 'Toggle terminals' }))
  fireEvent.click(screen.getByRole('tab', { name: /Implementer · tests/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Collapse terminals' }))
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
  fireEvent.click(screen.getByRole('button', { name: 'Collapse terminals' }))
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
