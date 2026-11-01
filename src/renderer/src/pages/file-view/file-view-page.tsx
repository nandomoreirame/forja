import type { ReactNode } from 'react'
import { fileKey, fileTabId, useWorkbench } from '@/renderer/src/entities/feature'
import type { FileDiff } from '@/renderer/src/shared/api'
import { sideBySide, type DiffLine } from '@/renderer/src/shared/lib/line-diff'
import { getDictionary } from '@/shared/i18n'
import { cn } from '@/shared/ui/utils'

// Light coloring for common source files: comments, strings and a few keywords.
const keywords =
  /\b(import|export|from|const|let|function|return|if|else|type|interface|class|async|await)\b/
const tokenPattern = new RegExp(
  `(\\/\\/.*$|#.*$|'[^']*'|"[^"]*"|\`[^\`]*\`|${keywords.source})`,
  'g',
)

function highlight(line: string): ReactNode {
  const parts = line.split(tokenPattern).filter((part) => part !== undefined && part !== '')
  return parts.map((part, index) => {
    const tone =
      part.startsWith('//') || part.startsWith('#')
        ? 'text-muted-foreground'
        : /^['"`]/.test(part)
          ? 'text-success'
          : keywords.test(part) && new RegExp(`^${keywords.source}$`).test(part)
            ? 'text-primary'
            : undefined
    return tone ? (
      <span key={index} className={tone}>
        {part}
      </span>
    ) : (
      part
    )
  })
}

const numberCell = 'w-10 select-none pr-3 text-right align-top text-muted-foreground'
const codeCell = 'whitespace-pre-wrap break-all pr-4 align-top'

/** Read-only preview of an Explorer file or side-by-side diff of a Changes entry. */
export function FileViewPage() {
  const state = useWorkbench((s) => s)
  const view = state.view
  if (view.kind !== 'file') return null
  const t = getDictionary(state.source.locale).app.fileView
  const name = view.path.split('/').at(-1) ?? view.path
  const content = state.fileContents[fileKey(view.path, view.mode)]
  const id = fileTabId(view.path, view.mode)
  const notice = (text: string) => <p className="p-6 text-[13px] text-muted-foreground">{text}</p>
  return (
    <section
      role="tabpanel"
      id={`document-panel-${id}`}
      aria-labelledby={`feature-tab-${id}`}
      className="flex min-h-0 flex-1 flex-col"
    >
      <header className="flex h-8 shrink-0 items-center border-b border-border px-4 font-mono text-[12px] text-muted-foreground">
        <span className="truncate">{view.path}</span>
      </header>
      <div
        role="region"
        aria-label={(view.mode === 'preview' ? t.preview : t.diff).replace('{name}', name)}
        className="min-h-0 flex-1 overflow-auto font-mono text-[12px] leading-5"
      >
        {!content
          ? notice(t.loading)
          : content.kind === 'binary'
            ? notice(t.binary)
            : content.kind === 'too-large'
              ? notice(t.tooLarge)
              : view.mode === 'preview'
                ? 'text' in content && <Preview text={content.text} />
                : 'base' in content && <Diff diff={content} labels={t} />}
      </div>
    </section>
  )
}

function Preview({ text }: { text: string }) {
  return (
    <table className="w-full border-collapse">
      <tbody>
        {text.split('\n').map((line, index) => (
          <tr key={index}>
            <td className={numberCell}>{index + 1}</td>
            <td className={codeCell}>{highlight(line)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

const tint = {
  same: '',
  changed: '',
  removed: 'bg-destructive/15',
  added: 'bg-success/15',
}

function Diff({
  diff,
  labels,
}: {
  diff: Extract<FileDiff, { kind: 'text' }>
  labels: { base: string; working: string; tooLarge: string }
}) {
  const rows = sideBySide(diff.base, diff.working)
  if (!Array.isArray(rows))
    return <p className="p-6 text-[13px] text-muted-foreground">{labels.tooLarge}</p>
  // One table keeps both sides aligned row by row and scrolling together.
  const side = (line: DiffLine | null, tone: string) => (
    <>
      <td className={numberCell}>{line?.n ?? ''}</td>
      <td className={cn(codeCell, line && tone)}>{line ? highlight(line.text) : null}</td>
    </>
  )
  return (
    <table className="w-full table-fixed border-collapse">
      <colgroup>
        <col className="w-10" />
        <col />
        <col className="w-10" />
        <col />
      </colgroup>
      <thead>
        <tr className="text-left text-[11px] text-muted-foreground">
          <th colSpan={2} className="px-3 py-1 font-normal">
            {labels.base}
          </th>
          <th colSpan={2} className="border-l border-border px-3 py-1 font-normal">
            {labels.working}
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={index} data-diff={row.kind}>
            {side(row.left, row.kind === 'changed' ? tint.removed : tint[row.kind])}
            {side(row.right, row.kind === 'changed' ? tint.added : tint[row.kind])}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
