import { fireEvent, render, screen, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { UsageLimits } from '../../src/widgets/usage'
const usage = [
  {
    tool: 'claude',
    plan: 'Pro',
    account: 'dev@example.com',
    updatedLabel: 'updated now',
    windows: [
      {
        id: 'session',
        label: 'Session (5h)',
        usedPercent: 35,
        pacePercent: 30,
        resetLabel: 'resets in 3h16m',
        paceLabel: 'on pace',
      },
      {
        id: 'week',
        label: 'Weekly',
        usedPercent: 11,
        pacePercent: 20,
        resetLabel: 'resets in 6d5h',
        paceLabel: 'on pace',
      },
    ],
  },
  {
    tool: 'codex',
    plan: 'Plus',
    account: 'dev@example.com',
    updatedLabel: 'updated 2 min ago',
    windows: [],
  },
] as const
it('shows one tab per tool with session and weekly meters, and unavailable usage', () => {
  render(
    <UsageLimits
      title="AI usage"
      usage={[...usage]}
      unavailableLabel="Usage unavailable for this tool"
    />,
  )
  expect(screen.getByRole('tab', { name: 'Claude' })).toHaveAttribute('aria-selected', 'true')
  const session = screen.getByRole('meter', { name: 'Session (5h)' })
  expect(session).toHaveAttribute('aria-valuenow', '35')
  expect(within(session.closest('section')!).getByText(/resets in 3h16m/)).toBeInTheDocument()
  expect(screen.getByRole('meter', { name: 'Weekly' })).toHaveAttribute('aria-valuenow', '11')
  fireEvent.click(screen.getByRole('tab', { name: 'Codex' }))
  expect(screen.getByText('Usage unavailable for this tool')).toBeInTheDocument()
  expect(screen.queryByRole('meter')).toBeNull()
})

it('clamps percentages and marks high usage with the danger tone', () => {
  render(
    <UsageLimits
      title="AI usage"
      unavailableLabel="Usage unavailable for this tool"
      usage={[
        {
          tool: 'grok',
          windows: [
            {
              id: 'session',
              label: 'Session (5h)',
              usedPercent: 140,
              pacePercent: -5,
              resetLabel: 'resets in 1h',
              paceLabel: 'ahead of pace',
            },
            {
              id: 'week',
              label: 'Weekly',
              usedPercent: 92,
              pacePercent: 60,
              resetLabel: 'resets in 2d',
              paceLabel: 'ahead of pace',
            },
          ],
        },
      ]}
    />,
  )
  expect(screen.getByRole('meter', { name: 'Session (5h)' })).toHaveAttribute(
    'aria-valuenow',
    '100',
  )
  // Like the AIBar, bars stay amber until 90% and turn destructive from there.
  expect(screen.getByText('92%')).toHaveAttribute('data-tone', 'danger')
})

it('keeps usage under 90% in the accent tone', () => {
  render(<UsageLimits title="AI usage" usage={[...usage]} unavailableLabel="Unavailable" />)
  expect(screen.getByText('35%')).toHaveAttribute('data-tone', 'accent')
})

it('offers refresh, settings and close actions when handlers are given', () => {
  const onRefresh = vi.fn()
  const onClose = vi.fn()
  const onSettings = vi.fn()
  render(
    <UsageLimits
      title="AI usage"
      usage={[...usage]}
      unavailableLabel="Unavailable"
      onRefresh={onRefresh}
      onClose={onClose}
      onSettings={onSettings}
      refreshLabel="Refresh"
      settingsLabel="Usage settings"
      closeLabel="Close"
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))
  fireEvent.click(screen.getByRole('button', { name: 'Usage settings' }))
  fireEvent.click(screen.getByRole('button', { name: 'Close' }))
  expect(onRefresh).toHaveBeenCalledOnce()
  expect(onSettings).toHaveBeenCalledOnce()
  expect(onClose).toHaveBeenCalledOnce()
})

it('lets the tool tabs wrap instead of clipping a second row', () => {
  render(<UsageLimits title="AI usage" usage={[...usage]} unavailableLabel="Unavailable" />)
  const list = screen.getByRole('tablist', { name: 'AI usage' })
  expect(list).toHaveClass('flex-wrap', 'group-data-horizontal/tabs:h-auto', 'justify-start')
})

it('shows only the pace when there is no reset text', () => {
  render(
    <UsageLimits
      title="AI usage"
      unavailableLabel="Unavailable"
      usage={[
        {
          tool: 'claude',
          windows: [
            {
              id: 'session',
              label: 'Session (5h)',
              usedPercent: 35,
              pacePercent: 30,
              resetLabel: '',
              paceLabel: 'on pace',
            },
          ],
        },
      ]}
    />,
  )
  const card = screen.getByRole('meter', { name: 'Session (5h)' }).closest('section')!
  expect(within(card).getByText('on pace')).toBeInTheDocument()
  expect(card).not.toHaveTextContent('·')
})
