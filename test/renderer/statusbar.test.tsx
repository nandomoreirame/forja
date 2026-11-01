import { fireEvent, render, screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'

const footer = () => document.querySelector('footer') as HTMLElement

it('shows the Forja mark on the left, no project path, and git info before terminals', async () => {
  const source = createMockSource({ locale: 'en' })
  const snapshot = await source.loadProject('dev')
  const feature = snapshot.features[0]
  render(<WorkbenchPage source={source} initialProjectId="dev" />)
  await screen.findByRole('tab', { name: /Login with OAuth/ })
  const bar = footer()
  expect(bar.firstElementChild?.querySelector('svg')).not.toBeNull()
  expect(bar).not.toHaveTextContent(snapshot.project.path)
  const git = within(bar).getByRole('status', { name: /Branch/ })
  expect(git).toHaveTextContent(feature.branch)
  expect(git).toHaveTextContent(`${feature.behind ?? 0}↓ ${feature.ahead ?? 0}↑`)
  expect(git).toHaveAccessibleName(
    `Branch ${feature.branch}, ${feature.behind ?? 0} behind, ${feature.ahead ?? 0} ahead`,
  )
  // Git info sits at the right edge, separated from the terminals before it.
  expect(git.nextElementSibling).toBeNull()
  const separator = git.previousElementSibling!
  expect(separator).toHaveAttribute('role', 'separator')
  expect(separator.previousElementSibling).toContainElement(
    within(bar).getByRole('button', { name: 'Toggle terminals' }),
  )
})

it('follows the selected feature and falls back to the project branch', async () => {
  const source = createMockSource({ locale: 'en' })
  const snapshot = await source.loadProject('dev')
  render(<WorkbenchPage source={source} initialProjectId="dev" />)
  fireEvent.click(await screen.findByRole('tab', { name: /Catalog search/ }))
  const catalog = snapshot.features.find((f) => f.name === 'Catalog search')!
  expect(within(footer()).getByRole('status', { name: /Branch/ })).toHaveTextContent(catalog.branch)
  fireEvent.keyDown(window, { key: ',', ctrlKey: true })
  expect(within(footer()).getByRole('status', { name: /Branch/ })).toHaveTextContent(
    snapshot.branches[0],
  )
})

it('highlights each git item on hover and explains it in a tooltip', async () => {
  const source = createMockSource({ locale: 'en' })
  const snapshot = await source.loadProject('dev')
  const feature = snapshot.features[0]
  render(<WorkbenchPage source={source} initialProjectId="dev" />)
  await screen.findByRole('tab', { name: /Login with OAuth/ })
  const git = within(footer()).getByRole('status', { name: /Branch/ })
  const [branch, sync] = Array.from(git.children) as HTMLElement[]
  for (const item of [branch, sync]) {
    expect(item).toHaveAttribute('tabindex', '0')
    expect(item.className).toMatch(/hover:bg-accent/)
  }
  fireEvent.focus(branch)
  const branchTip = await screen.findByRole('tooltip')
  expect(branchTip).toHaveTextContent(`Branch: ${feature.branch}`)
  expect(branchTip).toHaveTextContent('Worktree: None')
  fireEvent.blur(branch)
  fireEvent.focus(sync)
  expect(await screen.findByRole('tooltip')).toHaveTextContent(
    `${feature.behind ?? 0} commits behind and ${feature.ahead ?? 0} ahead of ${snapshot.branches[0]}`,
  )
})
