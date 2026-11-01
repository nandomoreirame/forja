import { fireEvent, render, screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'

it('keeps past replies on their stamped tool and draws new ones with the configured tool', async () => {
  const source = createMockSource({ locale: 'en' })
  const settings = await source.loadSettings()
  await source.saveSettings({
    ...settings,
    agents: settings.agents.map((agent) => ({ ...agent, tool: 'grok' as const })),
  })
  render(<WorkbenchPage source={source} initialProjectId="dev" />)
  const conversation = await screen.findByRole('list', { name: 'Conversation' })
  const past = conversation.querySelectorAll('[data-surface="reply"]')[0].closest('li')!
  expect(past.querySelector('[data-slot="agent-mascot"]')).not.toBeNull()
  expect(within(past).getByRole('img', { name: 'Claude' })).toBeInTheDocument()
  expect(past.querySelector('.sr-only')).toHaveTextContent('(Claude)')
  fireEvent.change(screen.getByRole('textbox', { name: /Send your prompt/ }), {
    target: { value: 'Check the callback' },
  })
  fireEvent.keyDown(screen.getByRole('textbox', { name: /Send your prompt/ }), {
    key: 'Enter',
    ctrlKey: true,
  })
  const replies = conversation.querySelectorAll('[data-surface="reply"]')
  const latest = replies[replies.length - 1].closest('li')!
  expect(within(latest).getByRole('img', { name: 'Grok' })).toBeInTheDocument()
})
