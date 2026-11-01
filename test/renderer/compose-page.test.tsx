import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'
it('selects Planner in the composer, sends a feature and closes back to Research', async () => {
  render(
    <WorkbenchPage
      source={createMockSource({ locale: 'en' })}
      initialProjectId="nandomoreira.dev"
    />,
  )
  fireEvent.click(
    within(await screen.findByRole('complementary', { name: 'nandomoreira.dev' })).getByRole(
      'button',
      { name: 'New conversation' },
    ),
  )
  const field = screen.getByRole('textbox', { name: /Send your prompt/ })
  expect(field).toHaveFocus()
  fireEvent.click(screen.getByRole('combobox', { name: 'Recipient' }))
  fireEvent.click(screen.getByRole('option', { name: 'Planner' }))
  expect(screen.getByRole('combobox', { name: 'Recipient' })).toHaveTextContent('Planner')
  expect(screen.queryByRole('tablist')).toBeNull()
  expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
  fireEvent.change(field, { target: { value: '   ' } })
  expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
  fireEvent.change(field, { target: { value: 'Rate limit public endpoints' } })
  fireEvent.keyDown(field, { key: 'Enter', ctrlKey: true })
  expect(screen.getByRole('tab', { name: /Rate limit public endpoints/ })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  expect(screen.getByRole('list', { name: 'Conversation' })).toHaveTextContent(
    'Rate limit public endpoints',
  )
  fireEvent.click(screen.getByRole('button', { name: 'Close Rate limit public endpoints' }))
  fireEvent.click(screen.getByRole('button', { name: 'Close feature' }))
  await waitFor(() =>
    expect(screen.getByRole('textbox', { name: /Send your prompt/ })).toHaveFocus(),
  )
  expect(screen.getByRole('combobox', { name: 'Recipient' })).toHaveTextContent('Research')
  expect(screen.queryByRole('tablist')).toBeNull()
})
it('preselects Research from New spec and permits changing the recipient', async () => {
  render(
    <WorkbenchPage
      source={createMockSource({ locale: 'en' })}
      initialProjectId="nandomoreira.dev"
    />,
  )
  fireEvent.click(
    within(await screen.findByRole('complementary', { name: 'nandomoreira.dev' })).getByRole(
      'button',
      { name: 'New conversation' },
    ),
  )
  fireEvent.click(screen.getByRole('combobox', { name: 'Recipient' }))
  fireEvent.click(screen.getByRole('option', { name: 'Tester' }))
  expect(screen.getByRole('combobox', { name: 'Recipient' })).toHaveTextContent('Tester')
  fireEvent.click(screen.getByRole('button', { name: 'New spec' }))
  expect(screen.getByRole('combobox', { name: 'Recipient' })).toHaveTextContent('Research')
  fireEvent.click(screen.getByRole('combobox', { name: 'Recipient' }))
  fireEvent.click(screen.getByRole('option', { name: 'Reviewer' }))
  fireEvent.change(screen.getByRole('textbox', { name: /Send your prompt/ }), {
    target: { value: 'Review auth' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Send' }))
  expect(screen.getByRole('combobox', { name: 'Recipient' })).toHaveTextContent('Reviewer')
})

it('reactivates the requested agent and focus without losing the draft', async () => {
  render(
    <WorkbenchPage
      source={createMockSource({ locale: 'en' })}
      initialProjectId="nandomoreira.dev"
    />,
  )
  const add = await screen.findByRole('button', { name: 'New spec' })
  fireEvent.click(add)
  const field = screen.getByRole('textbox')
  fireEvent.change(field, { target: { value: 'Keep draft' } })
  fireEvent.click(screen.getByRole('combobox', { name: 'Recipient' }))
  fireEvent.click(screen.getByRole('option', { name: 'Reviewer' }))
  add.focus()
  fireEvent.click(add)
  expect(screen.getByRole('combobox', { name: 'Recipient' })).toHaveTextContent('Research')
  expect(screen.getByRole('textbox')).toHaveFocus()
  expect(screen.getByRole('textbox')).toHaveValue('Keep draft')
})
it('changes the agent within the current feature and keeps valid tab relationships', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  const tab = await screen.findByRole('tab', { name: /Login with OAuth/ })
  fireEvent.click(screen.getByRole('combobox', { name: 'Recipient' }))
  fireEvent.click(screen.getByRole('option', { name: 'Planner' }))
  expect(tab).toHaveAttribute('aria-selected', 'true')
  expect(screen.getByRole('combobox', { name: 'Recipient' })).toHaveTextContent('Planner')
  for (const item of screen.getAllByRole('tab')) {
    const target = item.getAttribute('aria-controls')
    if (target) expect(document.getElementById(target)).not.toBeNull()
  }
  for (const close of screen.getAllByRole('button', { name: /^Close / }))
    expect(close.closest('[role="tablist"]')).toBeNull()
})
