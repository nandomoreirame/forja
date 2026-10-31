// @vitest-environment node
import { expect, it } from 'vitest'
import { effortOptions, inactivityError, isDirty, normalizeProfile } from '../../src/renderer/src/features/agent-settings/model'

const saved = {
  role: 'implementer',
  tool: 'codex',
  model: '',
  effort: 'default',
  instructions: '',
  skills: ['rpi-implement'],
  autoInvoke: false,
} as const

it('normalizes blanks, detects edits and limits effort to supported tools', () => {
  expect(normalizeProfile({ ...saved, model: '  ' }).model).toBeUndefined()
  expect(isDirty(saved, { ...saved })).toBe(false)
  expect(isDirty(saved, { ...saved, skills: ['rpi-implement', 'git'] })).toBe(true)
  expect(effortOptions('codex')).toContain('high')
  expect(effortOptions('grok')).toEqual(['default'])
})

it('rejects inactivity values outside the supported range', () => {
  expect(inactivityError(0)).toBeTruthy()
  expect(inactivityError(121)).toBeTruthy()
  expect(inactivityError(60)).toBeUndefined()
})
