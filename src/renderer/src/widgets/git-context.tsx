import { ChevronRight, ChevronDown } from 'lucide-react'
import { getDictionary, type Locale } from '@/shared/i18n'
import { useWorkbench } from '@/renderer/src/entities/feature'
import { StatusBadge } from '@/shared/ui'
import { IconButton } from '@/renderer/src/shared/ui/icon-button'
export function GitContext({ locale }: { locale: Locale }) {
  const state = useWorkbench((s) => s)
  const snapshot = state.snapshot!
  const d = getDictionary(locale)
  const a = d.app
  const feature = snapshot.features.find(
    (f) => state.view.kind === 'conversation' && state.view.featureId === f.id,
  )
  return (
    <aside
      aria-label={a.project}
      data-slot="workbench-part"
      data-part="context"
      className="flex w-[230px] shrink-0 flex-col gap-4 overflow-y-auto rounded-part border border-border p-3 text-[11px] text-muted-foreground"
    >
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="uppercase tracking-wider">{a.project}</h2>
          <IconButton
            className="size-4"
            label={a.collapseRight}
            onClick={() => state.togglePanel('right')}
          >
            <ChevronRight className="size-3" />
          </IconButton>
        </div>
        <dl className="space-y-1.5 rounded-sm border border-border bg-card p-2">
          <div className="flex justify-between gap-2">
            <dt>{a.repository}</dt>
            <dd className="truncate text-foreground">{snapshot.project.name}</dd>
          </div>
          <div className="flex justify-between">
            <dt>{a.state}</dt>
            <dd>
              {feature ? (
                <StatusBadge state={feature.state}>{a.states[feature.state]}</StatusBadge>
              ) : (
                a.idle
              )}
            </dd>
          </div>
          {feature
            ? [
                [a.destination, feature.destination],
                [d.product.cwd, feature.worktree ?? feature.target],
                [a.worktree, feature.worktree ?? a.none],
                [d.product.branch, feature.branch],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-2">
                  <dt>{label}</dt>
                  <dd className="min-w-0 break-all text-foreground">{value}</dd>
                </div>
              ))
            : null}
        </dl>
      </section>
      {/* Git and Branches stay at the bottom, like VS Code's lower views. */}
      <div className="mt-auto space-y-4">
        <section className="border-t border-border pt-4">
          <h2 className="mb-2 flex justify-between uppercase tracking-wider">
            <span>Git</span>
            <span>{snapshot.changes.length}</span>
          </h2>
          {snapshot.changes.length ? (
            snapshot.changes.map((c) => (
              <p key={c.path}>
                {c.status} {c.path}
              </p>
            ))
          ) : (
            <p>{a.noChanges}</p>
          )}
        </section>
        <details open className="group border-t border-border pt-4">
          <summary className="focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-2 flex cursor-pointer list-none items-center justify-between uppercase tracking-wider">
            {a.branches}
            <ChevronDown className="size-3 group-open:rotate-180 motion-reduce:transition-none" />
          </summary>
          <ul className="mt-2 space-y-1">
            {snapshot.branches.map((branch) => (
              <li
                key={branch}
                className="rounded-sm border border-border bg-secondary px-2 py-1 text-foreground"
              >
                • {branch}
              </li>
            ))}
          </ul>
        </details>
      </div>
    </aside>
  )
}
