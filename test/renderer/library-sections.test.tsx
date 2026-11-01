import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { createWorkbenchStore } from '../../src/renderer/src/entities/feature'
import { MarkdownPreview } from '../../src/widgets/documents/ui/markdown-preview'
import type { ReplyEvent, WorkbenchSource } from '../../src/renderer/src/shared/api'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'

it('labels skills and memories by scope and removes Memory from the workspace menu and Settings', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  const sidebar = await screen.findByRole('complementary', { name: 'dev' })
  const skills = within(sidebar).getByRole('region', { name: /Skills/ })
  const memories = within(sidebar).getByRole('region', { name: /Memories/ })
  expect(within(skills).getAllByText(/^(project|global)$/).length).toBeGreaterThan(1)
  expect(await within(memories).findAllByText(/^(project|global)$/)).not.toHaveLength(0)
  const workspace = within(sidebar).getByRole('navigation', { name: 'Workspace' })
  expect(within(workspace).queryByRole('button', { name: 'Memory' })).toBeNull()
  fireEvent.click(within(workspace).getByRole('button', { name: 'Settings' }))
  await screen.findByRole('tab', { name: 'Agents' })
  expect(screen.queryByRole('tab', { name: 'Memory' })).toBeNull()
  fireEvent.click(within(skills).getByRole('button', { name: /New skill/ }))
  expect(screen.getByRole('dialog', { name: /Skill scope/ })).toBeInTheDocument()
})

it.each(['skill', 'memory'] as const)(
  'creates a feature-less %s authoring conversation with the selected scope',
  async (kind) => {
    const user = userEvent.setup()
    const source = createMockSource({ locale: 'en' })
    const streamReply = source.streamReply
    source.streamReply = (request, onEvent) => streamReply(request, onEvent, { instant: true })
    render(<WorkbenchPage source={source} initialProjectId="dev" />)
    const sidebar = await screen.findByRole('complementary', { name: 'dev' })
    const features = within(sidebar).getByRole('region', { name: /Features/ }).textContent
    const trigger = within(sidebar).getByRole('button', { name: new RegExp('New ' + kind) })
    trigger.focus()
    await user.keyboard('{Enter}')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(trigger).toHaveFocus()
    await user.keyboard('{Enter}')
    const dialog = screen.getByRole('dialog')
    const global = within(dialog).getByRole('button', { name: 'Global' })
    expect(within(dialog).getByRole('button', { name: 'Project' })).toHaveFocus()
    await user.tab()
    expect(global).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(
      await screen.findByRole('heading', {
        name: kind === 'skill' ? 'Skill author' : 'Memory curator',
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('main')).toHaveTextContent('global')
    expect(screen.getByRole('log')).toHaveTextContent(
      kind === 'skill' ? 'author this skill' : 'curate this memory',
    )
    const prompt = screen.getByRole('textbox')
    prompt.focus()
    await user.keyboard('Keep examples concise')
    expect(prompt).toBeInTheDocument()
    expect(prompt).toHaveFocus()
    expect(prompt).toHaveValue('Keep examples concise')
    expect(screen.getByRole('button', { name: 'Send' })).toBeEnabled()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Send' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('log')).toHaveTextContent('Keep examples concise')
    expect(prompt).toHaveValue('')
    expect(within(sidebar).getByRole('region', { name: /Features/ }).textContent).toBe(features)
  },
)

it('opens real skill markdown with safe frontmatter and edits with the specialist', async () => {
  const source = createMockSource({
    locale: 'en',
    loadSkills: async () => [
      {
        id: 'example',
        name: 'Example skill',
        markdown:
          '---\nname: Example\ndescription: Safe summary\nnotes: |\n  Keep this text\n---\n# Actual instructions\n\n<script>bad()</script>\n\nUse **tests**.',
      },
    ],
  })
  render(<WorkbenchPage source={source} initialProjectId="dev" />)
  const sidebar = await screen.findByRole('complementary', { name: 'dev' })
  fireEvent.click(within(sidebar).getByRole('button', { name: /Example skill/ }))
  expect(await screen.findByRole('tab', { name: /Example skill/ })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  expect(screen.getByRole('cell', { name: 'Safe summary' })).toBeInTheDocument()
  expect(screen.getByText(/Keep this text/)).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Actual instructions' })).toBeInTheDocument()
  expect(document.querySelector('main script')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Edit with agent' }))
  expect(await screen.findByRole('heading', { name: 'Skill author' })).toBeInTheDocument()
})

it('opens memory markdown and edits with the memory curator', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  const sidebar = await screen.findByRole('complementary', { name: 'dev' })
  fireEvent.click(await within(sidebar).findByRole('button', { name: /OAuth callback decision/ }))
  expect(await screen.findByRole('tab', { name: /OAuth callback decision/ })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  expect(screen.getAllByRole('heading', { name: 'OAuth callback decision' })).toHaveLength(2)
  fireEvent.click(screen.getByRole('button', { name: 'Edit with agent' }))
  expect(await screen.findByRole('heading', { name: 'Memory curator' })).toBeInTheDocument()
})

it.each(['en', 'pt-br'] as const)(
  'streams the specialist reply without terminals in %s',
  async (locale) => {
    const source = createMockSource({ locale })
    for (const kind of ['skill', 'memory'] as const) {
      const events: import('../../src/renderer/src/shared/api').ReplyEvent[] = []
      source.streamReply(
        { featureId: 'authoring', role: 'research', prompt: 'Context', authoring: kind },
        (event) => events.push(event),
        { instant: true },
      )
      const text = events
        .filter((event) => event.type === 'text')
        .map((event) => event.chunk)
        .join('')
      expect(text).toContain(
        kind === 'skill'
          ? locale === 'en'
            ? 'author this skill'
            : 'escrever esta skill'
          : locale === 'en'
            ? 'curate this memory'
            : 'organizar esta memória',
      )
      expect(events.at(-1)).toEqual({ type: 'completed' })
      expect(events.some((event) => event.type === 'terminal')).toBe(false)
    }
  },
)

it('respects reduced motion when streaming authoring replies', () => {
  const source = createMockSource({ locale: 'en' })
  const stream = vi.spyOn(source, 'streamReply')
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: true })),
  )
  try {
    const store = createWorkbenchStore(source)
    store.getState().startAuthoring('skill', 'global')
    expect(stream).toHaveBeenCalledWith(expect.anything(), expect.any(Function), { instant: true })
    expect(store.getState().authoring?.running).toBe(false)
    expect(store.getState().authoring?.messages.at(-1)).toContain('author this skill')
  } finally {
    vi.unstubAllGlobals()
  }
})

it('ignores stale authoring events across sessions and projects', async () => {
  const callbacks: Array<(event: ReplyEvent) => void> = []
  const source: WorkbenchSource = {
    ...createMockSource({ locale: 'en' }),
    streamReply: (_request, onEvent) => {
      callbacks.push(onEvent)
      return () => {}
    },
  }
  const store = createWorkbenchStore(source)
  await store.getState().openProject('dev')
  store.getState().startAuthoring('skill', 'global')
  callbacks[0]({ type: 'text', chunk: 'First chunk' })
  callbacks[0]({ type: 'text', chunk: ' and second' })
  expect(store.getState().authoring?.messages.at(-1)).toBe('First chunk and second')
  store.getState().startAuthoring('memory', 'project')
  const replacement = store.getState().authoring
  callbacks[0]({ type: 'text', chunk: 'Stale reply' })
  callbacks[0]({ type: 'completed' })
  expect(store.getState().authoring).toBe(replacement)
  callbacks[1]({ type: 'completed' })
  expect(store.getState().authoring?.running).toBe(false)
  store.getState().sendAuthoring('Follow up')
  const followUp = store.getState().authoring
  callbacks[1]({ type: 'text', chunk: 'Stale follow up' })
  expect(store.getState().authoring).toBe(followUp)
  await store.getState().openProject('nandomoreira.dev')
  callbacks[2]({ type: 'text', chunk: 'Stale project' })
  callbacks[2]({ type: 'interrupted' })
  expect(store.getState().authoring).toBeNull()
})

it('refreshes cached skill markdown and metadata while preserving other documents', async () => {
  let revision = 1
  const source = createMockSource({
    locale: 'en',
    loadSkills: async () => [
      { id: 'example', name: `Example v${revision}`, markdown: `# Revision ${revision}` },
      ...(revision === 1 ? [{ id: 'removed', name: 'Removed', markdown: '# Removed' }] : []),
    ],
  })
  const store = createWorkbenchStore(source)
  await store.getState().openProject('dev')
  await store.getState().openDocument('library:skill:example')
  await store.getState().openDocument('library:skill:removed')
  const memoryId = `memory:${store.getState().memories[0].id}`
  await store.getState().openDocument(memoryId)
  const memory = store.getState().documents[memoryId]
  revision = 2
  await store.getState().refreshSkills('/skills')
  expect(store.getState().documents['library:skill:example']).toBeUndefined()
  expect(store.getState().documents['library:skill:removed']).toBeUndefined()
  expect(store.getState().libraryDocuments['library:skill:example']?.name).toBe('Example v2')
  expect(store.getState().libraryDocuments['library:skill:removed']).toBeUndefined()
  expect(store.getState().documents[memoryId]).toBe(memory)
  expect(store.getState().libraryDocuments[memoryId]?.kind).toBe('memory')
  await store.getState().openDocument('library:skill:example')
  expect(store.getState().documents['library:skill:example']).toBe('# Revision 2')
})

it('does not render an empty code block for blank frontmatter lines', () => {
  const { container } = render(
    <MarkdownPreview source={'---\nname: Example\n\ndescription: Summary\n---\n# Instructions'} />,
  )
  expect(screen.getByRole('cell', { name: 'Summary' })).toBeInTheDocument()
  expect(container.querySelector('pre')).toBeNull()
})

it('keeps library row and creation focus outlines inside clipped sections', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  const sidebar = await screen.findByRole('complementary', { name: 'dev' })
  for (const name of [/Skills/, /Memories/]) {
    const section = within(sidebar).getByRole('region', { name })
    for (const button of await within(section).findAllByRole('button')) {
      expect(button).toHaveClass('focus-visible:-outline-offset-2')
    }
  }
})

it('does not update the authoring conversation for a start event', () => {
  let emit: ((event: ReplyEvent) => void) | undefined
  const store = createWorkbenchStore({
    ...createMockSource({ locale: 'en' }),
    streamReply: (_request, onEvent) => {
      emit = onEvent
      return () => {}
    },
  })
  store.getState().startAuthoring('skill', 'project')
  const initial = store.getState().authoring
  emit?.({ type: 'start' })
  expect(store.getState().authoring).toBe(initial)
})
