import { fireEvent, render, screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'

it('opens Memory, Connectors and Settings from the workspace menu', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  const sidebar = await screen.findByRole('complementary', { name: 'dev' })
  const menu = within(sidebar).getByRole('navigation', { name: 'Workspace' })
  expect(within(menu).getAllByRole('button').map((button) => button.textContent)).toEqual([
    'Usage and limits',
    'Memory',
    'Connectors',
    'Settings',
  ])
  fireEvent.click(within(menu).getByRole('button', { name: 'Connectors' }))
  expect(await screen.findByRole('tab', { name: 'Connectors' })).toHaveAttribute('aria-selected', 'true')
  fireEvent.click(within(menu).getByRole('button', { name: 'Memory' }))
  expect(await screen.findByRole('tab', { name: 'Memory' })).toHaveAttribute('aria-selected', 'true')
})
