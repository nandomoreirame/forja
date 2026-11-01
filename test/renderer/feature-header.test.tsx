import { fireEvent, render, screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'

it('keeps the feature header lean: no mode badge, no cycle label and no history arrows', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  const header = await screen.findByRole('region', { name: 'Login with OAuth' })
  fireEvent.click(within(header).getByRole('button', { name: 'Flow' }))
  const cycle = screen.getByRole('list', { name: 'Cycle' })
  expect(within(header).queryByText('Guided')).toBeNull()
  expect(within(header).queryByText(/^Cycle:/)).toBeNull()
  expect(cycle).toHaveAccessibleName('Cycle')
  expect(screen.queryByRole('button', { name: /^Back$/ })).toBeNull()
  expect(screen.queryByRole('button', { name: /^Forward$/ })).toBeNull()
  const summary = within(header).getByRole('button', { name: 'Summary' })
  expect(summary.parentElement).toHaveClass('items-center')
})
