import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { Composer, Messages } from '../../src/widgets/conversation'
import { DocumentPreview } from '../../src/widgets/documents'
import { FeatureTabs } from '../../src/widgets/workbench'
import { TerminalPreview } from '../../src/widgets/terminal'

it('selects a feature by stable id rather than its display label', () => {
  const selected: string[] = []
  render(
    <FeatureTabs
      selectedId="a"
      items={[
        { id: 'a', label: 'Login', state: 'running' },
        { id: 'b', label: 'Search', state: 'waiting' },
      ]}
      onSelect={(id) => selected.push(id)}
    />,
  )
  fireEvent.click(screen.getByRole('tab', { name: /Search/ }))
  expect(selected).toEqual(['b'])
  expect(screen.getByRole('tab', { name: /Login/ })).toHaveAttribute('aria-selected', 'true')
})

it('sends only through explicit submit and reports text changes without side effects', () => {
  const onSend = vi.fn()
  const onChange = vi.fn()
  render(
    <Composer
      featureLabel="Login"
      targetLabel="~/dev/projects/forja"
      value=""
      onChange={onChange}
      onSend={onSend}
      placeholder="Send an instruction"
    />,
  )
  fireEvent.change(screen.getByRole('textbox', { name: 'Send an instruction' }), {
    target: { value: 'fix' },
  })
  expect(onChange).toHaveBeenCalledWith('fix')
  expect(onSend).not.toHaveBeenCalled()
  expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
})

it('renders terminal tabs with a terminal icon and a focusable add control', () => {
  const onAdd = vi.fn()
  const { container } = render(
    <TerminalPreview
      tabs={[
        { id: 'tests', label: 'Implementer · tests', state: 'done', stateLabel: 'Completed' },
        { id: 'dev', label: 'Implementer · dev', state: 'running', stateLabel: 'Running' },
        { id: 'zsh', label: 'zsh', state: 'idle', stateLabel: 'Idle' },
      ]}
      activeId="dev"
      output={['> npm run dev']}
      addLabel="New terminal"
      onAdd={onAdd}
    />,
  )
  expect(container.querySelectorAll('[role="tab"] svg')).toHaveLength(3)
  fireEvent.click(screen.getByRole('button', { name: 'New terminal' }))
  expect(onAdd).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('tab', { name: /Implementer · dev/ })).toHaveAttribute(
    'aria-selected',
    'true',
  )
})

it('shows the empty conversation state and the full cwd without ellipsis', () => {
  render(<Messages items={[]} emptyLabel="No conversation in this feature." />)
  expect(screen.getByText('No conversation in this feature.')).toBeInTheDocument()
  render(
    <TerminalPreview
      tabs={[{ id: 'dev', label: 'dev', state: 'running', stateLabel: 'Running' }]}
      activeId="dev"
      output={[]}
      cwd="~/.worktrees/login-oauth/projects/forja/very/long/path"
    />,
  )
  expect(
    screen.getByText('~/.worktrees/login-oauth/projects/forja/very/long/path'),
  ).toBeInTheDocument()
})

it('labels document approval state with text and a status notice', () => {
  render(
    <DocumentPreview
      name="SPEC.md"
      state="draft"
      stateLabel="Draft"
      actionLabel="Approve spec"
      notice="Plan blocked: approve the spec to continue."
    >
      <p>Objective</p>
    </DocumentPreview>,
  )
  expect(screen.getByText('Draft')).toBeInTheDocument()
  expect(screen.getByRole('status')).toHaveTextContent(
    'Plan blocked: approve the spec to continue.',
  )
})
