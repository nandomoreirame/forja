import { render, screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import { FeatureTabs } from '../../src/widgets/workbench'
import { ToolIcon, toolIds } from '../../src/shared/ui'

it('shows the AI tool of each feature session before its status dot', () => {
  render(
    <FeatureTabs
      selectedId="login"
      onSelect={() => {}}
      items={[
        { id: 'login', label: 'Login with OAuth', state: 'running', tool: 'claude' },
        { id: 'search', label: 'Catalog search', state: 'waiting', tool: 'codex' },
      ]}
    />,
  )
  const tab = screen.getByRole('tab', { name: /Login with OAuth/ })
  const icon = within(tab).getByRole('img', { name: 'Claude' })
  const dot = tab.querySelector('[data-slot="feature-tab-status"]')!
  expect(icon.compareDocumentPosition(dot) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  expect(
    within(screen.getByRole('tab', { name: /Catalog search/ })).getByRole('img', { name: 'Codex' }),
  ).toBeInTheDocument()
})

it('labels every supported tool icon', () => {
  render(
    <>
      {toolIds.map((tool) => (
        <ToolIcon key={tool} tool={tool} />
      ))}
    </>,
  )
  expect(screen.getAllByRole('img').map((img) => img.getAttribute('aria-label'))).toEqual([
    'Claude',
    'Codex',
    'OpenCode',
    'Antigravity',
    'Grok',
  ])
})
