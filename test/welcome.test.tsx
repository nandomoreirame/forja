import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import { App } from '../src/renderer/src/app/App'
it('starts without a project and opens a selected recent project', async () => {
  render(<App locale="en" />)
  expect(await screen.findByRole('heading', { name: 'FORJA' })).toBeInTheDocument()
  expect(screen.queryAllByRole('complementary')).toHaveLength(0)
  // Without a project the footer offers a "No project" button that picks one.
  const footer = screen.getByRole('contentinfo')
  const noProject = within(footer).getByRole('button', { name: /No project/ })
  expect(footer.firstElementChild).toContainElement(noProject)
  expect(screen.queryByRole('button', { name: /New chat/ })).toBeNull()
  fireEvent.click(noProject)
  fireEvent.click(await screen.findByRole('option', { name: /nandomoreira.dev/ }))
  expect(await screen.findByRole('complementary', { name: 'nandomoreira.dev' })).toBeInTheDocument()
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  fireEvent.click(within(screen.getByRole('main')).getByRole('button', { name: /New chat/ }))
  expect(screen.getByRole('textbox')).toHaveFocus()
  expect(screen.queryByRole('combobox', { name: 'Recipient' })).toBeNull()
  expect(screen.queryByRole('heading', { name: 'FORJA' })).toBeNull()
  fireEvent.keyDown(window, { key: 'ArrowLeft', altKey: true })
  expect(screen.getByRole('heading', { name: 'FORJA' })).toBeInTheDocument()
  fireEvent.keyDown(window, { key: 'ArrowRight', altKey: true })
  expect(screen.queryByRole('heading', { name: 'FORJA' })).toBeNull()
})
it('prevents reload when opening recent projects', async () => {
  render(<App locale="en" />)
  await screen.findByRole('heading', { name: 'FORJA' })
  const event = new KeyboardEvent('keydown', { key: 'r', ctrlKey: true, cancelable: true })
  act(() => window.dispatchEvent(event))
  expect(event.defaultPrevented).toBe(true)
  expect(screen.getByRole('dialog', { name: 'Recent projects' })).toBeInTheDocument()
})

it('uses the same horizontal brand with and without a project', async () => {
  render(<App locale="en" />)
  const heading = screen.getByRole('heading', { name: 'FORJA' })
  const initialBrand = heading.parentElement!
  expect(initialBrand).toHaveTextContent('v2.0')
  expect(initialBrand.querySelector('svg')).toHaveClass('size-6')
  const markup = initialBrand.outerHTML
  fireEvent.keyDown(window, { key: 'r', ctrlKey: true })
  fireEvent.click(await screen.findByRole('option', { name: /nandomoreira.dev/ }))
  await screen.findByRole('complementary', { name: 'nandomoreira.dev' })
  expect(screen.getByRole('heading', { name: 'FORJA' }).parentElement!.outerHTML).toBe(markup)
})
