import { fireEvent, render, screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'

it('moves the agent cycle into a Flow bar beside Summary, centered and closable', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  const header = await screen.findByRole('region', { name: 'Login with OAuth' })
  expect(screen.queryByRole('list', { name: 'Cycle' })).toBeNull()
  const toggle = within(header).getByRole('button', { name: 'Flow' })
  expect(toggle.previousElementSibling).toBe(
    within(header).getByRole('button', { name: 'Summary' }),
  )
  expect(toggle).toHaveAttribute('aria-expanded', 'false')
  fireEvent.click(toggle)
  expect(toggle).toHaveAttribute('aria-expanded', 'true')
  const panel = screen.getByRole('region', { name: 'Flow' })
  const cycle = within(panel).getByRole('list', { name: 'Cycle' })
  expect(cycle).toHaveClass('justify-center')
  expect(within(cycle).getAllByRole('listitem')).toHaveLength(5)
  fireEvent.click(within(panel).getByRole('button', { name: 'Close flow' }))
  expect(screen.queryByRole('region', { name: 'Flow' })).toBeNull()
  expect(toggle).toHaveAttribute('aria-expanded', 'false')
})

it('keeps Flow and Summary independent and localized', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'pt-br' })} initialProjectId="dev" />)
  const header = await screen.findByRole('region', { name: /Login/ })
  fireEvent.click(within(header).getByRole('button', { name: 'Fluxo' }))
  fireEvent.click(within(header).getByRole('button', { name: 'Resumo' }))
  expect(screen.getByRole('region', { name: 'Fluxo' })).toBeInTheDocument()
  expect(screen.getByRole('region', { name: 'Resumo da conversa' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Fechar fluxo' })).toBeInTheDocument()
})
