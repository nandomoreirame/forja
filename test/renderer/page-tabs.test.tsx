import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, expect, it } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'

beforeEach(() => localStorage.clear())

const renderDev = async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  await screen.findByRole('tab', { name: /Login with OAuth/ })
  return screen.getByRole('complementary', { name: 'dev' })
}

it('opens Archived as a tab and keeps the open tabs', async () => {
  const sidebar = await renderDev()
  fireEvent.click(within(sidebar).getByRole('button', { name: 'Archived' }))
  expect(screen.getByRole('tab', { name: /Archived/ })).toHaveAttribute('aria-selected', 'true')
  expect(screen.getByRole('tab', { name: /Login with OAuth/ })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Archived' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Close Archived' }))
  expect(screen.queryByRole('tab', { name: /Archived/ })).toBeNull()
  expect(screen.getByRole('tab', { name: /Login with OAuth/ })).toHaveAttribute(
    'aria-selected',
    'true',
  )
})

it('opens a new conversation as a tab beside the open features', async () => {
  await renderDev()
  const strip = document.querySelector('[data-slot="tab-strip"]') as HTMLElement
  fireEvent.click(within(strip).getByRole('button', { name: 'New chat' }))
  expect(screen.getByRole('tab', { name: /New chat/ })).toHaveAttribute('aria-selected', 'true')
  expect(screen.getByRole('tab', { name: /Login with OAuth/ })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Close New chat' }))
  expect(screen.queryByRole('tab', { name: /New chat/ })).toBeNull()
})

it('keeps a running agent going in the background when its tab closes', async () => {
  const sidebar = await renderDev()
  fireEvent.click(screen.getByRole('button', { name: 'Close Login with OAuth' }))
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(screen.queryByRole('tab', { name: /Login with OAuth/ })).toBeNull()
  expect(
    within(sidebar).getByRole('button', { name: /^Login with OAuth · .* · Running$/ }),
  ).toBeInTheDocument()
})

it('shows the running AI tool instead of the agent name in the feature row', async () => {
  const sidebar = await renderDev()
  const features = within(sidebar).getByRole('region', { name: /Features/ })
  expect(within(features).queryByText('Research')).toBeNull()
  const row = within(features).getByRole('button', { name: /^Login with OAuth/ }).parentElement!
  expect(row.querySelector('[data-slot="row-hover"] [data-slot="tool-icon"]')).not.toBeNull()
  expect(within(features).getByRole('button', { name: /^Login with OAuth/ })).toHaveAccessibleName(
    /^Login with OAuth · Miner, Research · (Claude|Codex|OpenCode|Antigravity|Grok)/,
  )
})
