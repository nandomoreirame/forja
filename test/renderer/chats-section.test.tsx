import { fireEvent, render, screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'

const newChat = () =>
  fireEvent.click(
    within(document.querySelector('[data-slot="tab-strip"]') as HTMLElement).getByRole('button', {
      name: 'New chat',
    }),
  )

it('lists features and Ferreiro chats under Chats', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  const sidebar = await screen.findByRole('complementary', { name: 'dev' })
  const chats = within(sidebar).getByRole('region', { name: /^Chats/ })
  expect(within(sidebar).queryByRole('region', { name: /^Features/ })).toBeNull()
  const count = () => Number(within(chats).getByRole('heading').textContent?.match(/\d+$/)?.[0])
  const before = count()

  newChat()
  expect(count()).toBe(before)
  const field = screen.getByRole('textbox', { name: /Send your prompt/ })
  fireEvent.change(field, { target: { value: 'How should we split the backlog?' } })
  fireEvent.keyDown(field, { key: 'Enter', ctrlKey: true })
  const row = await within(chats).findByRole('button', {
    name: /^How should we split the backlog/,
  })
  expect(row).toHaveAccessibleName(/Smith, General agent/)
  expect(row.querySelector('[data-slot="smith-mark"]')).not.toBeNull()
  expect(count()).toBe(before + 1)

  fireEvent.click(screen.getByRole('button', { name: /^Close How should we split/ }))
  expect(row).toBeInTheDocument()
  fireEvent.click(row)
  expect(screen.getByRole('tab', { name: /How should we split/ })).toHaveAttribute(
    'aria-selected',
    'true',
  )
})

it('titles the section Chats in Portuguese too', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'pt-br' })} initialProjectId="dev" />)
  const sidebar = await screen.findByRole('complementary', { name: 'dev' })
  expect(within(sidebar).getByRole('region', { name: /^Chats/ })).toBeInTheDocument()
})
