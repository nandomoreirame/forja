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

it('switches recipients from sidebar agents and focuses the composer on every activation', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  const field = await screen.findByRole('textbox', { name: /Send your prompt/ })
  const agent = screen.getByRole('button', { name: /Reviewer/ })
  for (let activation = 0; activation < 2; activation++) {
    agent.focus()
    fireEvent.click(agent)
    expect(screen.getByRole('combobox', { name: 'Recipient' })).toHaveTextContent('Reviewer')
    expect(field).toHaveFocus()
  }
})
