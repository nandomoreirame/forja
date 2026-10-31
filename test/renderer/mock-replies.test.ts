// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest'
import { createMockSource, roleIds, type ReplyEvent } from '../../src/renderer/src/shared/api'

afterEach(() => vi.useRealTimers())
const request = { featureId: 'f1', role: 'implementer' as const, prompt: 'Fix the token' }

it('streams chunks in order, adds terminal output for the Implementer and supports cancel', () => {
  vi.useFakeTimers()
  const events: ReplyEvent[] = []
  const cancel = createMockSource({ locale: 'en' }).streamReply(request, (event) =>
    events.push(event),
  )
  expect(events).toEqual([{ type: 'start' }])
  vi.advanceTimersByTime(400)
  expect(events.map((e) => e.type)).toContain('text')
  expect(events.map((e) => e.type)).toContain('terminal')
  const beforeCancel = events.length
  cancel()
  cancel()
  vi.advanceTimersByTime(5000)
  expect(events).toHaveLength(beforeCancel + 1)
  expect(events.at(-1)).toEqual({ type: 'interrupted' })
  expect(events.filter((e) => e.type === 'completed')).toHaveLength(0)
  expect(vi.getTimerCount()).toBe(0)
})

it.each(['en', 'pt-br'] as const)(
  'provides every role script in %s with identical instant and streamed events',
  (locale) => {
    vi.useFakeTimers()
    const source = createMockSource({ locale })
    for (const role of roleIds) {
      const streamed: ReplyEvent[] = []
      const instant: ReplyEvent[] = []
      const schedule = vi.fn((callback: () => void, delay: number) => setTimeout(callback, delay))
      const cancel = source.streamReply({ ...request, role }, (e) => streamed.push(e), {
        setTimeout: schedule,
        clearTimeout,
      })
      expect(streamed).toEqual([{ type: 'start' }])
      expect(schedule).toHaveBeenCalled()
      vi.advanceTimersByTime(2000)
      expect(streamed.at(-1)).toEqual({ type: 'completed' })
      const cancelInstant = source.streamReply({ ...request, role }, (e) => instant.push(e), {
        instant: true,
      })
      expect(instant).toEqual(streamed)
      const chunks = instant.flatMap((e) => (e.type === 'text' ? [e.chunk] : []))
      expect(chunks.length).toBeGreaterThan(1)
      expect(chunks.join('')).toMatch(
        locale === 'en' ? /mock|scope|tasks|finding/ : /simulad|escopo|tarefas|achado/,
      )
      const terminals = instant.filter((e) => e.type === 'terminal')
      expect(terminals.length > 0).toBe(role === 'implementer' || role === 'tester')
      for (const event of terminals) {
        expect(event.terminalId).toContain(request.featureId)
        expect(event.line).toBeTruthy()
      }
      const count = streamed.length
      cancel()
      cancelInstant()
      vi.runAllTimers()
      expect(streamed).toHaveLength(count)
      expect(instant).toEqual(streamed)
    }
  },
)
