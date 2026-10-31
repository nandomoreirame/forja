import { fireEvent, render, screen, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { StatusBadge } from '../../src/shared/ui'
import { Composer, Messages } from '../../src/widgets/conversation'
import { MermaidPreview } from '../../src/widgets/documents'
import { FeatureContext } from '../../src/widgets/workbench'
import { TerminalPreview } from '../../src/widgets/terminal'
import { Styleguide } from '../../site/src/pages/styleguide'

vi.mock('mermaid', () => ({
  default: { initialize: vi.fn(), render: () => new Promise(() => {}) },
}))

it('renders every status with one anatomy and a state-specific marker', () => {
  render(
    <>
      <StatusBadge state="completed">Completed</StatusBadge>
      <StatusBadge state="failed">Failed</StatusBadge>
      <StatusBadge state="running">Running</StatusBadge>
      <StatusBadge state="interrupted">Interrupted</StatusBadge>
    </>,
  )
  const marker = (name: string) =>
    screen.getByText(name).closest('[data-slot="status-badge"]')?.getAttribute('data-marker')
  expect(marker('Completed')).toBe('check')
  expect(marker('Failed')).toBe('cross')
  expect(marker('Running')).toBe('dot')
  expect(marker('Interrupted')).toBe('square')
  expect(screen.getByText('Running').closest('[data-slot="status-badge"]')).toHaveAttribute(
    'data-tone',
    'accent',
  )
})

it('shows the workflow mode and marks only the current cycle stage', () => {
  render(
    <FeatureContext
      title="Login with OAuth"
      mode="Guided"
      rows={[{ label: 'Destination', value: '~/dev/projects/forja' }]}
      cycleLabel="Cycle"
      cycle={[
        { label: 'Research', state: 'done' },
        { label: 'Planner', state: 'done' },
        { label: 'Implementer', state: 'current' },
        { label: 'Tester', state: 'pending' },
      ]}
    />,
  )
  expect(screen.getByText('Guided')).toBeInTheDocument()
  const cycle = screen.getByRole('list', { name: 'Cycle' })
  expect(within(cycle).getAllByRole('listitem')).toHaveLength(4)
  expect(within(cycle).getByText('Implementer').closest('li')).toHaveAttribute(
    'aria-current',
    'step',
  )
  expect(within(cycle).getByText('Research').closest('li')).not.toHaveAttribute('aria-current')
})

it('labels the composer target so it is not confused with the opened folder', () => {
  render(
    <Composer
      recipients={[{ id: 'implementer', label: 'Implementer' }]}
      recipientId="implementer"
      onRecipientChange={() => {}}
      featureLabel="Login"
      targetLabel="~/dev/projects/forja"
      targetPrefix="Destination"
      value=""
      onChange={() => {}}
      onSend={() => {}}
      placeholder="Send an instruction"
    />,
  )
  expect(screen.getByText('~/dev/projects/forja').parentElement).toHaveTextContent(
    'Destination: ~/dev/projects/forja',
  )
})

it('announces a readable loading state while the diagram renders', () => {
  render(<MermaidPreview source="flowchart LR\n  a --> b" loadingLabel="Rendering diagram" />)
  expect(screen.getByRole('status')).toHaveTextContent('Rendering diagram')
})

it('keeps the English gallery free of Portuguese card labels and closes with the board footer', () => {
  render(<Styleguide locale="en" />)
  expect(screen.queryByText(/diagrama renderizado/i)).toBeNull()
  expect(screen.getByRole('heading', { name: /Section 7: Fidelity notes/ })).toBeInTheDocument()
  expect(screen.getByText('1280px Desktop · Terminal Noir').closest('footer')).toHaveTextContent(
    'Forja 2.0 · MVP styleguide',
  )
})

it('places a workflow event between messages in conversation order', () => {
  const onAction = vi.fn()
  render(
    <Messages
      items={[
        { id: 'u', author: 'You', role: 'user', text: 'Fix it.' },
        {
          id: 'h',
          author: 'Tester',
          role: 'event',
          text: 'Tester requested a fix',
          action: 'View request',
          onAction,
        },
        { id: 'a', author: 'Implementer', role: 'agent', text: 'On it.' },
      ]}
    />,
  )
  const items = screen.getAllByRole('listitem')
  expect(items.map((item) => item.textContent)).toEqual([
    expect.stringContaining('Fix it.'),
    expect.stringContaining('Tester requested a fix'),
    expect.stringContaining('On it.'),
  ])
  within(items[1]).getByRole('button', { name: 'View request' }).click()
  expect(onAction).toHaveBeenCalledOnce()
})

it('explains terminal icon actions and tabs with tooltips on keyboard focus', async () => {
  render(
    <TerminalPreview
      tabs={[{ id: 'dev', label: 'Implementer · dev', state: 'running', stateLabel: 'Running' }]}
      activeId="dev"
      output={[]}
      addLabel="New terminal"
      collapseLabel="Collapse terminals"
    />,
  )
  fireEvent.focus(screen.getByRole('button', { name: 'New terminal' }))
  expect(await screen.findByRole('tooltip')).toHaveTextContent('New terminal')
  fireEvent.blur(screen.getByRole('button', { name: 'New terminal' }))
  fireEvent.focus(screen.getByRole('button', { name: 'Collapse terminals' }))
  expect(await screen.findByRole('tooltip')).toHaveTextContent('Collapse terminals')
  fireEvent.blur(screen.getByRole('button', { name: 'Collapse terminals' }))
  fireEvent.focus(screen.getByRole('tab', { name: /Implementer · dev/ }))
  expect(await screen.findByRole('tooltip')).toHaveTextContent('Implementer · dev · Running')
})

it('renders a single recipient chevron that flips while the select is open', () => {
  render(
    <Composer
      recipients={[{ id: 'implementer', label: 'Implementer' }]}
      recipientId="implementer"
      onRecipientChange={() => {}}
      featureLabel="Login"
      targetLabel="~/dev/projects/forja"
      value=""
      onChange={() => {}}
      onSend={() => {}}
      placeholder="Send an instruction"
    />,
  )
  const trigger = screen.getByRole('combobox', { name: 'Recipient' })
  const chevrons = trigger.querySelectorAll('svg')
  expect(chevrons).toHaveLength(1)
  expect(chevrons[0].getAttribute('class')).toContain(
    'group-data-[state=open]/select-trigger:rotate-180',
  )
})

it('renders the send shortcut inside the hint as a keyboard chip', () => {
  render(
    <Composer
      recipients={[{ id: 'implementer', label: 'Implementer' }]}
      recipientId="implementer"
      onRecipientChange={() => {}}
      featureLabel="Login"
      targetLabel="~/dev/projects/forja"
      value=""
      onChange={() => {}}
      onSend={() => {}}
      placeholder="Send an instruction"
      shortcutHint="Pressione Ctrl+Enter para enviar"
    />,
  )
  const kbd = screen.getByText('Ctrl+Enter')
  expect(kbd.tagName).toBe('KBD')
  expect(kbd.parentElement).toHaveTextContent('Pressione Ctrl+Enter para enviar')
})
