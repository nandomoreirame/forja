import { render, screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'

it('stacks the right panel sections like the left sidebar panes', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  await screen.findByRole('tab', { name: /Login with OAuth/ })
  const panel = screen.getByRole('complementary', { name: 'Project' })
  const panes = panel.querySelectorAll('[data-slot="sidebar-pane"]')
  expect(panes).toHaveLength(4)
  for (const pane of panes) expect(pane.closest('[data-slot="resizable-panel"]')).not.toBeNull()
  // The filler keeps collapsed headers at the bottom while any pane is open (stackPanes).
  expect(panel.querySelector('[data-slot="pane-filler"]')).not.toBeNull()
  expect(within(panel).getAllByRole('separator')).toHaveLength(3)
})
