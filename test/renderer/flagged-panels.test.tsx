import { render, screen, within } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'
import { overrideFlags } from '../../src/renderer/src/shared/lib/feature-flags'

afterEach(() => overrideFlags({}))

it('renders no Explorer, Changes or sync counts while their flags are off', async () => {
  overrideFlags({ explorer: false, 'source-control': false })
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  const panel = await screen.findByRole('complementary', { name: 'Project' })
  expect(within(panel).queryByRole('region', { name: /^Explorer/ })).toBeNull()
  expect(within(panel).queryByRole('region', { name: /^Changes/ })).toBeNull()
  expect(within(panel).getByRole('region', { name: /^Branches/ })).toBeInTheDocument()
  expect(within(panel).getByRole('region', { name: /^Project/ })).toBeInTheDocument()
  expect(within(panel).getAllByRole('separator')).toHaveLength(1)
  expect(screen.getByRole('contentinfo')).not.toHaveTextContent(/[↑↓]/)
  const git = within(screen.getByRole('contentinfo')).getByRole('status', { name: /^Branch / })
  expect(git.textContent).not.toBe('')
  expect(git).not.toHaveAccessibleName(/behind|ahead/)
  expect(git.querySelectorAll('[tabindex="0"]')).toHaveLength(1)
})

it.each([
  [true, true, 3],
  [true, false, 2],
  [false, true, 2],
] as const)(
  'gates panels independently with explorer=%s and source-control=%s',
  async (explorer, sourceControl, separators) => {
    overrideFlags({ explorer, 'source-control': sourceControl })
    render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
    const panel = await screen.findByRole('complementary', { name: 'Project' })
    expect(within(panel).queryByRole('region', { name: /^Explorer/ }) !== null).toBe(explorer)
    expect(within(panel).queryByRole('region', { name: /^Changes/ }) !== null).toBe(sourceControl)
    expect(within(panel).getAllByRole('separator')).toHaveLength(separators)
    expect(screen.getByRole('contentinfo').textContent?.includes('↑')).toBe(sourceControl)
  },
)
