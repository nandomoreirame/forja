import { render, screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'

it('draws agent replies with the stamped or configured tool and a mascot', async () => {
  const source = createMockSource({ locale: 'en' })
  const settings = await source.loadSettings()
  await source.saveSettings({
    ...settings,
    agents: settings.agents.map((agent) => ({ ...agent, tool: 'grok' as const })),
  })
  render(<WorkbenchPage source={source} initialProjectId="dev" />)
  const conversation = await screen.findByRole('list', { name: 'Conversation' })
  const replies = conversation.querySelectorAll('[data-surface="reply"]')
  expect(replies.length).toBeGreaterThan(0)
  const reply = replies[0].closest('li') as HTMLElement
  expect(reply.querySelector('[data-slot="agent-mascot"]')).not.toBeNull()
  expect(within(reply).getByRole('img', { name: 'Grok' })).toBeInTheDocument()
  expect(reply.querySelector('.sr-only')).toHaveTextContent('(Grok)')
})
