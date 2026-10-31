import { act, fireEvent, render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { App } from '../src/renderer/src/app/App'
it('opens project home and routes actions and keyboard history', async () => {
  render(<App locale="en" />)
  expect(await screen.findByRole('heading', { name: 'FORJA' })).toBeInTheDocument()
  expect(screen.queryByText('New spec')).toBeNull()
  const reload = new KeyboardEvent('keydown', { key: 'r', ctrlKey: true, cancelable: true })
  act(() => window.dispatchEvent(reload))
  expect(reload.defaultPrevented).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: /New conversation/ }))
  expect(screen.queryByRole('heading', { name: 'FORJA' })).toBeNull()
  fireEvent.keyDown(window, { key: 'ArrowLeft', altKey: true })
  expect(screen.getByRole('heading', { name: 'FORJA' })).toBeInTheDocument()
  fireEvent.keyDown(window, { key: 'ArrowRight', altKey: true })
  expect(screen.queryByRole('heading', { name: 'FORJA' })).toBeNull()
})
