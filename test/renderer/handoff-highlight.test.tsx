import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'
import { Messages } from '../../src/widgets/conversation'
import { History } from '../../src/renderer/src/features/conversation'

afterEach(() => vi.useRealTimers())

it('highlights the linked request for two seconds and returns focus to the composer', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  fireEvent.click(await screen.findByRole('button', { name: 'View request' }))
  const highlighted = document.querySelectorAll('[data-highlighted="true"]')
  expect(highlighted).toHaveLength(1)
  expect(highlighted[0]).toHaveTextContent('Add OAuth login with clear error feedback.')
  expect(screen.getByRole('textbox', { name: /Send your prompt/ })).toHaveFocus()
  await act(async () => {
    vi.advanceTimersByTime(2100)
  })
  expect(document.querySelectorAll('[data-highlighted="true"]')).toHaveLength(0)
})

it('marks only the highlighted message and exposes message ids', () => {
  render(
    <Messages
      items={[
        { id: 'a', author: 'You', role: 'user', text: 'One', highlighted: true },
        { id: 'b', author: 'Research', role: 'agent', text: 'Two' },
      ]}
    />,
  )
  const items = screen.getAllByRole('listitem')
  expect(items[0]).toHaveAttribute('data-highlighted', 'true')
  expect(items[0]).toHaveAttribute('data-message-id', 'a')
  expect(items[1]).not.toHaveAttribute('data-highlighted')
})

it('ignores a View request whose source message is missing without logging errors', () => {
  const error = vi.spyOn(console, 'error')
  const onViewRequest = vi.fn()
  render(
    <History
      locale="en"
      stage="research"
      onViewRequest={onViewRequest}
      messages={[
        {
          id: 'e',
          role: 'event',
          author: 'tester',
          text: 'Tester requested a fix',
          linkTo: 'gone',
        },
      ]}
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: 'View request' }))
  expect(document.querySelectorAll('[data-highlighted="true"]')).toHaveLength(0)
  expect(onViewRequest).not.toHaveBeenCalled()
  expect(error).not.toHaveBeenCalled()
})

it('scrolls the source into the center, instantly under reduced motion, and restarts the timer', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  const scroll = vi.fn()
  Element.prototype.scrollIntoView = scroll
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: true, addEventListener() {}, removeEventListener() {} })),
  )
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  const button = await screen.findByRole('button', { name: 'View request' })
  fireEvent.click(button)
  expect(scroll).toHaveBeenCalledWith({ block: 'center', behavior: 'auto' })
  await act(async () => {
    vi.advanceTimersByTime(1500)
  })
  fireEvent.click(button)
  await act(async () => {
    vi.advanceTimersByTime(1500)
  })
  expect(document.querySelectorAll('[data-highlighted="true"]')).toHaveLength(1)
  vi.unstubAllGlobals()
})
