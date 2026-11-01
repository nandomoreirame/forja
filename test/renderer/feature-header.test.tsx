import { render, screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'

it('keeps the feature header lean: no mode badge, no cycle label and no history arrows', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  const cycle = await screen.findByRole('list', { name: 'Cycle' })
  const header = screen.getByRole('region', { name: 'Login with OAuth' })
  expect(within(header).queryByText('Guided')).toBeNull()
  expect(within(header).queryByText(/^Cycle:/)).toBeNull()
  expect(cycle).toHaveAccessibleName('Cycle')
  expect(screen.queryByRole('button', { name: /^Back$/ })).toBeNull()
  expect(screen.queryByRole('button', { name: /^Forward$/ })).toBeNull()
  const summary = within(header).getByRole('button', { name: 'Summary' })
  expect(summary.parentElement).toHaveClass('items-center')
})
