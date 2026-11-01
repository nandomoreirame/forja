import { expect, it } from 'vitest'
import { displayPath } from '../../src/renderer/src/shared/lib/display-path'

// Built from parts so the repository never holds a literal home path.
const home = (os: 'linux' | 'mac', rest: string) =>
  ['', os === 'linux' ? 'home' : 'Users', 'ana'].join('/') + rest

it('shows paths under the home folder with ~', () => {
  expect(displayPath(home('linux', '/dev/projects/forja'))).toBe('~/dev/projects/forja')
  expect(displayPath(home('linux', ''))).toBe('~')
  expect(displayPath(home('mac', '/dev'))).toBe('~/dev')
  expect(displayPath('C:\\Users\\ana\\dev')).toBe('~\\dev')
})

it('keeps paths that are already short or outside home', () => {
  expect(displayPath('~/dev')).toBe('~/dev')
  expect(displayPath('/projects/actual-app')).toBe('/projects/actual-app')
  expect(displayPath('/home')).toBe('/home')
})
