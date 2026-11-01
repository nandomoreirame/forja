// @vitest-environment node
import { expect, it } from 'vitest'
import { formatDuration, formatMessageTime, formatTokens } from '../../src/shared/i18n'

const now = new Date(2026, 10, 1, 2, 40)

it('shows only the time for today and date plus time for other days', () => {
  expect(formatMessageTime(new Date(2026, 10, 1, 2, 36).toISOString(), 'pt-br', now)).toBe('02:36')
  expect(formatMessageTime(new Date(2026, 9, 31, 23, 47).toISOString(), 'pt-br', now)).toBe(
    '31 de out. · 23:47',
  )
  expect(formatMessageTime(new Date(2026, 9, 31, 23, 47).toISOString(), 'en', now)).toBe(
    'Oct 31 · 23:47',
  )
  expect(formatMessageTime('not a date', 'en', now)).toBe('')
})

it('formats token counts compactly per locale', () => {
  expect(formatTokens(202, 'en')).toBe('202')
  expect(formatTokens(4500, 'en')).toBe('4.5k')
  expect(formatTokens(4500, 'pt-br')).toBe('4,5k')
  expect(formatTokens(12000, 'pt-br')).toBe('12k')
})

it('formats response durations in seconds and minutes', () => {
  expect(formatDuration(400)).toBe('0s')
  expect(formatDuration(5_200)).toBe('5s')
  expect(formatDuration(65_000)).toBe('1m 5s')
})
