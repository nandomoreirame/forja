import { fireEvent, render, screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'

it('shows the Ferreiro as the author of a summary', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  await screen.findByRole('tab', { name: /Login with OAuth/ })
  fireEvent.click(screen.getByRole('button', { name: 'Summary' }))
  expect(await screen.findByRole('region', { name: /summary/i })).toHaveTextContent(/by Smith/)
})

it('uses the renamed Ferreiro as the summary author', async () => {
  const source = createMockSource({ locale: 'en' })
  await source.saveSettings({ ...(await source.loadSettings()), agentNames: { smith: 'Master' } })
  render(<WorkbenchPage source={source} initialProjectId="dev" />)
  await screen.findByRole('tab', { name: /Login with OAuth/ })
  fireEvent.click(screen.getByRole('button', { name: 'Summary' }))
  const panel = await screen.findByRole('region', { name: /summary/i })
  expect(panel).toHaveTextContent('by Master')
  expect(panel).not.toHaveTextContent('by Smith')
})

it('keeps the generated summary date and close action', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  await screen.findByRole('tab', { name: /Login with OAuth/ })
  fireEvent.click(screen.getByRole('button', { name: 'Summary' }))
  const panel = await screen.findByRole('region', { name: /summary/i })
  fireEvent.click(within(panel).getByRole('button', { name: 'Summarize now' }))
  expect(await within(panel).findByText(/^updated /)).toHaveTextContent(/updated \d/)
  expect(panel).toHaveTextContent('by Smith')
  fireEvent.click(within(panel).getByRole('button', { name: 'Close summary' }))
  expect(screen.queryByRole('region', { name: /summary/i })).not.toBeInTheDocument()
})
