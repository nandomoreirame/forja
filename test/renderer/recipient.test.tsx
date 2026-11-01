import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'

it('lets the combobox override a mention until a new mention is typed', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  const field = await screen.findByRole('textbox', { name: /Send your prompt/ })
  const recipient = screen.getByRole('combobox', { name: 'Recipient' })
  fireEvent.change(field, { target: { value: '@tester' } })
  expect(recipient).toHaveTextContent('Tester')
  fireEvent.click(recipient)
  fireEvent.click(screen.getByRole('option', { name: 'Planner' }))
  fireEvent.change(field, { target: { value: '@tester please check' } })
  expect(recipient).toHaveTextContent('Planner')
  fireEvent.change(field, { target: { value: '@tester please check @tester' } })
  expect(recipient).toHaveTextContent('Tester')
  fireEvent.click(recipient)
  fireEvent.click(screen.getByRole('option', { name: 'Planner' }))
  fireEvent.change(field, { target: { value: '@tester please check' } })
  expect(recipient).toHaveTextContent('Planner')
})

it('switches recipients through the composer without changing the selected feature', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  const tab = await screen.findByRole('tab', { name: /Login with OAuth/ })
  for (const role of ['Reviewer', 'Tester']) {
    fireEvent.click(screen.getByRole('combobox', { name: 'Recipient' }))
    fireEvent.click(screen.getByRole('option', { name: role }))
    expect(screen.getByRole('combobox', { name: 'Recipient' })).toHaveTextContent(role)
    expect(tab).toHaveAttribute('aria-selected', 'true')
  }
})

it('returns from another view through a feature row and selects a recipient by mention', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  await screen.findByRole('tab', { name: /Login with OAuth/ })
  fireEvent.keyDown(window, { key: ',', ctrlKey: true })
  expect(screen.queryByRole('textbox', { name: /Send your prompt/ })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: /Login with OAuth ·/ }))
  const prompt = await screen.findByRole('textbox', { name: /Send your prompt/ })
  fireEvent.change(prompt, { target: { value: '@tester' } })
  expect(screen.getByRole('combobox', { name: 'Recipient' })).toHaveTextContent('Tester')
})
