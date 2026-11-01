import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'

it('renames an agent in Settings and shows the name with its role in the tooltip', async () => {
  const source = createMockSource({ locale: 'en' })
  render(<WorkbenchPage source={source} initialProjectId="dev" />)
  await screen.findByRole('tab', { name: /Login with OAuth/ })
  expect(screen.getByRole('list', { name: 'Conversation' })).toHaveTextContent('Temperer')
  fireEvent.keyDown(window, { key: ',', ctrlKey: true })
  fireEvent.click(await screen.findByRole('tab', { name: 'Agents' }))
  const name = screen.getByRole('textbox', { name: 'Name' })
  fireEvent.change(name, { target: { value: 'Scout' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
  expect(
    within(screen.getByRole('combobox', { name: 'Agent' })).getByText('Scout'),
  ).toBeInTheDocument()
  await waitFor(async () =>
    expect((await source.loadSettings()).agentNames?.research).toBe('Scout'),
  )
  expect(
    screen.getByRole('button', { name: /^Login with OAuth · Scout, Research/ }),
  ).toBeInTheDocument()
  fireEvent.click(screen.getByRole('tab', { name: /Login with OAuth/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Flow' }))
  const cycle = screen.getByRole('list', { name: 'Cycle' })
  expect(within(cycle).getByRole('listitem', { name: 'Scout, Research' })).toHaveTextContent(
    'Scout',
  )
  fireEvent.focus(within(cycle).getByText('Scout').closest('li')!.querySelector('[tabindex]')!)
  expect(await screen.findByRole('tooltip')).toHaveTextContent('Scout, Research')
})

it('saves an empty name as the default and preserves the accessible author role and tool', async () => {
  const source = createMockSource({ locale: 'en' })
  const settings = await source.loadSettings()
  await source.saveSettings({ ...settings, agentNames: { research: 'Scout' } })
  render(<WorkbenchPage source={source} initialProjectId="dev" />)
  await screen.findByRole('tab', { name: /Login with OAuth/ })
  const history = screen.getByRole('list', { name: 'Conversation' })
  const author = within(history).getByLabelText(/Temperer, Tester.*Claude/)
  expect(author).toHaveTextContent('Temperer')
  fireEvent.focus(author)
  expect(await screen.findByRole('tooltip')).toHaveTextContent('Temperer, Tester · Claude')
  fireEvent.blur(author)
  fireEvent.keyDown(window, { key: ',', ctrlKey: true })
  fireEvent.click(await screen.findByRole('tab', { name: 'Agents' }))
  fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), { target: { value: '   ' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
  await waitFor(async () =>
    expect((await source.loadSettings()).agentNames?.research).toBeUndefined(),
  )
  expect(screen.getByRole('combobox', { name: 'Agent' })).toHaveTextContent('Miner')
})

it('lists all six agents with Smith first and saves his display name', async () => {
  const source = createMockSource({ locale: 'en' })
  render(<WorkbenchPage source={source} initialProjectId="dev" />)
  await screen.findByRole('tab', { name: /Login with OAuth/ })
  fireEvent.keyDown(window, { key: ',', ctrlKey: true })
  fireEvent.click(await screen.findByRole('tab', { name: 'Agents' }))
  fireEvent.click(screen.getByRole('combobox', { name: 'Agent' }))
  expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
    'Smith',
    'Miner',
    'Moldmaker',
    'Anvilsmith',
    'Temperer',
    'Polisher',
  ])
  fireEvent.click(screen.getByRole('option', { name: 'Smith' }))
  fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), { target: { value: 'Master' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
  await waitFor(async () => expect((await source.loadSettings()).agentNames?.smith).toBe('Master'))
})
