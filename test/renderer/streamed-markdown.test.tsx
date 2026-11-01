import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'

afterEach(() => vi.useRealTimers())

it('appends a streamed reply chunk by chunk and renders its code block when complete', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  const prompt = await screen.findByRole('textbox', { name: /Send your prompt/ })
  fireEvent.change(prompt, { target: { value: '@implementer fix the callback' } })
  fireEvent.click(screen.getByRole('button', { name: /Send/ }))
  const list = screen.getByRole('list', { name: 'Conversation' })
  const reply = () => within(list).getAllByRole('listitem').at(-1)!
  await act(async () => {
    vi.advanceTimersByTime(250)
  })
  const partial = reply().textContent ?? ''
  expect(partial).toContain('Anvilsmith')
  await act(async () => {
    vi.advanceTimersByTime(300)
  })
  expect((reply().textContent ?? '').length).toBeGreaterThan(partial.length)
  await act(async () => {
    vi.runAllTimers()
  })
  expect(within(reply()).getByRole('button', { name: 'Copy code' })).toBeInTheDocument()
  expect(reply().querySelector('pre code')).toHaveTextContent('export function callbackError')
})
