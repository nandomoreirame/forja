// @vitest-environment node
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { expect, it } from 'vitest'

const root = join(__dirname, '..', '..')
const browserRoots = ['site/src', 'src/shared', 'src/widgets']
const forbidden =
  /(['"])(node:[^'"]+|electron|electron\/[^'"]*|[^'"]*\/core(\/[^'"]*)?|[^'"]*\/preload(\/[^'"]*)?|[^'"]*\/main(\/[^'"]*)?)\1/

function sourceFiles(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.tsx?$/.test(name) ? [path] : []
  })
}

it('keeps browser-only modules free of Node, Electron, core and preload imports', () => {
  const offenders = browserRoots
    .flatMap((dir) => sourceFiles(join(root, dir)))
    .flatMap((file) => {
      const lines = readFileSync(file, 'utf8').split('\n')
      return lines
        .filter((line) => /^\s*(import|export)\b.*from\s/.test(line) || /^\s*import\(/.test(line))
        .filter((line) => forbidden.test(line))
        .map((line) => `${relative(root, file)}: ${line.trim()}`)
    })
  expect(offenders).toEqual([])
})
