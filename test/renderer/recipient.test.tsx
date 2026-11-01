import { fireEvent, render, screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'

const lastAuthor = () =>
  within(screen.getByRole('list', { name: 'Conversation' }))
    .getAllByText(/./, { selector: '[data-slot="message-author"]' })
    .at(-1)?.textContent

const send = (field: HTMLElement, text: string) => {
  fireEvent.change(field, { target: { value: text } })
  fireEvent.keyDown(field, { key: 'Enter', ctrlKey: true })
}

it('hands one turn to the last agent mentioned and ignores mentions in code', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  const field = await screen.findByRole('textbox', { name: /Send your prompt/ })
  send(field, '@tester please check @moldmaker')
  expect(lastAuthor()).toBe('Moldmaker')
  send(field, 'Run `@tester` later')
  expect(lastAuthor()).toBe('Miner')
})

it('keeps the selected chat while mentions change the answering agent', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  const tab = await screen.findByRole('tab', { name: /Login with OAuth/ })
  const field = screen.getByRole('textbox', { name: /Send your prompt/ })
  for (const [mention, author] of [
    ['@polisher', 'Polisher'],
    ['@temperador', 'Temperer'],
  ]) {
    send(field, `${mention} take a look`)
    expect(lastAuthor()).toBe(author)
    expect(tab).toHaveAttribute('aria-selected', 'true')
  }
})

it('returns from another view through a chat row and mentions an agent', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  await screen.findByRole('tab', { name: /Login with OAuth/ })
  fireEvent.keyDown(window, { key: ',', ctrlKey: true })
  expect(screen.queryByRole('textbox', { name: /Send your prompt/ })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: /^Login with OAuth ·/ }))
  const prompt = await screen.findByRole('textbox', { name: /Send your prompt/ })
  send(prompt, '@tester')
  expect(lastAuthor()).toBe('Temperer')
})
