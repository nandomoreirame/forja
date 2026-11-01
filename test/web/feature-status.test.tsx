import { act, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { FeatureStatus, statusGlyph } from '../../src/shared/ui/feature-status'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

it('maps each feature state to a distinct glyph and an animated spinner while working', () => {
  expect(
    ['waiting', 'done', 'idle', 'interrupted', 'failed', 'ended'].map((state) =>
      statusGlyph(state as never),
    ),
  ).toEqual(['‖', '✔', '●', '↻', '✗', '×'])
  const { container } = render(<FeatureStatus state="working" label="Running" />)
  expect(container.querySelector('[data-spinning="true"]')).not.toBeNull()
  expect(screen.getByRole('img', { name: 'Running' })).toBeInTheDocument()
})

it('advances the braille spinner every 80 ms and cleans up on unmount', () => {
  vi.useFakeTimers()
  const { unmount } = render(<FeatureStatus state="working" label="Running" />)
  expect(screen.getByRole('img')).toHaveTextContent('⠋')
  act(() => vi.advanceTimersByTime(80))
  expect(screen.getByRole('img')).toHaveTextContent('⠙')
  unmount()
  expect(vi.getTimerCount()).toBe(0)
})

it('renders a static glyph without a timer under reduced motion', () => {
  vi.useFakeTimers()
  vi.stubGlobal('matchMedia', (query: string) => ({
    media: query,
    matches: true,
    addEventListener() {},
    removeEventListener() {},
  }))
  const { container } = render(<FeatureStatus state="working" label="Running" />)
  expect(screen.getByRole('img')).toHaveTextContent('⠿')
  expect(container.querySelector('[data-spinning="true"]')).toBeNull()
  expect(vi.getTimerCount()).toBe(0)
})

import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'
import type { FeatureSnapshot } from '../../src/renderer/src/shared/api'

it.each([
  [{ state: 'running' }, '⠋', 'Running', 'Running'],
  [{ state: 'waiting' }, '‖', 'Awaiting approval', 'Awaiting approval'],
  [{ state: 'running', stalled: true }, '‖', 'Stalled', 'Stalled'],
  [{ state: 'completed' }, '✔', 'Idle', 'Completed'],
  [{ state: 'idle' }, '●', 'Idle', 'Idle'],
  [{ state: 'draft' }, '●', 'Idle', 'Ready'],
  [{ state: 'interrupted' }, '↻', 'Idle', 'Interrupted'],
  [{ state: 'failed' }, '✗', 'Needs fix', 'Failed'],
  [{ state: 'completed', endState: 'integrated' }, '✔', 'Integrated', 'Integrated'],
  [{ state: 'interrupted', endState: 'abandoned' }, '×', 'Abandoned', 'Abandoned'],
] as const)(
  'keeps fixed glyph columns and state wording in rows and tabs for %j',
  async (patch, glyph, rowLabel, tabLabel) => {
    const source = createMockSource({ locale: 'en' })
    const load = source.loadProject.bind(source)
    source.loadProject = async (id) => {
      const snapshot = await load(id)
      Object.assign(snapshot.features[0], patch as Partial<FeatureSnapshot>)
      return snapshot
    }
    render(<WorkbenchPage source={source} initialProjectId="dev" />)
    const tab = await screen.findByRole('tab', { name: /Login with OAuth/ })
    const row = screen.getByRole('button', { name: new RegExp('^Login with OAuth .*' + rowLabel) })
    for (const parent of [row, tab]) {
      const status = parent.querySelector('[data-feature-status]')
      expect(status).toHaveTextContent(glyph)
      expect(status).toHaveStyle({ width: '12px', minWidth: '12px', maxWidth: '12px' })
      expect(within(parent).getByRole('img', { name: tabLabel })).toBeInTheDocument()
    }
  },
)
