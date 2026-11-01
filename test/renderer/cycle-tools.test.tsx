import { fireEvent, render, screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'
import { toolNames } from '../../src/shared/ui'

it('shows each agent tool in the cycle and the current stage tool on the tab', async () => {
  const source = createMockSource({ locale: 'en' })
  const settings = await source.loadSettings()
  const agents = settings.agents.map((agent) =>
    agent.id === 'research' ? { ...agent, tool: 'codex' as const } : agent,
  )
  await source.saveSettings({ ...settings, agents })
  render(<WorkbenchPage source={source} initialProjectId="dev" />)
  const cycle = await screen.findByRole('list', { name: 'Cycle' })
  for (const [index, stage] of within(cycle).getAllByRole('listitem').entries()) {
    expect(
      within(stage).getByRole('img', { name: toolNames[agents[index].tool] }),
    ).toBeInTheDocument()
  }
  const research = within(cycle).getByText('Research').closest('li')!
  expect(research).toHaveAttribute('aria-current', 'step')
  expect(research).toHaveClass('text-primary')
  const icon = within(research).getByRole('img', { name: 'Codex' })
  expect(icon.closest('[tabindex="0"]')).toHaveClass('focus-visible:outline-ring')
  fireEvent.focus(icon)
  expect(await screen.findByRole('tooltip')).toHaveTextContent('Research · Codex')
  expect(screen.getByRole('tooltip').closest('[data-slot="tooltip-content"]')).toHaveClass(
    'bg-popover',
  )
  const tab = screen.getByRole('tab', { name: /Login with OAuth/ })
  expect(within(tab).getByRole('img', { name: 'Codex' })).toBeInTheDocument()
})
