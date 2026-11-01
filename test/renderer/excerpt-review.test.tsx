import { fireEvent, render, screen, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { SelectionPopover } from '../../src/renderer/src/features/document-reader/selection-popover'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'

vi.mock('mermaid', () => ({
  default: { initialize: vi.fn(), render: async () => ({ svg: '<svg></svg>' }) },
}))

it('offers Review with agent for a real selection and hands over the excerpt without sending', () => {
  const onReview = vi.fn()
  render(
    <SelectionPopover
      selection={{ text: 'deterministic expiration handling', rect: new DOMRect(10, 10, 80, 16) }}
      label="Review with agent"
      onReview={onReview}
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Review with agent' }))
  expect(onReview).toHaveBeenCalledWith('deterministic expiration handling')
  render(
    <SelectionPopover
      selection={{ text: 'ab', rect: new DOMRect() }}
      label="Review with agent"
      onReview={onReview}
    />,
  )
  expect(screen.getAllByRole('button', { name: 'Review with agent' })).toHaveLength(1)
})

function selectText(node: Node) {
  const range = document.createRange()
  range.selectNodeContents(node)
  range.getBoundingClientRect = () => new DOMRect(10, 100, 80, 16)
  const selection = window.getSelection()!
  selection.removeAllRanges()
  selection.addRange(range)
  fireEvent(document, new Event('selectionchange'))
}

it('appends a quoted excerpt to the feature draft, hands the next turn to its author and focuses without sending', async () => {
  const source = createMockSource({ locale: 'en' })
  source.readArtifact = async () => 'A selected excerpt\n\nAnother paragraph'
  const send = vi.spyOn(source, 'streamReply')
  render(<WorkbenchPage source={source} initialProjectId="dev" />)
  const field = await screen.findByRole('textbox', { name: /Send your prompt/ })
  fireEvent.change(field, { target: { value: 'Keep my draft' } })
  fireEvent.click(screen.getByRole('button', { name: /^login-oauth\/PLAN.md/ }))
  selectText(await screen.findByText('A selected excerpt'))
  fireEvent.click(screen.getByRole('button', { name: 'Review with agent' }))
  const draft = screen.getByRole('textbox', { name: /Send your prompt/ })
  expect(draft).toHaveValue('Keep my draft\nReview login-oauth/PLAN.md:\n> A selected excerpt')
  expect(draft).toHaveFocus()
  expect(send).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('tab', { name: /Catalog search/ }))
  expect(screen.getByRole('textbox', { name: /Send your prompt/ })).toHaveValue('')
  fireEvent.change(screen.getByRole('textbox', { name: /Send your prompt/ }), {
    target: { value: 'Separate draft' },
  })
  fireEvent.click(screen.getByRole('tab', { name: /Login with OAuth/ }))
  expect(screen.getByRole('textbox', { name: /Send your prompt/ })).toHaveValue(
    'Keep my draft\nReview login-oauth/PLAN.md:\n> A selected excerpt',
  )
  // The excerpt's author takes the next turn, without an agent selector.
  fireEvent.keyDown(screen.getByRole('textbox', { name: /Send your prompt/ }), {
    key: 'Enter',
    ctrlKey: true,
  })
  const authors = within(screen.getByRole('list', { name: 'Conversation' })).getAllByText(/./, {
    selector: '[data-slot="message-author"]',
  })
  expect(authors.at(-1)).toHaveTextContent('Moldmaker')
})

it('responds to keyboard selection changes and hides on Escape, collapse and outside selections', async () => {
  const source = createMockSource({ locale: 'en' })
  source.readArtifact = async () => 'Keyboard excerpt'
  render(<WorkbenchPage source={source} initialProjectId="dev" />)
  fireEvent.click(await screen.findByRole('button', { name: /^login-oauth\/SPEC.md/ }))
  const paragraph = await screen.findByText('Keyboard excerpt')
  fireEvent.keyDown(paragraph, { key: 'ArrowRight', shiftKey: true })
  selectText(paragraph)
  expect(screen.getByRole('button', { name: 'Review with agent' })).toBeInTheDocument()
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(screen.queryByRole('button', { name: 'Review with agent' })).toBeNull()
  selectText(paragraph)
  window.getSelection()!.collapse(paragraph, 0)
  fireEvent(document, new Event('selectionchange'))
  expect(screen.queryByRole('button', { name: 'Review with agent' })).toBeNull()
  selectText(screen.getByRole('tab', { name: /SPEC.md/ }))
  expect(screen.queryByRole('button', { name: 'Review with agent' })).toBeNull()
})

it('keeps the popover hidden on scroll or resize after Escape or a review', async () => {
  const source = createMockSource({ locale: 'en' })
  source.readArtifact = async () => 'Scrolling excerpt'
  render(<WorkbenchPage source={source} initialProjectId="dev" />)
  fireEvent.click(await screen.findByRole('button', { name: /^login-oauth\/SPEC.md/ }))
  const paragraph = await screen.findByText('Scrolling excerpt')
  selectText(paragraph)
  fireEvent.keyDown(document, { key: 'Escape' })
  fireEvent.scroll(document)
  fireEvent(window, new Event('resize'))
  expect(screen.queryByRole('button', { name: 'Review with agent' })).toBeNull()
  selectText(paragraph)
  fireEvent.click(screen.getByRole('button', { name: 'Review with agent' }))
  fireEvent.scroll(document)
  expect(screen.queryByRole('button', { name: 'Review with agent' })).toBeNull()
})

it('uses the explicit feature link even when the artifact name points elsewhere', async () => {
  const source = createMockSource({ locale: 'en' })
  const load = source.loadProject
  source.loadProject = async (id) => {
    const snapshot = await load(id)
    snapshot.artifacts[1] = { ...snapshot.artifacts[1], featureId: 'feature-2' }
    return snapshot
  }
  source.readArtifact = async () => 'Explicit feature excerpt'
  render(<WorkbenchPage source={source} initialProjectId="dev" />)
  fireEvent.click(await screen.findByRole('button', { name: /^login-oauth\/PLAN.md/ }))
  selectText(await screen.findByText('Explicit feature excerpt'))
  fireEvent.click(screen.getByRole('button', { name: 'Review with agent' }))
  fireEvent.click(screen.getByRole('tab', { name: /Catalog search/ }))
  expect(screen.getByRole('textbox', { name: /Send your prompt/ })).toHaveValue(
    'Review login-oauth/PLAN.md:\n> Explicit feature excerpt',
  )
})

it.each(['missing', 'archived'])(
  'hides review for an artifact linked to a %s feature',
  async (link) => {
    const source = createMockSource({ locale: 'en' })
    const load = source.loadProject
    source.loadProject = async (id) => {
      const snapshot = await load(id)
      snapshot.artifacts[0] = {
        ...snapshot.artifacts[0],
        featureId: link === 'missing' ? 'unknown' : 'feature-1',
      }
      if (link === 'archived') snapshot.features[0] = { ...snapshot.features[0], archived: true }
      return snapshot
    }
    source.readArtifact = async () => 'Unlinked excerpt'
    render(<WorkbenchPage source={source} initialProjectId="dev" />)
    fireEvent.click(await screen.findByRole('button', { name: /^login-oauth\/SPEC.md/ }))
    selectText(await screen.findByText('Unlinked excerpt'))
    expect(screen.queryByRole('button', { name: 'Review with agent' })).toBeNull()
  },
)
