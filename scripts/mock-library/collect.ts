import { closeSync, openSync, readdirSync, readSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import type { MockLibrary } from '../../src/renderer/src/shared/api/mock-library'

function entries(path: string): string[] {
  try {
    return readdirSync(path).filter((name) => !name.startsWith('.'))
  } catch {
    return []
  }
}
function read(path: string): string | undefined {
  try {
    if (!statSync(path).isFile()) return undefined
    const descriptor = openSync(path, 'r')
    try {
      const buffer = Buffer.alloc(200_000 * 4)
      let length = 0
      while (length < buffer.length) {
        const count = readSync(descriptor, buffer, length, buffer.length - length, null)
        if (count === 0) break
        length += count
      }
      return buffer.toString('utf8', 0, length).slice(0, 200_000)
    } finally {
      closeSync(descriptor)
    }
  } catch {
    return undefined
  }
}
function field(markdown: string, key: string): string {
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(markdown)?.[1]
  const value =
    frontmatter
      ?.split(/\r?\n/)
      .find((line) => line.startsWith(`${key}:`))
      ?.slice(key.length + 1)
      .trim() ?? ''
  return value
    .replace(/\s+#.*$/, '')
    .replace(/^(['"])(.*)\1$/, '$2')
    .trim()
}
export function collectMockLibrary({ repoRoot }: { repoRoot: string }): MockLibrary {
  const documents: MockLibrary['documents'] = []
  const specs = join(repoRoot, 'docs/specs')
  const state = (slug: string): 'approved' | 'draft' =>
    field(read(join(specs, slug, 'STATE.md')) ?? '', 'approved_at') ? 'approved' : 'draft'
  for (const slug of entries(specs)) {
    const markdown = read(join(specs, slug, 'SPEC.md'))
    if (markdown !== undefined)
      documents.push({ slug, kind: 'spec', name: `${slug}/SPEC.md`, markdown, state: state(slug) })
  }
  const plans = join(repoRoot, 'docs/plans')
  const seenPlans = new Set<string>()
  for (const file of entries(plans).sort().reverse()) {
    const slug = /^\d{4}-\d{2}-\d{2}-(.+)\.md$/.exec(file)?.[1]
    if (!slug || seenPlans.has(slug)) continue
    seenPlans.add(slug)
    const markdown = read(join(plans, file))
    if (markdown !== undefined)
      documents.push({ slug, kind: 'plan', name: `${slug}/PLAN.md`, markdown, state: state(slug) })
  }
  return { documents: documents.sort((a, b) => a.name.localeCompare(b.name)) }
}

export function readSkills(root: string): { id: string; name: string; markdown: string }[] {
  const directory = resolve(root.replace(/^~(?=\/|$)/, homedir()))
  const skills: { id: string; name: string; markdown: string }[] = []
  for (const id of entries(directory)) {
    try {
      if (!statSync(join(directory, id)).isDirectory()) continue
      const markdown = read(join(directory, id, 'SKILL.md'))
      if (markdown !== undefined) skills.push({ id, name: field(markdown, 'name') || id, markdown })
    } catch {
      // Ignore unavailable or dangling skill directories.
    }
  }
  return skills.sort((a, b) => a.id.localeCompare(b.id))
}
