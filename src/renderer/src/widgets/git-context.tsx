import { PanelRight } from 'lucide-react'
import { getDictionary, type Locale } from '@/shared/i18n'
import { useWorkbench } from '@/renderer/src/entities/feature'
import { isEnabled } from '@/renderer/src/shared/lib/feature-flags'
import {
  Button,
  ResizableHandle,
  StatusBadge,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/ui'
import { NavigatorSection } from '@/renderer/src/features/project-navigator/section'
import { PaneStack } from '@/renderer/src/features/project-navigator/pane-stack'
import { ChangesSection, ExplorerSection } from '@/renderer/src/features/source-control'

/** The right panel: project facts, Explorer, Changes and Branches as VS Code style panes. */
export function GitContext({ locale }: { locale: Locale }) {
  const state = useWorkbench((s) => s)
  const snapshot = state.snapshot!
  const d = getDictionary(locale)
  const a = d.app
  const explorer = isEnabled('explorer')
  const sourceControl = isEnabled('source-control')
  const panes = [
    'context-project',
    ...(explorer ? ['explorer'] : []),
    ...(sourceControl ? ['changes'] : []),
    'branches',
  ]
  const feature = snapshot.features.find(
    (f) => state.view.kind === 'conversation' && state.view.featureId === f.id,
  )
  const facts: [string, React.ReactNode][] = [
    [a.repository, snapshot.project.name],
    [
      a.state,
      feature ? <StatusBadge state={feature.state}>{a.states[feature.state]}</StatusBadge> : a.idle,
    ],
    ...(feature
      ? ([
          [a.destination, feature.destination],
          [d.product.cwd, feature.worktree ?? feature.target],
          [a.worktree, feature.worktree ?? a.none],
          [d.product.branch, feature.branch],
        ] as [string, string][])
      : []),
  ]
  return (
    <aside
      aria-label={a.project}
      data-slot="workbench-part"
      data-part="context"
      className="flex h-full w-full flex-col overflow-hidden rounded-part border border-border text-xs"
    >
      <PaneStack id="forja-context-panes" panes={panes}>
        <NavigatorSection section="context-project" title={a.project} defaultSize="20%">
          <dl className="space-y-1.5 py-1 pl-5 pr-3 text-[12px] text-muted-foreground">
            {facts.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-2">
                <dt>{label}</dt>
                <dd className="min-w-0 break-all text-right text-foreground">{value}</dd>
              </div>
            ))}
          </dl>
        </NavigatorSection>
        {explorer && (
          <>
            <ResizableHandle className="bg-border" />
            <ExplorerSection locale={locale} />
          </>
        )}
        {sourceControl && (
          <>
            <ResizableHandle className="bg-border" />
            <ChangesSection locale={locale} />
          </>
        )}
        <ResizableHandle className="bg-border" />
        <NavigatorSection
          section="branches"
          title={a.branches}
          count={snapshot.branches.length}
          defaultSize="10%"
        >
          <ul aria-label={a.branches}>
            {snapshot.branches.map((branch) => (
              <li
                key={branch}
                className="flex h-[22px] items-center pl-5 text-[13px] text-foreground hover:bg-accent"
              >
                {branch}
              </li>
            ))}
          </ul>
        </NavigatorSection>
      </PaneStack>
    </aside>
  )
}

/** Topbar button that shows or hides the right panel, mirroring the sidebar toggle. */
export function ContextPanelToggle() {
  const state = useWorkbench((s) => s)
  const a = getDictionary(state.source.locale).app
  const open = state.panels.right
  const label = open ? a.collapseRight : a.expandRight
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          aria-pressed={open}
          onClick={() => state.togglePanel('right')}
          className="size-6"
        >
          <PanelRight className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  )
}
