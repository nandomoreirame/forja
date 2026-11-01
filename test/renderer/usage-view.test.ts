import { expect, it } from 'vitest'
import { toUsageViews } from '../../src/renderer/src/features/usage/usage-view'
import type { ToolUsage } from '../../src/renderer/src/shared/api'

const now = new Date('2026-11-01T12:00:00.000Z')
const at = (minutes: number) => new Date(now.getTime() + minutes * 60_000).toISOString()
const usage: ToolUsage[] = [
  {
    tool: 'claude',
    plan: 'Pro',
    account: 'dev@example.com',
    fetchedAt: at(0),
    windows: [
      { id: 'session', usedPercent: 71, pacePercent: 50, resetsAt: at(149) },
      { id: 'week', usedPercent: 30, pacePercent: 31, resetsAt: at(5 * 1440 + 120) },
    ],
  },
  {
    tool: 'codex',
    fetchedAt: at(-5),
    windows: [{ id: 'week', usedPercent: 10, pacePercent: 30, resetsAt: at(30) }],
  },
  { tool: 'opencode', windows: [] },
]

it('formats structured usage like the AIBar in Portuguese', () => {
  const [claude, codex, opencode] = toUsageViews(usage, 'pt-br', now)
  expect(claude).toMatchObject({ plan: 'Pro', updatedLabel: 'atualizado agora' })
  expect(claude.windows[0]).toMatchObject({
    label: 'Sessão (5h)',
    usedPercent: 71,
    pacePercent: 50,
    resetLabel: 'reinicia em 2h29m',
    paceLabel: '21 pts à frente',
  })
  expect(claude.windows[1]).toMatchObject({
    label: 'Semanal',
    resetLabel: 'reinicia em 5d2h',
    paceLabel: 'no ritmo',
  })
  expect(codex.updatedLabel).toBe('atualizado há 5 min')
  expect(codex.windows[0]).toMatchObject({
    resetLabel: 'reinicia em 30m',
    paceLabel: '20 pts atrás',
  })
  expect(opencode.windows).toEqual([])
})

it('formats the same usage in English', () => {
  const [claude, codex] = toUsageViews(usage, 'en', now)
  expect(claude.updatedLabel).toBe('updated now')
  expect(claude.windows.map((w) => [w.label, w.resetLabel, w.paceLabel])).toEqual([
    ['Session (5h)', 'resets in 2h29m', '21 pts ahead'],
    ['Weekly', 'resets in 5d2h', 'on pace'],
  ])
  expect(codex.updatedLabel).toBe('updated 5 min ago')
  expect(codex.windows[0].paceLabel).toBe('20 pts behind')
})

it('shows an elapsed reset as now and omits a missing fetch time', () => {
  const [view] = toUsageViews(
    [
      {
        tool: 'grok',
        windows: [{ id: 'session', usedPercent: 5, pacePercent: 99, resetsAt: at(-3) }],
      },
    ],
    'en',
    now,
  )
  expect(view.updatedLabel).toBeUndefined()
  expect(view.windows[0].resetLabel).toBe('resets now')
})

it('drops the reset text when the reset time is missing or invalid, never showing NaN', () => {
  const [view] = toUsageViews(
    [
      {
        tool: 'claude',
        fetchedAt: 'not a date',
        windows: [{ id: 'session', usedPercent: 35, pacePercent: 30, resetsAt: 'invalid' }],
      },
    ],
    'pt-br',
    now,
  )
  expect(view.updatedLabel).toBeUndefined()
  expect(view.windows[0].resetLabel).toBe('')
  expect(JSON.stringify(view)).not.toContain('NaN')
})
