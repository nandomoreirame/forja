import { fireEvent, render, screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'
import { createWorkbenchStore } from '../../src/renderer/src/entities/feature'
import { mentionedAgent } from '../../src/renderer/src/features/composer/recipient'

const send = (text: string) => {
  const field = screen.getByRole('textbox', { name: /Send your prompt/ })
  fireEvent.change(field, { target: { value: text } })
  fireEvent.keyDown(field, { key: 'Enter', ctrlKey: true })
}
const lastAgentAuthor = () => {
  const authors = within(screen.getByRole('list', { name: 'Conversation' }))
    .getAllByText(/./, { selector: '[data-slot="message-author"]' })
    .map((node) => node.textContent)
  return authors.at(-1)
}

it('has no agent selector in the composer', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  await screen.findByRole('tab', { name: /Login with OAuth/ })
  expect(screen.queryByRole('combobox', { name: 'Recipient' })).toBeNull()
  fireEvent.click(
    within(document.querySelector('[data-slot="tab-strip"]') as HTMLElement).getByRole('button', {
      name: 'New chat',
    }),
  )
  expect(screen.queryByRole('combobox', { name: 'Recipient' })).toBeNull()
})

it('answers with the agent of the chat phase unless the prompt mentions another one', async () => {
  const store = createWorkbenchStore(createMockSource({ locale: 'en' }))
  await store.getState().openProject('dev')
  const id = store.getState().snapshot!.features[0].id
  const author = () => store.getState().snapshot!.features[0].messages.at(-1)?.author
  store.getState().sendMessage(id, 'What is missing?')
  expect(author()).toBe('research')
  store.getState().sendMessage(id, '@polidor check this', 'reviewer')
  expect(author()).toBe('reviewer')
  // A mention only applies to its own message.
  store.getState().sendMessage(id, 'And now?')
  expect(author()).toBe('research')
})

it('starts a New chat with the Ferreiro or the mentioned agent', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  await screen.findByRole('tab', { name: /Login with OAuth/ })
  const newChat = () =>
    fireEvent.click(
      within(document.querySelector('[data-slot="tab-strip"]') as HTMLElement).getByRole('button', {
        name: 'New chat',
      }),
    )
  newChat()
  send('Plan the export idea')
  expect(lastAgentAuthor()).toBe('Smith')
  newChat()
  send('@miner scope the export idea')
  expect(lastAgentAuthor()).toBe('Miner')
})

it('recognizes agents by id, role, and forge name in both languages', () => {
  expect(mentionedAgent('ask @smith')).toBe('smith')
  expect(mentionedAgent('ask @ferreiro')).toBe('smith')
  expect(mentionedAgent('ask @Minerador now')).toBe('research')
  expect(mentionedAgent('@moldmaker')).toBe('planner')
  expect(mentionedAgent('@revisor')).toBe('reviewer')
  expect(mentionedAgent('@Scout please', { research: 'Scout' })).toBe('research')
  expect(mentionedAgent('no mention here')).toBeNull()
  expect(mentionedAgent('`@polidor` in code')).toBeNull()
})
