import { render, screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'

it('keeps destination and branch in the right panel, not in the conversation header', async () => {
  const source = createMockSource({ locale: 'en' })
  const feature = (await source.loadProject('dev')).features[0]
  render(<WorkbenchPage source={source} initialProjectId="dev" />)
  const header = await screen.findByRole('region', { name: feature.name })
  expect(header).not.toHaveTextContent('Destination:')
  expect(header).not.toHaveTextContent('Branch:')
  const panel = screen.getByRole('complementary', { name: 'Project' })
  expect(within(panel).getByText('Destination')).toBeInTheDocument()
  expect(panel).toHaveTextContent(feature.branch)
})
