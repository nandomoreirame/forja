import { render, screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'

it('scrolls each sidebar section on its own instead of the whole sidebar', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  const sidebar = await screen.findByRole('complementary', { name: 'dev' })
  const body = sidebar.querySelector('[data-slot="sidebar-sections"]')!
  expect(body).not.toHaveClass('overflow-y-auto')
  const lists = within(sidebar).getAllByTestId('section-scroll')
  expect(lists.length).toBeGreaterThanOrEqual(4)
  for (const list of lists) expect(list).toHaveClass('overflow-y-auto')
  const features = within(sidebar).getByRole('region', { name: /Features/ })
  expect(within(features).getByTestId('section-scroll')).toHaveClass('max-h-[22rem]')
  const specs = lists.find((list) => list.closest('section') !== features)!
  expect(specs).toHaveClass('max-h-[16.5rem]')
})
