import { GitBranch, RefreshCw } from 'lucide-react'
import { useWorkbench } from '@/renderer/src/entities/feature'
import { getDictionary } from '@/shared/i18n'

/** Branch and sync counts of the selected feature, like the VS Code status bar. */
export function GitStatus() {
  const state = useWorkbench((s) => s)
  const snapshot = state.snapshot
  if (!snapshot) return null
  const view = state.view
  const feature =
    view.kind === 'conversation'
      ? snapshot.features.find((item) => item.id === view.featureId)
      : undefined
  const branch = feature?.branch ?? snapshot.branches[0] ?? ''
  const behind = feature?.behind ?? 0
  const ahead = feature?.ahead ?? 0
  const g = getDictionary(state.source.locale).app.gitStatus
  return (
    <span
      role="status"
      aria-label={g.label
        .replace('{branch}', branch)
        .replace('{behind}', String(behind))
        .replace('{ahead}', String(ahead))}
      className="flex shrink-0 items-center gap-3"
    >
      <span className="flex items-center gap-1">
        <GitBranch aria-hidden="true" className="size-3.5" />
        {branch}
      </span>
      <span className="flex items-center gap-1 tabular-nums">
        <RefreshCw aria-hidden="true" className="size-3.5" />
        {behind}↓ {ahead}↑
      </span>
    </span>
  )
}
