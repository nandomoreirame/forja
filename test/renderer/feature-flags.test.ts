import { afterEach, expect, expectTypeOf, it, vi } from 'vitest'
import {
  flagDefaults,
  isEnabled,
  overrideFlags,
  type FeatureFlag,
} from '../../src/renderer/src/shared/lib/feature-flags'

afterEach(() => {
  overrideFlags({})
  vi.unstubAllEnvs()
})

it('turns unfinished features off in production and on in development', () => {
  expect(flagDefaults({ PROD: true, DEV: false })).toEqual({
    explorer: false,
    'source-control': false,
    'backlog-board': false,
  })
  expect(flagDefaults({ PROD: false, DEV: true })).toEqual({
    explorer: true,
    'source-control': true,
    'backlog-board': true,
  })
  overrideFlags({ explorer: false })
  expect(isEnabled('explorer')).toBe(false)
})

it('uses Vite defaults and replaces test overrides when reset', () => {
  vi.stubEnv('PROD', true)
  expect(isEnabled('source-control')).toBe(false)
  overrideFlags({ 'source-control': true })
  expect(isEnabled('source-control')).toBe(true)
  overrideFlags({})
  expect(isEnabled('source-control')).toBe(false)
  vi.stubEnv('PROD', false)
  expect(isEnabled('backlog-board')).toBe(true)
})

it('keeps mock defaults on without reading viewer storage', () => {
  localStorage.setItem('explorer', 'false')
  try {
    expect(flagDefaults({}).explorer).toBe(true)
    vi.stubEnv('PROD', true)
    localStorage.setItem('explorer', 'true')
    expect(isEnabled('explorer')).toBe(false)
  } finally {
    localStorage.removeItem('explorer')
  }
})

it('accepts only registered flag names', () => {
  expectTypeOf<FeatureFlag>().toEqualTypeOf<'explorer' | 'source-control' | 'backlog-board'>()
  // @ts-expect-error Unknown flags are not part of the public contract.
  isEnabled('unknown')
  // @ts-expect-error Overrides must use registered flag names.
  overrideFlags({ unknown: true })
})
