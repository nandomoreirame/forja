import { render, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { createWorkbenchStore } from '../../src/renderer/src/entities/feature'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'

afterEach(() => vi.useRealTimers())

it('stamps user and agent messages with the send time', async () => {
  vi.useFakeTimers({ now: new Date(2026, 10, 1, 2, 36) })
  const store = createWorkbenchStore(createMockSource({ locale: 'en' }))
  await store.getState().openProject('dev')
  store.getState().sendMessage('feature-1', 'Check the callback')
  const messages = store.getState().snapshot!.features[0].messages.slice(-2)
  for (const message of messages)
    expect(message.createdAt).toBe(new Date(2026, 10, 1, 2, 36).toISOString())
})

it('shows seeded message dates and today times beside the author', async () => {
  vi.useFakeTimers({ now: new Date(2026, 10, 1, 2, 36), shouldAdvanceTime: true })
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  const conversation = await screen.findByRole('list', { name: 'Conversation' })
  const first = within(conversation).getAllByRole('listitem')[0]
  expect(first.querySelector('time')?.textContent).toMatch(/^Oct 31 · \d{2}:\d{2}$/)
})

it('shows the model, tokens and duration under seeded agent replies in pt-BR', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'pt-br' })} initialProjectId="dev" />)
  const conversation = await screen.findByRole('list', { name: 'Conversa' })
  const trigger = within(conversation).getAllByRole('button', { name: /Detalhes da resposta/ })[0]
  expect(trigger).toHaveTextContent(/^.+ · [\d,]+k? tokens · \d+s$/)
})

it('keeps seeded replies on the tool that answered them, matching their model', async () => {
  const { oauthConversation } = await import('../../src/renderer/src/shared/api/mock-conversation')
  for (const message of oauthConversation('en').filter((m) => m.model))
    expect(message.tool).toBe('claude')
})
