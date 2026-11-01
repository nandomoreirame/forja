import { expect, it } from 'vitest'
import { sideBySide } from '../../src/renderer/src/shared/lib/line-diff'

it('pairs unchanged, removed and added lines for a side-by-side view', () => {
  expect(sideBySide('a\nb\nc', 'a\nB\nc\nd')).toEqual([
    { left: { n: 1, text: 'a' }, right: { n: 1, text: 'a' }, kind: 'same' },
    { left: { n: 2, text: 'b' }, right: { n: 2, text: 'B' }, kind: 'changed' },
    { left: { n: 3, text: 'c' }, right: { n: 3, text: 'c' }, kind: 'same' },
    { left: null, right: { n: 4, text: 'd' }, kind: 'added' },
  ])
})

it('shows an untracked file as added lines', () => {
  expect(sideBySide('', 'a\nb')).toEqual([
    { left: null, right: { n: 1, text: 'a' }, kind: 'added' },
    { left: null, right: { n: 2, text: 'b' }, kind: 'added' },
  ])
})

it('shows a deleted file as removed lines', () => {
  expect(sideBySide('a\nb', '')).toEqual([
    { left: { n: 1, text: 'a' }, right: null, kind: 'removed' },
    { left: { n: 2, text: 'b' }, right: null, kind: 'removed' },
  ])
})

it.each(['base', 'working'])('rejects an oversized %s before computing the diff', (side) => {
  const large = Array(3001).fill('x').join('\n')
  expect(sideBySide(side === 'base' ? large : '', side === 'working' ? large : '')).toEqual({
    kind: 'too-large',
  })
})

it('pairs only edits within the same hunk and preserves independent line numbers', () => {
  expect(sideBySide('old\nextra\nanchor\nend', 'new\nanchor\ninsert\nend')).toEqual([
    { left: { n: 1, text: 'old' }, right: { n: 1, text: 'new' }, kind: 'changed' },
    { left: { n: 2, text: 'extra' }, right: null, kind: 'removed' },
    { left: { n: 3, text: 'anchor' }, right: { n: 2, text: 'anchor' }, kind: 'same' },
    { left: null, right: { n: 3, text: 'insert' }, kind: 'added' },
    { left: { n: 4, text: 'end' }, right: { n: 4, text: 'end' }, kind: 'same' },
  ])
})

it('keeps repeated lines aligned by their longest common subsequence', () => {
  expect(sideBySide('a\nb\na', 'b\na\nb')).toEqual([
    { left: { n: 1, text: 'a' }, right: null, kind: 'removed' },
    { left: { n: 2, text: 'b' }, right: { n: 1, text: 'b' }, kind: 'same' },
    { left: { n: 3, text: 'a' }, right: { n: 2, text: 'a' }, kind: 'same' },
    { left: null, right: { n: 3, text: 'b' }, kind: 'added' },
  ])
})

it('preserves blank lines including a trailing newline', () => {
  expect(sideBySide('a\n', 'a\n\n')).toEqual([
    { left: { n: 1, text: 'a' }, right: { n: 1, text: 'a' }, kind: 'same' },
    { left: { n: 2, text: '' }, right: { n: 2, text: '' }, kind: 'same' },
    { left: null, right: { n: 3, text: '' }, kind: 'added' },
  ])
})

it('accepts exactly 3000 lines', () => {
  const text = Array(3000).fill('x').join('\n')
  expect(sideBySide(text, text)).toHaveLength(3000)
})

it('returns no rows for two empty files', () => {
  expect(sideBySide('', '')).toEqual([])
})
