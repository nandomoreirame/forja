import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { App } from '../../site/src/app'
import { renderRoute } from '../../site/src/entry-server'
import { LocaleLink } from '../../site/src/components/locale-link'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../../src/shared/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '../../src/shared/ui/popover'
import { ForjaMark } from '../../src/shared/ui/forja-mark'
import { Composer, Messages } from '../../src/widgets/conversation'
import { DocumentPreview } from '../../src/widgets/documents'
import { TerminalPreview } from '../../src/widgets/terminal'

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Element.prototype.scrollIntoView ??= () => {}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver

it('routes each locale page and shows a not-found view for unknown paths', () => {
  const { unmount } = render(<App pathname="/pt-br" />)
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
    'Avance com seus agentes de IA',
  )
  unmount()
  const styleguide = render(<App pathname="/styleguide" />)
  expect(screen.getByRole('heading', { name: /Tokens/ })).toBeInTheDocument()
  styleguide.unmount()
  render(<App pathname="/unknown" />)
  expect(screen.getByText('Page not found · Página não encontrada')).toBeInTheDocument()
})

it('renders a route to HTML on the server', () => {
  expect(renderRoute('/pt-br')).toContain('Avance com seus agentes de IA')
})

it('switches the locale link to the same page in the other language', () => {
  render(
    <>
      <LocaleLink page="landing" target="pt-br" label="[pt-br]" />
      <LocaleLink page="styleguide" target="en" label="[en]" />
    </>,
  )
  expect(screen.getByRole('link', { name: '[pt-br]' })).toHaveAttribute('href', '/pt-br')
  expect(screen.getByRole('link', { name: '[en]' })).toHaveAttribute('href', '/styleguide')
})

it('lists command items and an empty state', () => {
  render(
    <Command>
      <CommandInput placeholder="Search features" />
      <CommandList>
        <CommandEmpty>Nothing here</CommandEmpty>
        <CommandGroup heading="Agents">
          <CommandItem>Implementer</CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>,
  )
  expect(screen.getByPlaceholderText('Search features')).toBeInTheDocument()
  expect(screen.getByText('Implementer')).toBeInTheDocument()
})

it('opens popover content from its trigger', async () => {
  render(
    <Popover>
      <PopoverTrigger>Open details</PopoverTrigger>
      <PopoverContent>Details body</PopoverContent>
    </Popover>,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Open details' }))
  expect(await screen.findByText('Details body')).toBeInTheDocument()
})

it('renders the anvil mark as decorative svg', () => {
  const { container } = render(<ForjaMark className="size-4" />)
  const svg = container.querySelector('svg')
  expect(svg).toHaveAttribute('aria-hidden', 'true')
  expect(svg).toHaveClass('size-4')
})

it('sends from the composer with Ctrl+Enter only when there is text', () => {
  const onSend = vi.fn()
  render(
    <Composer
      featureLabel="Login"
      targetLabel="~/dev"
      value="fix the token"
      onChange={() => {}}
      onSend={onSend}
      placeholder="Send an instruction"
    />,
  )
  fireEvent.keyDown(screen.getByRole('textbox', { name: 'Send an instruction' }), {
    key: 'Enter',
    ctrlKey: true,
  })
  expect(onSend).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole('button', { name: 'Send' }))
  expect(onSend).toHaveBeenCalledTimes(2)
})

it('runs the message action when it is clicked', () => {
  const onAction = vi.fn()
  render(
    <Messages
      items={[
        {
          id: 'a',
          author: 'Implementer',
          role: 'agent',
          text: 'Working',
          status: 'Running',
          action: 'Interrupt',
          onAction,
        },
      ]}
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Interrupt' }))
  expect(onAction).toHaveBeenCalledTimes(1)
})

it('shows the document notice and runs the action', () => {
  const onAction = vi.fn()
  render(
    <DocumentPreview
      name="SPEC.md"
      stateLabel="Draft"
      actionLabel="Approve spec"
      onAction={onAction}
      notice="Blocked"
      noticeStatus="Waiting"
    >
      <p>Objective</p>
    </DocumentPreview>,
  )
  fireEvent.click(screen.getByRole('button', { name: /Approve spec/ }))
  expect(onAction).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('status')).toHaveTextContent('Waiting')
  expect(screen.getByText('Objective')).toBeInTheDocument()
})

it('selects inactive terminal tabs and reports add and collapse', () => {
  const onSelect = vi.fn()
  const onAdd = vi.fn()
  const onCollapse = vi.fn()
  render(
    <TerminalPreview
      tabs={[
        { id: 'dev', label: 'dev', state: 'running', stateLabel: 'Running' },
        { id: 'zsh', label: 'zsh', state: 'idle', stateLabel: '' },
      ]}
      activeId="dev"
      onSelect={onSelect}
      onAdd={onAdd}
      onCollapse={onCollapse}
      output={[]}
      emptyOutputLabel="Waiting for output"
      addLabel="New terminal"
      collapseLabel="Collapse terminals"
    />,
  )
  fireEvent.click(screen.getByRole('tab', { name: /zsh/ }))
  fireEvent.click(screen.getByRole('button', { name: 'New terminal' }))
  fireEvent.click(screen.getByRole('button', { name: 'Collapse terminals' }))
  expect(onSelect).toHaveBeenCalledWith('zsh')
  expect(onAdd).toHaveBeenCalledTimes(1)
  expect(onCollapse).toHaveBeenCalledTimes(1)
  expect(screen.getByText('Waiting for output')).toBeInTheDocument()
})
