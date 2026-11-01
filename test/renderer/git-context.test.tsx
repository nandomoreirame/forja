import { render, screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'

it('pins the Git and Branches sections to the bottom of the right sidebar', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  await screen.findByRole('tab', { name: /Login with OAuth/ })
  const aside = screen
    .getAllByRole('complementary')
    .find((el) => within(el).queryByText('Branches'))!
  expect(aside.className).toMatch(/\bflex-col\b/)
  const bottom = aside.lastElementChild as HTMLElement
  expect(bottom.className).toMatch(/\bmt-auto\b/)
  expect(within(bottom).getByRole('heading', { name: /Git/ })).toBeInTheDocument()
  expect(within(bottom).getByText('Branches')).toBeInTheDocument()
})
