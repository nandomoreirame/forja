import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import { createMockSource, type ProjectSnapshot } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'

async function setup(update?: (snapshot: ProjectSnapshot) => ProjectSnapshot) {
  const source = createMockSource({ locale: 'en' })
  const snapshot = await source.loadProject('dev')
  render(
    <WorkbenchPage
      source={update ? { ...source, loadProject: async () => update(snapshot) } : source}
      initialProjectId="dev"
    />,
  )
  const sidebar = await screen.findByRole('complementary', { name: 'dev' })
  return {
    sidebar,
    specs: within(sidebar).getByRole('region', { name: /Specs/ }),
    plans: within(sidebar).getByRole('region', { name: /Plans/ }),
  }
}

it('shows linked specs and plans, highlights the selected feature and has no add-plan action', async () => {
  const { sidebar, specs, plans } = await setup()
  const oauthSpec = within(specs).getByRole('button', { name: /Login with OAuth/ })
  expect(oauthSpec).toHaveAttribute('data-current', 'true')
  expect(oauthSpec).toHaveClass('text-foreground')
  const other = within(specs).getByRole('button', { name: /Catalog search/ })
  expect(other).not.toHaveAttribute('data-current')
  expect(other).toHaveClass('text-muted-foreground')
  const plan = within(plans).getAllByRole('button')[0]
  expect(plan).toHaveTextContent(/spec/i)
  expect(plan).toHaveAttribute('data-current', 'true')
  expect(within(sidebar).queryByRole('button', { name: /Add plan/ })).toBeNull()
  fireEvent.click(within(specs).getByRole('button', { name: /New spec/ }))
  expect(screen.getByRole('combobox', { name: 'Recipient' })).toHaveTextContent('Research')
  for (const section of [specs, plans]) {
    for (const row of within(section)
      .getAllByRole('button')
      .filter((row) => row.textContent?.includes('.md'))) {
      expect(row).not.toHaveAttribute('data-current')
      expect(row).toHaveClass('text-foreground')
    }
  }
})

it('omits archived artifacts, counts visible rows and updates selection', async () => {
  const { sidebar, specs, plans } = await setup()
  expect(within(specs).getByRole('heading', { name: 'Specs 4' })).toBeInTheDocument()
  expect(within(plans).getByRole('heading', { name: 'Plans 4' })).toBeInTheDocument()
  expect(within(sidebar).queryByRole('button', { name: /legacy-import/ })).toBeNull()
  fireEvent.click(within(sidebar).getByRole('button', { name: /Catalog search ·/ }))
  expect(within(specs).getByRole('button', { name: /Catalog search/ })).toHaveAttribute(
    'data-current',
    'true',
  )
  expect(within(plans).getByRole('button', { name: /catalog-search/ })).toHaveAttribute(
    'data-current',
    'true',
  )
})

it('opens a document with the keyboard and renders small state badges', async () => {
  const user = userEvent.setup()
  const { specs } = await setup((snapshot) => ({
    ...snapshot,
    artifacts: snapshot.artifacts.map((item) =>
      item.id.includes('catalog-search') ? { ...item, state: 'stale' } : item,
    ),
  }))
  const row = within(specs).getByRole('button', { name: /Login with OAuth/ })
  expect(row).toHaveTextContent('Approved')
  expect(row.querySelector('[data-slot="status-badge"]')).toHaveAttribute('data-size', 'sm')
  expect(within(specs).getByRole('button', { name: /Catalog search/ })).toHaveTextContent('Stale')
  row.focus()
  await user.keyboard('{Enter}')
  expect(await screen.findByRole('tab', { name: /^login-oauth\/SPEC.md/ })).toHaveAttribute(
    'aria-selected',
    'true',
  )
})

it('keeps empty section headers and avoids a minimum list height', async () => {
  const { specs, plans } = await setup((snapshot) => ({ ...snapshot, artifacts: [] }))
  for (const [section, title] of [
    [specs, 'Specs'],
    [plans, 'Plans'],
  ] as const) {
    expect(within(section).getByRole('heading', { name: `${title} 0` })).toBeInTheDocument()
    expect(within(section).getByTestId('section-scroll')).not.toHaveClass('min-h-16')
  }
})

it('uses slug fallbacks for unlinked library artifacts without dimming them', async () => {
  const { specs, plans } = await setup((snapshot) => ({
    ...snapshot,
    artifacts: [
      { id: 's', name: 'real/SPEC.md', kind: 'spec', state: 'draft', author: 'research' },
      { id: 'p', name: 'real/PLAN.md', kind: 'plan', state: 'draft', author: 'planner' },
      { id: 'p2', name: 'other/PLAN.md', kind: 'plan', state: 'draft', author: 'planner' },
    ],
  }))
  const spec = within(specs).getByRole('button', { name: /real\/SPEC.md/ })
  expect(spec).toHaveTextContent('real/SPEC.mdreal')
  expect(within(plans).getByRole('button', { name: /real\/PLAN.md/ })).toHaveTextContent(
    'real/SPEC.md',
  )
  expect(within(plans).getByRole('button', { name: /other\/PLAN.md/ })).toHaveTextContent(
    'other/PLAN.mdother',
  )
  for (const row of [spec, ...within(plans).getAllByRole('button')]) {
    expect(row).not.toHaveAttribute('data-current')
    expect(row).toHaveClass('text-foreground')
  }
})
