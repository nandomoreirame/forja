import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { History, HandoffLink } from '../../src/renderer/src/features/conversation'
import { expect, it, vi } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { createWorkbenchStore } from '../../src/renderer/src/entities/feature'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'

it('confirms closing a running feature and ends on the centered composer', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  fireEvent.click(await screen.findByRole('button', { name: 'Close Catalog search' }))
  expect(screen.getByRole('tab', { name: /Login with OAuth/ })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  fireEvent.click(screen.getByRole('button', { name: 'Close Login with OAuth' }))
  fireEvent.click(screen.getByRole('button', { name: 'Close feature' }))
  expect(screen.queryByRole('tablist')).toBeNull()
  expect(screen.getByRole('combobox', { name: 'Recipient' })).toHaveTextContent('Research')
})

it('keeps a running feature open when cancelled, including with Escape', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  fireEvent.click(await screen.findByRole('button', { name: 'Close Login with OAuth' }))
  fireEvent.click(screen.getByRole('button', { name: 'Keep open' }))
  expect(screen.getByRole('tab', { name: /Login with OAuth/ })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  fireEvent.click(screen.getByRole('button', { name: 'Close Login with OAuth' }))
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
  expect(screen.queryByRole('dialog')).toBeNull()
})

it('selects the right neighbor, otherwise the left, preserving feature history', async () => {
  const store = createWorkbenchStore(createMockSource({ locale: 'en' }))
  await store.getState().openProject('dev')
  const first = store.getState().snapshot!.features[0]
  store.setState((s) => ({
    snapshot: { ...s.snapshot!, features: [...s.snapshot!.features, { ...first, id: 'third' }] },
    openFeatureIds: ['feature-1', 'feature-2', 'third'],
  }))
  store.getState().closeFeature('feature-1')
  expect(store.getState().view).toEqual({ kind: 'conversation', featureId: 'feature-2' })
  expect(store.getState().snapshot!.features[0]).toEqual(first)
  store.getState().selectFeature('third')
  store.getState().closeFeature('third')
  expect(store.getState().view).toEqual({ kind: 'conversation', featureId: 'feature-2' })
})

it('shows localized seeded history, a handoff and the selected feature context', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  const history = await screen.findByRole('list', { name: 'Conversation' })
  expect(within(history).getByText('Tester requested a fix')).toBeVisible()
  expect(within(history).getByRole('button', { name: 'View request' })).toBeVisible()
  expect(screen.getByRole('list', { name: 'Cycle' })).toHaveTextContent('Research')
  expect(screen.getAllByText('feature/login-oauth').length).toBeGreaterThan(0)
  fireEvent.click(screen.getByRole('tab', { name: /Catalog search/ }))
  expect(screen.getAllByText('feature/catalog-search').length).toBeGreaterThan(0)
  expect(screen.queryByText('feature/login-oauth')).toBeNull()
})

it('localizes confirmation and handoffs in Portuguese', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'pt-br' })} initialProjectId="dev" />)
  expect(await screen.findByRole('button', { name: 'Ver solicitação' })).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'Fechar Login com OAuth' }))
  expect(screen.getByRole('button', { name: 'Manter aberta' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'Fechar feature' })).toBeVisible()
})

it('interrupts a streamed reply on confirmed close and preserves its partial history', async () => {
  vi.useFakeTimers()
  try {
    const store = createWorkbenchStore(createMockSource({ locale: 'en' }))
    await store.getState().openProject('dev')
    store.getState().sendMessage('feature-1', 'Hello')
    vi.advanceTimersByTime(200)
    store.getState().closeFeature('feature-1')
    const feature = store.getState().snapshot!.features[0]
    expect(feature.messages.at(-1)?.status).toBe('interrupted')
    vi.runAllTimers()
    expect(store.getState().snapshot!.features[0]).toEqual(feature)
  } finally {
    vi.useRealTimers()
  }
})

it('navigates tabs with arrow keys and reaches close buttons with Tab', async () => {
  const user = userEvent.setup()
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  const first = await screen.findByRole('tab', { name: /Login with OAuth/ })
  first.focus()
  await user.keyboard('{ArrowRight}')
  expect(screen.getByRole('tab', { name: /Catalog search/ })).toHaveFocus()
  expect(screen.getByRole('tab', { name: /Catalog search/ })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await user.tab()
  expect(screen.getByRole('button', { name: 'Close Login with OAuth' })).toHaveFocus()
})

it('only follows new messages when the reader is near the end', () => {
  const first = [{ id: '1', role: 'user' as const, text: 'Request' }]
  const { rerender } = render(<History messages={first} locale="en" stage="research" />)
  const viewport = screen.getByRole('list', { name: 'Conversation' }).parentElement!
  Object.defineProperties(viewport, {
    scrollHeight: { configurable: true, value: 1000 },
    clientHeight: { configurable: true, value: 200 },
  })
  viewport.scrollTop = 100
  fireEvent.scroll(viewport)
  rerender(
    <History
      messages={[...first, { id: '2', role: 'agent', text: 'Reply' }]}
      locale="en"
      stage="research"
    />,
  )
  expect(viewport.scrollTop).toBe(100)
  viewport.scrollTop = 790
  fireEvent.scroll(viewport)
  rerender(
    <History
      messages={[...first, { id: '2', role: 'agent', text: 'Reply continues' }]}
      locale="en"
      stage="research"
    />,
  )
  expect(viewport.scrollTop).toBe(1000)
})

it('passes the original source message id to the handoff callback', () => {
  const viewRequest = vi.fn()
  render(<HandoffLink linkTo="source-message" label="View request" onViewRequest={viewRequest} />)
  fireEvent.click(screen.getByRole('button', { name: 'View request' }))
  expect(viewRequest).toHaveBeenCalledWith('source-message')
})
