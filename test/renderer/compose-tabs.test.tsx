import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, expect, it } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'

beforeEach(() => localStorage.clear())

const add = () => {
  const strip = document.querySelector('[data-slot="tab-strip"]') as HTMLElement
  fireEvent.click(within(strip).getByRole('button', { name: 'New chat' }))
}
const composeTabs = () => screen.queryAllByRole('tab', { name: /New chat/ })
const field = () => screen.getByRole('textbox', { name: /Send your prompt/ })

it('opens a new conversation tab on every +, each with its own draft', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  await screen.findByRole('tab', { name: /Login with OAuth/ })
  add()
  expect(composeTabs()).toHaveLength(1)
  fireEvent.change(field(), { target: { value: 'First idea' } })
  add()
  expect(composeTabs()).toHaveLength(2)
  expect(composeTabs()[1]).toHaveAttribute('aria-selected', 'true')
  expect(field()).toHaveValue('')
  fireEvent.change(field(), { target: { value: 'Second idea' } })
  fireEvent.click(composeTabs()[0])
  expect(field()).toHaveValue('First idea')
  fireEvent.click(composeTabs()[1])
  expect(field()).toHaveValue('Second idea')
})

it('closes one conversation tab and keeps the others', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  await screen.findByRole('tab', { name: /Login with OAuth/ })
  add()
  add()
  fireEvent.click(screen.getAllByRole('button', { name: 'Close New chat' })[1])
  expect(composeTabs()).toHaveLength(1)
})

it('turns only the sent conversation tab into its feature', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  await screen.findByRole('tab', { name: /Login with OAuth/ })
  add()
  add()
  fireEvent.click(screen.getByRole('combobox', { name: 'Recipient' }))
  fireEvent.click(screen.getByRole('option', { name: 'Miner, Research' }))
  fireEvent.change(field(), { target: { value: 'Rate limit public endpoints' } })
  fireEvent.keyDown(field(), { key: 'Enter', ctrlKey: true })
  expect(screen.getByRole('tab', { name: /Rate limit public endpoints/ })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  expect(composeTabs()).toHaveLength(1)
})
