import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'
import { boardColumns } from '../../src/renderer/src/pages/board'
import { createWorkbenchStore } from '../../src/renderer/src/entities/feature'
import { overrideFlags } from '../../src/renderer/src/shared/lib/feature-flags'

afterEach(() => overrideFlags({}))

const openBoard = async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  const sidebar = await screen.findByRole('complementary', { name: 'dev' })
  fireEvent.click(within(sidebar).getByRole('button', { name: 'Board' }))
}

it('places features and demands in RPI columns and opens a card', async () => {
  await openBoard()
  expect(screen.getByRole('tab', { name: /Board/ })).toHaveAttribute('aria-selected', 'true')
  const board = screen.getByRole('region', { name: 'Board' })
  const columns = within(board).getAllByRole('region', {
    name: /^(Backlog|Research|Plan|Implement|Testing|Review|Done) \d+$/,
  })
  expect(columns.map((column) => column.getAttribute('aria-label')?.split(' ')[0])).toEqual([
    'Backlog',
    'Research',
    'Plan',
    'Implement',
    'Testing',
    'Review',
    'Done',
  ])
  expect(within(columns[0]).getByRole('button', { name: /Dark mode for exports/ })).toBeVisible()
  expect(within(columns[6]).getByRole('button', { name: /Profile settings/ })).toBeVisible()
  const card = within(columns[1]).getByRole('button', { name: /Login with OAuth/ })
  expect(card).not.toHaveAttribute('draggable', 'true')
  fireEvent.click(card)
  expect(screen.getByRole('tab', { name: /Login with OAuth/ })).toHaveAttribute(
    'aria-selected',
    'true',
  )
})

it('opens the Backlog page from a demand card', async () => {
  await openBoard()
  fireEvent.click(screen.getByRole('button', { name: /Dark mode for exports/ }))
  expect(screen.getByRole('tab', { name: /Backlog/ })).toHaveAttribute('aria-selected', 'true')
})

it('moves a feature to the column of its stage and keeps archived, abandoned and Ferreiro chats out', async () => {
  const source = createMockSource({ locale: 'en' })
  const snapshot = await source.loadProject('dev')
  const [first, second, third] = snapshot.features
  const columns = boardColumns({
    ...snapshot,
    features: [
      { ...first, stage: 'planner' },
      { ...second, stage: 'smith' },
      { ...third, endState: 'abandoned' },
    ],
  })
  const ids = (id: string) => columns.find((column) => column.id === id)!.cards.map((c) => c.id)
  expect(ids('plan')).toEqual([first.id])
  expect(columns.flatMap((column) => column.cards.map((card) => card.id))).not.toContain(second.id)
  expect(columns.flatMap((column) => column.cards.map((card) => card.id))).not.toContain(third.id)
})

it('cannot open the Board while the flag is off', async () => {
  overrideFlags({ 'backlog-board': false })
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  const sidebar = await screen.findByRole('complementary', { name: 'dev' })
  expect(within(sidebar).queryByRole('button', { name: 'Board' })).toBeNull()
  const store = createWorkbenchStore(createMockSource({ locale: 'en' }))
  await store.getState().openProject('dev')
  store.getState().openBoard()
  expect(store.getState().boardOpen).toBe(false)
})
