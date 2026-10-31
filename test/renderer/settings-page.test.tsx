import { fireEvent, render, screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'

it('enables Save only after an edit and guards leaving with unsaved changes', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  const sidebar = await screen.findByRole('complementary', { name: 'dev' })
  fireEvent.click(within(sidebar).getByRole('button', { name: 'Settings' }))
  const save = await screen.findByRole('button', { name: 'Save changes' })
  expect(save).toBeDisabled()
  expect(screen.getByText(/of 3 active/)).toHaveTextContent('2 of 3 active')
  fireEvent.click(screen.getByRole('checkbox', { name: 'git' }))
  expect(save).toBeEnabled()
  expect(screen.getByText(/of 3 active/)).toHaveTextContent('3 of 3 active')
  fireEvent.click(screen.getByRole('tab', { name: /General/ }))
  expect(screen.getByRole('dialog', { name: 'Unsaved changes' })).toBeInTheDocument()
})
