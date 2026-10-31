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
              usedPercent: 85,
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
  expect(screen.getByText('85%')).toHaveAttribute('data-tone', 'danger')
})

it('offers refresh and close actions when handlers are given', () => {
  const onRefresh = vi.fn()
  const onClose = vi.fn()
  render(
    <UsageLimits
      title="AI usage"
      usage={[...usage]}
      unavailableLabel="Unavailable"
      onRefresh={onRefresh}
      onClose={onClose}
      refreshLabel="Refresh"
      closeLabel="Close"
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))
  fireEvent.click(screen.getByRole('button', { name: 'Close' }))
  expect(onRefresh).toHaveBeenCalledOnce()
  expect(onClose).toHaveBeenCalledOnce()
})
