import type { ReactNode } from 'react'
import { GitBranch, RefreshCw } from 'lucide-react'
import { useWorkbench } from '@/renderer/src/entities/feature'
import { isEnabled } from '@/renderer/src/shared/lib/feature-flags'
import { getDictionary } from '@/shared/i18n'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui'

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
  const base = snapshot.branches[0] ?? ''
  const branch = feature?.branch ?? base
  const behind = String(feature?.behind ?? 0)
  const ahead = String(feature?.ahead ?? 0)
  const d = getDictionary(state.source.locale)
  const g = d.app.gitStatus
  const sourceControl = isEnabled('source-control')
  return (
    <span
      role="status"
      aria-label={
        sourceControl
          ? g.label
              .replace('{branch}', branch)
              .replace('{behind}', behind)
              .replace('{ahead}', ahead)
          : `${d.product.branch} ${branch}`
      }
      className="flex shrink-0 items-center gap-1"
    >
      <GitItem
        tip={
          <div className="grid gap-1 text-[11px]">
            <span className="text-muted-foreground">
              {d.product.branch}: <span className="font-mono text-foreground">{branch}</span>
            </span>
            <span className="text-muted-foreground">
              {d.app.worktree}:{' '}
              <span className="font-mono text-foreground">{feature?.worktree ?? d.app.none}</span>
            </span>
          </div>
        }
      >
        <GitBranch aria-hidden="true" className="size-3.5" />
        {branch}
      </GitItem>
      {sourceControl && (
        <GitItem
          tip={g.sync.replace('{behind}', behind).replace('{ahead}', ahead).replace('{base}', base)}
        >
          <RefreshCw aria-hidden="true" className="size-3.5" />
          <span className="tabular-nums">
            {behind}↓ {ahead}↑
          </span>
        </GitItem>
      )}
    </span>
  )
}

// Same hover and focus treatment as the background terminal items beside it.
function GitItem({ tip, children }: { tip: ReactNode; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className="flex h-6 items-center gap-1 rounded-[3px] px-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top">{tip}</TooltipContent>
    </Tooltip>
  )
}
