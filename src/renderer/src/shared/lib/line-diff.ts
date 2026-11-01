export type DiffLine = { n: number; text: string }
export type DiffRow =
  | { kind: 'same' | 'changed'; left: DiffLine; right: DiffLine }
  | { kind: 'removed'; left: DiffLine; right: null }
  | { kind: 'added'; left: null; right: DiffLine }
export type LineDiff = DiffRow[] | { kind: 'too-large' }

/** Each version may contain at most 3000 lines, bounding the quadratic LCS table. */
export function sideBySide(base: string, working: string): LineDiff {
  const left = base === '' ? [] : base.split('\n')
  const right = working === '' ? [] : working.split('\n')
  if (left.length > 3000 || right.length > 3000) return { kind: 'too-large' }

  const lcs = Array.from({ length: left.length + 1 }, () => new Uint16Array(right.length + 1))
  for (let i = left.length - 1; i >= 0; i--) {
    for (let j = right.length - 1; j >= 0; j--) {
      lcs[i][j] =
        left[i] === right[j] ? 1 + lcs[i + 1][j + 1] : Math.max(lcs[i + 1][j], lcs[i][j + 1])
    }
  }

  const rows: DiffRow[] = []
  let i = 0
  let j = 0
  while (i < left.length || j < right.length) {
    if (i < left.length && j < right.length && left[i] === right[j]) {
      rows.push({
        kind: 'same',
        left: { n: i + 1, text: left[i] },
        right: { n: j + 1, text: right[j] },
      })
      i++
      j++
      continue
    }

    const removed: DiffLine[] = []
    const added: DiffLine[] = []
    while (i < left.length || j < right.length) {
      if (i < left.length && j < right.length && left[i] === right[j]) break
      if (i < left.length && (j === right.length || lcs[i + 1][j] >= lcs[i][j + 1])) {
        removed.push({ n: i + 1, text: left[i++] })
      } else {
        added.push({ n: j + 1, text: right[j++] })
      }
    }
    for (let k = 0; k < Math.max(removed.length, added.length); k++) {
      if (k < removed.length && k < added.length) {
        rows.push({ kind: 'changed', left: removed[k], right: added[k] })
      } else if (k < removed.length) {
        rows.push({ kind: 'removed', left: removed[k], right: null })
      } else {
        rows.push({ kind: 'added', left: null, right: added[k] })
      }
    }
  }
  return rows
}
