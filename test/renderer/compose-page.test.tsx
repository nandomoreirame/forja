import { fireEvent, render, screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'

const lastAuthor = () =>
  within(screen.getByRole('list', { name: 'Conversation' }))
    .getAllByText(/./, { selector: '[data-slot="message-author"]' })
    .at(-1)?.textContent
it('hands the first turn to a mentioned Planner and closes back to the empty state', async () => {
  render(
    <WorkbenchPage
      source={createMockSource({ locale: 'en' })}
      initialProjectId="nandomoreira.dev"
    />,
  )
  fireEvent.click(
    within(await screen.findByRole('main')).getAllByRole('button', {
      name: /^New chat/,
    })[0],
  )
  const field = screen.getByRole('textbox', { name: /Send your prompt/ })
  expect(field).toHaveFocus()
  expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['New chat'])
  expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
  fireEvent.change(field, { target: { value: '   ' } })
  expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
  fireEvent.change(field, { target: { value: '@moldmaker Rate limit public endpoints' } })
  fireEvent.keyDown(field, { key: 'Enter', ctrlKey: true })
  expect(screen.getByRole('tab', { name: /Rate limit public endpoints/ })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  expect(lastAuthor()).toBe('Moldmaker')
  expect(screen.getByRole('list', { name: 'Conversation' })).toHaveTextContent(
    'Rate limit public endpoints',
  )
  // The new feature replaced the New chat tab.
  expect(screen.queryByRole('tab', { name: /New chat/ })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: /^Close .*Rate limit public endpoints/ }))
  // Closing the last tab returns to the initial empty state, with no tabs.
  expect(screen.queryByRole('tablist')).toBeNull()
  expect(screen.queryByRole('textbox', { name: /Send your prompt/ })).toBeNull()
})
it('opens New spec with the Miner and lets a mention take one turn', async () => {
  render(
    <WorkbenchPage
      source={createMockSource({ locale: 'en' })}
      initialProjectId="nandomoreira.dev"
    />,
  )
  fireEvent.click(await screen.findByRole('button', { name: 'New spec' }))
  const send = (text: string) => {
    fireEvent.change(screen.getByRole('textbox', { name: /Send your prompt/ }), {
      target: { value: text },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
  }
  send('Spec the auth flow')
  expect(lastAuthor()).toBe('Miner')
  send('@polisher Review auth')
  expect(lastAuthor()).toBe('Polisher')
  send('Next question')
  expect(lastAuthor()).toBe('Miner')
})

it('opens another focused conversation tab and keeps the first draft', async () => {
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
  add.focus()
  fireEvent.click(add)
  expect(screen.getByRole('textbox')).toHaveFocus()
  expect(screen.getByRole('textbox')).toHaveValue('')
  fireEvent.click(screen.getAllByRole('tab', { name: /New chat/ })[0])
  expect(screen.getByRole('textbox')).toHaveValue('Keep draft')
})
it('keeps valid tab relationships in a chat without an agent selector', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  const tab = await screen.findByRole('tab', { name: /Login with OAuth/ })
  expect(tab).toHaveAttribute('aria-selected', 'true')
  expect(screen.queryByRole('combobox', { name: 'Recipient' })).toBeNull()
  for (const item of screen.getAllByRole('tab')) {
    const target = item.getAttribute('aria-controls')
    if (target) expect(document.getElementById(target)).not.toBeNull()
  }
  for (const close of screen.getAllByRole('button', { name: /^Close / }))
    expect(close.closest('[role="tablist"]')).toBeNull()
})
