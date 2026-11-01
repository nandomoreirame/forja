import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { expect, it } from 'vitest'

// Terminal Noir surface.base (terminalnoir.web.app): windows and editors.
const surfaceBase = '#0b0b0c'

it('uses Terminal Noir surface.base as the app background', () => {
  const theme = readFileSync('src/shared/styles/theme.css', 'utf8')
  expect(theme).toMatch(new RegExp(`--background: ${surfaceBase};`))
})

it('leaves no hardcoded copy of the old background in the app', () => {
  // git grep exits 1 when nothing matches.
  const hits = spawnSync('git', ['grep', '-il', '--untracked', '#0e0e0e', '--', 'src'], {
    encoding: 'utf8',
  })
  expect(hits.stdout).toBe('')
})
