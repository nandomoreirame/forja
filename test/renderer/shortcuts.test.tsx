import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { useShortcuts } from '../../src/renderer/src/shared/lib/shortcuts'
import { detectLocale } from '../../src/renderer/src/shared/lib/locale'
function Harness({ run }: { run: () => void }) {
  useShortcuts({ 'ctrl+n': run, 'ctrl+shift+p': run })
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
