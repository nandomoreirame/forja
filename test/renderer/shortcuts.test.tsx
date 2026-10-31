import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { useShortcuts } from '../../src/renderer/src/shared/lib/shortcuts'
import { detectLocale } from '../../src/renderer/src/shared/lib/locale'
function Harness({ run }: { run: () => void }) {
  useShortcuts({ 'ctrl+n': run, 'ctrl+r': run, 'ctrl+shift+p': run })
  return <input aria-label="Prompt" />
}
it('detects the supported system languages', () => {
  expect(detectLocale('pt-BR')).toBe('pt-br')
  expect(detectLocale('pt-PT')).toBe('pt-br')
  expect(detectLocale('en-US')).toBe('en')
  expect(detectLocale('de-DE')).toBe('en')
})
it('ignores editable targets except the palette shortcut and removes its listener', () => {
  const run = vi.fn()
  const { unmount } = render(<Harness run={run} />)
  const input = screen.getByRole('textbox')
  fireEvent.keyDown(input, { key: 'n', ctrlKey: true })
  expect(run).not.toHaveBeenCalled()
  fireEvent.keyDown(input, { key: 'P', ctrlKey: true, shiftKey: true })
  expect(run).toHaveBeenCalledTimes(1)
  fireEvent.keyDown(window, { key: 'n', ctrlKey: true })
  expect(run).toHaveBeenCalledTimes(2)
  fireEvent.keyDown(window, { key: 'n', ctrlKey: true, repeat: true })
  fireEvent.keyDown(window, { key: 'n', ctrlKey: true, shiftKey: true })
  expect(run).toHaveBeenCalledTimes(2)
  unmount()
  fireEvent.keyDown(window, { key: 'n', ctrlKey: true })
  expect(run).toHaveBeenCalledTimes(2)
})

it('keeps one keyboard subscription and uses the latest actions after rerender', () => {
  const add = vi.spyOn(window, 'addEventListener')
  const first = vi.fn(),
    second = vi.fn()
  const { rerender } = render(<Harness run={first} />)
  rerender(<Harness run={second} />)
  expect(add.mock.calls.filter(([name]) => name === 'keydown')).toHaveLength(1)
  fireEvent.keyDown(window, { key: 'n', ctrlKey: true })
  expect(second).toHaveBeenCalledOnce()
  expect(first).not.toHaveBeenCalled()
  add.mockRestore()
})
it('opens recent history inside a prompt without reloading', () => {
  const run = vi.fn()
  render(<Harness run={run} />)
  const event = new KeyboardEvent('keydown', {
    key: 'r',
    ctrlKey: true,
    cancelable: true,
    bubbles: true,
  })
  screen.getByRole('textbox').dispatchEvent(event)
  expect(event.defaultPrevented).toBe(true)
  expect(run).toHaveBeenCalledOnce()
})
