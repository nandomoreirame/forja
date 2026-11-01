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
  const features = within(sidebar).getByRole('region', { name: /Features/ })
  const rows = within(features).getAllByRole('button', { name: /·/ })
  expect(rows[0]).toHaveAccessibleName(/Catalog search/)
  fireEvent.click(screen.getByRole('button', { name: 'Close Catalog search' }))
  expect(screen.queryByRole('tab', { name: /Catalog search/ })).toBeNull()
  fireEvent.click(within(features).getByRole('button', { name: /^(?!Archive )Catalog search/ }))
  expect(screen.getByRole('tab', { name: /Catalog search/ })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  expect(within(features).getByRole('button', { name: /Finished/ })).toHaveAttribute(
    'aria-expanded',
    'false',
  )
  fireEvent.click(within(features).getByRole('button', { name: /^(?!Archive )Login with OAuth/ }))
  const history = screen.getByRole('list', { name: 'Conversation' }).textContent
  fireEvent.click(screen.getByRole('button', { name: 'Close Login with OAuth' }))
  fireEvent.click(screen.getByRole('button', { name: 'Close feature' }))
  fireEvent.click(within(features).getByRole('button', { name: /^(?!Archive )Login with OAuth/ }))
  expect(screen.getByRole('list', { name: 'Conversation' }).textContent).toBe(history)
})

it('shows finished end states and lets Tab reach every visible feature row', async () => {
  const user = userEvent.setup()
  const source = createMockSource({ locale: 'en' })
  const snapshot = await source.loadProject('dev')
  render(<WorkbenchPage source={source} initialProjectId="dev" />)
  const sidebar = await screen.findByRole('complementary', { name: 'dev' })
  const section = within(sidebar).getByRole('region', { name: /Features/ })
  const visible = snapshot.features.filter((f) => !f.archived)
  expect(
    within(section).getByRole('heading', { name: `Features ${visible.length}` }),
  ).toBeInTheDocument()
  for (const feature of visible.filter((f) => f.endState)) {
    expect(
      within(section).queryByRole('button', { name: new RegExp('^(?!Archive )' + feature.name) }),
    ).toBeNull()
  }
  fireEvent.click(within(section).getByRole('button', { name: /Finished/ }))
  const rows = within(section).getAllByRole('button', { name: /·/ })
  expect(rows).toHaveLength(visible.length)
  for (const feature of visible.filter((f) => f.endState)) {
    expect(
      within(section).getByRole('button', { name: new RegExp('^(?!Archive )' + feature.name) }),
    ).toHaveAccessibleName(/Integrated|Abandoned/)
  }
  within(section).getByRole('button', { name: 'Collapse sidebar' }).focus()
  const buttons = Array.from(
    section.querySelectorAll<HTMLElement>('button:not(:disabled), [tabindex="0"]'),
  ).filter((element) => !element.closest('[hidden]'))
  for (const target of buttons.slice(
    buttons.findIndex((button) => button.getAttribute('aria-label') === 'Collapse sidebar') + 1,
  )) {
    await user.tab()
    expect(target).toHaveFocus()
  }
  fireEvent.click(within(section).getByRole('button', { name: '+ New conversation' }))
  expect(screen.getByRole('textbox', { name: /Send your prompt/ })).toHaveFocus()
})

it('keeps only the new conversation action in an empty feature list', async () => {
  const source = createMockSource({ locale: 'en' })
  const snapshot = await source.loadProject('dev')
  render(
    <WorkbenchPage
      source={{ ...source, loadProject: async () => ({ ...snapshot, features: [] }) }}
      initialProjectId="dev"
    />,
  )
  const sidebar = await screen.findByRole('complementary', { name: 'dev' })
  const section = within(sidebar).getByRole('region', { name: /Features/ })
  expect(within(section).getByRole('heading', { name: 'Features 0' })).toBeInTheDocument()
  expect(within(section).queryByRole('button', { name: /·|Finished/ })).toBeNull()
  fireEvent.click(within(section).getByRole('button', { name: '+ New conversation' }))
  expect(screen.getByRole('combobox', { name: 'Recipient' })).toHaveTextContent('Research')
})

it('localizes feature states and finished entries in Portuguese', async () => {
  const source = createMockSource({ locale: 'pt-br' })
  const snapshot = await source.loadProject('dev')
  render(<WorkbenchPage source={source} initialProjectId="dev" />)
  const sidebar = await screen.findByRole('complementary', { name: 'dev' })
  const section = within(sidebar).getByRole('region', { name: /Features/ })
  const stalled = snapshot.features.find((feature) => feature.stalled)!
  expect(
    within(section).getByRole('button', { name: new RegExp('^(?!Arquivar )' + stalled.name) }),
  ).toHaveAccessibleName(/Sem progresso/)
  const finished = within(section).getByRole('button', { name: /Finalizadas/ })
  fireEvent.click(finished)
  const integrated = snapshot.features.find((feature) => feature.endState === 'integrated')!
  expect(
    within(section).getByRole('button', { name: new RegExp('^(?!Arquivar )' + integrated.name) }),
  ).toHaveAccessibleName(/Integrada/)
  expect(within(section).getByRole('button', { name: '+ Nova conversa' })).toBeInTheDocument()
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
  const section = within(sidebar).getByRole('region', { name: /Features/ })
  fireEvent.click(within(section).getByRole('button', { name: /Finished/ }))
  const integratedRow = within(section).getByRole('button', {
    name: new RegExp('^(?!Archive )' + finished.name),
  })
  const abandonedRow = within(section).getByRole('button', { name: /^(?!Archive )Dropped idea/ })
  expect(integratedRow).toHaveAccessibleName(/Integrated/)
  expect(abandonedRow).toHaveAccessibleName(/Abandoned/)
  expect(integratedRow.querySelector('[data-slot="status-badge"]')).toHaveAttribute(
    'data-state',
    'completed',
  )
  expect(abandonedRow.querySelector('[data-slot="status-badge"]')).toHaveAttribute(
    'data-state',
    'interrupted',
  )
})
