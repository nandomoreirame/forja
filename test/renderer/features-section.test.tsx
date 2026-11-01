import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'

it('lists every feature by attention, reopens a closed tab and drops the Agents menu', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  const sidebar = await screen.findByRole('complementary', { name: 'dev' })
  expect(within(sidebar).queryByText('Agents')).toBeNull()
  expect(within(sidebar).queryByRole('button', { name: /Edit agents/ })).toBeNull()
  const features = within(sidebar).getByRole('region', { name: /Chats/ })
  const rows = within(features).getAllByRole('button', { name: /·/ })
  expect(rows[0]).toHaveAccessibleName(/Catalog search/)
  fireEvent.click(screen.getByRole('button', { name: 'Close Catalog search' }))
  expect(screen.queryByRole('tab', { name: /Catalog search/ })).toBeNull()
  fireEvent.click(within(features).getByRole('button', { name: /^(?!Archive )Catalog search/ }))
  expect(screen.getByRole('tab', { name: /Catalog search/ })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  // Finished features sit in the same list, after the others (no Finished subgroup).
  expect(within(features).queryByRole('button', { name: /^Finished/ })).toBeNull()
  fireEvent.click(within(features).getByRole('button', { name: /^(?!Archive )Login with OAuth/ }))
  const history = screen.getByRole('list', { name: 'Conversation' }).textContent
  fireEvent.click(screen.getByRole('button', { name: 'Close Login with OAuth' }))
  fireEvent.click(within(features).getByRole('button', { name: /^(?!Archive )Login with OAuth/ }))
  expect(screen.getByRole('list', { name: 'Conversation' }).textContent).toBe(history)
})

it('shows finished end states and lets Tab reach every visible feature row', async () => {
  const user = userEvent.setup()
  const source = createMockSource({ locale: 'en' })
  const snapshot = await source.loadProject('dev')
  render(<WorkbenchPage source={source} initialProjectId="dev" />)
  const sidebar = await screen.findByRole('complementary', { name: 'dev' })
  const section = within(sidebar).getByRole('region', { name: /Chats/ })
  const visible = snapshot.features.filter((f) => !f.archived)
  expect(
    within(section).getByRole('heading', { name: `Chats ${visible.length}` }),
  ).toBeInTheDocument()
  const rows = within(section).getAllByRole('button', { name: /·/ })
  expect(rows).toHaveLength(visible.length)
  for (const feature of visible.filter((f) => f.endState)) {
    expect(
      within(section).getByRole('button', { name: new RegExp('^(?!Archive )' + feature.name) }),
    ).toHaveAccessibleName(/Integrated|Abandoned/)
  }
  const header = within(section).getByRole('button', { name: /^Chats/ })
  header.focus()
  const buttons = Array.from(
    section.querySelectorAll<HTMLElement>('button:not(:disabled), [tabindex="0"]'),
  ).filter((element) => !element.closest('[hidden]'))
  for (const target of buttons.slice(buttons.indexOf(header) + 1)) {
    await user.tab()
    expect(target).toHaveFocus()
  }
  // New chats start from the + right of the tabs, not from the sidebar.
  expect(within(section).queryByRole('button', { name: 'New chat' })).toBeNull()
})

it('leaves the empty feature list without actions and starts conversations from the empty state', async () => {
  const source = createMockSource({ locale: 'en' })
  const snapshot = await source.loadProject('dev')
  render(
    <WorkbenchPage
      source={{ ...source, loadProject: async () => ({ ...snapshot, features: [] }) }}
      initialProjectId="dev"
    />,
  )
  const sidebar = await screen.findByRole('complementary', { name: 'dev' })
  const section = within(sidebar).getByRole('region', { name: /Chats/ })
  expect(within(section).getByRole('heading', { name: 'Chats 0' })).toBeInTheDocument()
  expect(within(section).queryByRole('button', { name: /·/ })).toBeNull()
  expect(within(section).queryByRole('button', { name: 'New chat' })).toBeNull()
  fireEvent.click(within(screen.getByRole('main')).getAllByRole('button', { name: /^New chat/ })[0])
  expect(screen.queryByRole('combobox', { name: 'Recipient' })).toBeNull()
})

it('localizes feature states and finished entries in Portuguese', async () => {
  const source = createMockSource({ locale: 'pt-br' })
  const snapshot = await source.loadProject('dev')
  render(<WorkbenchPage source={source} initialProjectId="dev" />)
  const sidebar = await screen.findByRole('complementary', { name: 'dev' })
  const section = within(sidebar).getByRole('region', { name: /Chats/ })
  const stalled = snapshot.features.find((feature) => feature.stalled)!
  expect(
    within(section).getByRole('button', { name: new RegExp('^(?!Arquivar )' + stalled.name) }),
  ).toHaveAccessibleName(/Sem progresso/)
  const integrated = snapshot.features.find((feature) => feature.endState === 'integrated')!
  expect(
    within(section).getByRole('button', { name: new RegExp('^(?!Arquivar )' + integrated.name) }),
  ).toHaveAccessibleName(/Integrada/)
  expect(within(section).queryByRole('button', { name: 'Novo chat' })).toBeNull()
})

it('shows integrated features as completed and abandoned ones as interrupted', async () => {
  const source = createMockSource({ locale: 'en' })
  const snapshot = await source.loadProject('dev')
  const finished = snapshot.features.find((f) => f.endState === 'integrated')!
  const abandoned = {
    ...finished,
    id: 'abandoned',
    name: 'Dropped idea',
    endState: 'abandoned' as const,
  }
  render(
    <WorkbenchPage
      source={{
        ...source,
        loadProject: async () => ({ ...snapshot, features: [...snapshot.features, abandoned] }),
      }}
      initialProjectId="dev"
    />,
  )
  const sidebar = await screen.findByRole('complementary', { name: 'dev' })
  const section = within(sidebar).getByRole('region', { name: /Chats/ })
  const integratedRow = within(section).getByRole('button', {
    name: new RegExp('^(?!Archive )' + finished.name),
  })
  const abandonedRow = within(section).getByRole('button', { name: /^(?!Archive )Dropped idea/ })
  expect(integratedRow).toHaveAccessibleName(/Integrated/)
  expect(abandonedRow).toHaveAccessibleName(/Abandoned/)
  expect(
    integratedRow.closest('[data-slot="pane-row"]')!.querySelector('[data-slot="status-badge"]'),
  ).toHaveAttribute('data-state', 'completed')
  expect(
    abandonedRow.closest('[data-slot="pane-row"]')!.querySelector('[data-slot="status-badge"]'),
  ).toHaveAttribute('data-state', 'interrupted')
})

it('lists finished features after the active ones in the same list', async () => {
  const source = createMockSource({ locale: 'en' })
  const snapshot = await source.loadProject('dev')
  render(<WorkbenchPage source={source} initialProjectId="dev" />)
  const sidebar = await screen.findByRole('complementary', { name: 'dev' })
  const section = within(sidebar).getByRole('region', { name: /Chats/ })
  const rows = within(section).getAllByRole('button', { name: /·/ })
  const finished = snapshot.features.find((f) => f.endState && !f.archived)!
  expect(rows.at(-1)).toHaveAccessibleName(new RegExp('^' + finished.name))
  expect(within(section).queryByText(/^Finished/)).toBeNull()
})

it('keeps the tool icon and state badge visible on every feature row', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  const sidebar = await screen.findByRole('complementary', { name: 'dev' })
  const features = within(sidebar).getByRole('region', { name: /Chats/ })
  const row = within(features)
    .getByRole('button', { name: /^(?!Archive )Login with OAuth/ })
    .closest('[data-slot="pane-row"]') as HTMLElement
  const trailing = row.querySelector('[data-slot="row-trailing"]') as HTMLElement
  expect(trailing).not.toBeNull()
  expect(trailing.closest('[data-slot="row-hover"]')).toBeNull()
  expect(trailing).toHaveTextContent('Running')
  expect(trailing.querySelector('svg, img, [data-slot="tool-icon"]')).not.toBeNull()
  // The archive action stays a hover affordance.
  expect(within(trailing).queryByRole('button', { name: /^Archive/ })).toBeNull()
})
