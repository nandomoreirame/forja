// @vitest-environment node
import * as fs from 'node:fs'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, it, vi } from 'vitest'
import { collectMockLibrary, readSkills } from '../scripts/mock-library/collect'

vi.mock('node:fs', { spy: true })

const roots: string[] = []
afterEach(() => roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true })))
it('collects sorted real documents and one-level skills with approval and size limits', () => {
  const root = mkdtempSync(join(tmpdir(), 'forja-library-'))
  roots.push(root)
  const put = (path: string, text: string) => {
    const target = join(root, path)
    mkdirSync(join(target, '..'), { recursive: true })
    writeFileSync(target, text)
  }
  put('docs/specs/z/SPEC.md', 'z'.repeat(200_001))
  put('docs/specs/z/STATE.md', '---\napproved_at: ""\n---')
  put('docs/specs/a/SPEC.md', '# Approved')
  put('docs/specs/a/STATE.md', '---\napproved_at: 2026-10-31\n---')
  put('docs/plans/2026-10-31-a.md', '# Plan')
  put('docs/plans/undated.md', 'skip')
  put('skills/nested/child/SKILL.md', 'skip')
  put('skills/other/README.md', 'skip')
  put('docs/plans/README.md', 'skip')
  put('docs/plans/VALIDATION.md', 'skip')
  put('docs/plans/requirement-map.md', 'skip')
  put('skills/named/SKILL.md', '---\nname: "A skill"\n---\n# Skill')
  put('skills/.hidden/SKILL.md', 'skip')
  put('external/SKILL.md', 's'.repeat(200_001))
  symlinkSync(join(root, 'external'), join(root, 'skills', 'linked'))
  const library = collectMockLibrary({ repoRoot: root })
  expect(library.documents.map(({ name, state }) => ({ name, state }))).toEqual([
    { name: 'a/PLAN.md', state: 'approved' },
    { name: 'a/SPEC.md', state: 'approved' },
    { name: 'z/SPEC.md', state: 'draft' },
  ])
  expect(library.documents[2].markdown).toHaveLength(200_000)
  const skills = readSkills(join(root, 'skills'))
  expect(skills.map(({ id, name }) => ({ id, name }))).toEqual([
    { id: 'linked', name: 'linked' },
    { id: 'named', name: 'A skill' },
  ])
  expect(skills[0].markdown).toHaveLength(200_000)
  expect(readSkills(join(root, 'missing'))).toEqual([])
  expect(Object.keys(library)).toEqual(['documents'])
})

it('serves skills only to loopback clients through dev middleware', async () => {
  const { mockLibrary } = await import('../scripts/mock-library/vite-plugin')
  const root = mkdtempSync(join(tmpdir(), 'forja-middleware-'))
  roots.push(root)
  mkdirSync(join(root, 'example'))
  writeFileSync(join(root, 'example/SKILL.md'), '# Example')
  const plugin = mockLibrary()
  let handler: import('vite').Connect.NextHandleFunction | undefined
  const configure = plugin.configureServer as (server: unknown) => void
  configure({
    middlewares: {
      use: (value: typeof handler) => {
        handler = value
      },
    },
    watcher: { add: () => {}, on: () => {} },
  })
  for (const address of ['127.0.0.1', '::1', '::ffff:127.0.0.1', '192.168.1.2']) {
    const end = vi.fn()
    const response = {
      statusCode: 200,
      setHeader: () => {},
      end: (body: string) => {
        end(body)
        expect(response.statusCode).toBe(address === '192.168.1.2' ? 403 : 200)
        if (response.statusCode === 200)
          expect(JSON.parse(body)).toEqual([
            { id: 'example', name: 'example', markdown: '# Example' },
          ])
      },
    }
    expect(handler).toBeTypeOf('function')
    handler!(
      {
        url: '/__forja/skills?root=' + encodeURIComponent(root),
        method: 'GET',
        socket: { remoteAddress: address },
        headers: {},
      } as never,
      response as never,
      () => {
        throw new Error('Unexpected next')
      },
    )
    expect(end).toHaveBeenCalledOnce()
  }
})

async function middleware() {
  const { mockLibrary } = await import('../scripts/mock-library/vite-plugin')
  let handler!: import('vite').Connect.NextHandleFunction
  const configure = mockLibrary().configureServer as (server: unknown) => void
  configure({
    middlewares: {
      use: (value: typeof handler) => {
        handler = value
      },
    },
    watcher: { add: () => {}, on: () => {} },
  })
  return (url: string, headers: Record<string, string> = {}, address = '127.0.0.1') => {
    const response = { statusCode: 200, setHeader: vi.fn(), end: vi.fn() }
    const next = vi.fn()
    handler(
      {
        url,
        method: 'GET',
        headers: { host: 'localhost:5173', ...headers },
        socket: { remoteAddress: address },
      } as never,
      response as never,
      next,
    )
    return { response, next }
  }
}

it.each([
  [{ 'sec-fetch-site': 'cross-site' }, 403],
  [{ 'sec-fetch-site': 'same-site' }, 403],
  [{ origin: 'https://foreign.example' }, 403],
  [{ 'sec-fetch-site': 'same-origin' }, 200],
  [{ 'sec-fetch-site': 'none' }, 200],
  [{ origin: 'http://localhost:5173' }, 200],
  [{}, 200],
] as [Record<string, string>, number][])(
  'checks browser request provenance %j',
  async (headers, status) => {
    const invoke = await middleware()
    expect(invoke('/__forja/skills', headers).response.statusCode).toBe(status)
  },
)

it.each(['127.0.0.2', '::ffff:127.0.0.2'])('rejects noncanonical loopback %s', async (address) => {
  const invoke = await middleware()
  expect(invoke('/__forja/skills', {}, address).response.statusCode).toBe(403)
})

it('rejects relative skill roots', async () => {
  const invoke = await middleware()
  expect(invoke('/__forja/skills?root=relative').response.statusCode).toBe(400)
})

it('delegates unrelated and malformed URLs without parsing unrelated requests', async () => {
  const invoke = await middleware()
  const OriginalURL = URL
  const parse = vi.fn(function (value: string, base: string) {
    return new OriginalURL(value, base)
  })
  vi.stubGlobal('URL', parse)
  try {
    expect(invoke('/@vite/client').next).toHaveBeenCalledOnce()
    expect(parse).not.toHaveBeenCalled()
    expect(() => invoke('/__forja/skills', {})).not.toThrow()
    parse.mockImplementation(() => {
      throw new TypeError('Invalid URL')
    })
    expect(invoke('/__forja/skills').next).toHaveBeenCalledOnce()
  } finally {
    vi.unstubAllGlobals()
  }
})

it('reads only regular files with bounded IO before truncating decoded characters', () => {
  const root = mkdtempSync(join(tmpdir(), 'forja-bounded-'))
  roots.push(root)
  mkdirSync(join(root, 'large'))
  mkdirSync(join(root, 'directory', 'SKILL.md'), { recursive: true })
  writeFileSync(join(root, 'large/SKILL.md'), '😀'.repeat(500_000))
  const wholeRead = vi.spyOn(fs, 'readFileSync')
  const open = vi.spyOn(fs, 'openSync')
  const boundedRead = vi.spyOn(fs, 'readSync')
  try {
    expect(readSkills(root)).toEqual([
      { id: 'large', name: 'large', markdown: '😀'.repeat(100_000) },
    ])
    expect(wholeRead).not.toHaveBeenCalled()
    expect(open.mock.calls.some(([path]) => path === join(root, 'directory/SKILL.md'))).toBe(false)
    expect(boundedRead).toHaveBeenCalled()
    for (const call of boundedRead.mock.calls)
      expect((call[1] as Buffer).byteLength).toBeLessThanOrEqual(800_000)
  } finally {
    vi.restoreAllMocks()
  }
})

it('keeps only the latest dated plan for each slug', () => {
  const root = mkdtempSync(join(tmpdir(), 'forja-plans-'))
  roots.push(root)
  mkdirSync(join(root, 'docs/plans'), { recursive: true })
  writeFileSync(join(root, 'docs/plans/2026-10-01-example.md'), 'Old')
  writeFileSync(join(root, 'docs/plans/2026-10-31-example.md'), 'New')
  expect(collectMockLibrary({ repoRoot: root }).documents).toEqual([
    { slug: 'example', kind: 'plan', name: 'example/PLAN.md', markdown: 'New', state: 'draft' },
  ])
})
