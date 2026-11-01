import { useId } from 'react'
import { useWorkbench } from '@/renderer/src/entities/feature'
import type { FeatureSnapshot, ProjectSnapshot, RoleId } from '@/renderer/src/shared/api'
import { getDictionary } from '@/shared/i18n'
import { ToolIcon, type ToolId } from '@/shared/ui'
import { FeatureStatus, type FeatureState } from '@/shared/ui/feature-status'
import { cn } from '@/shared/ui/utils'

export type ColumnId = 'backlog' | 'research' | 'plan' | 'implement' | 'testing' | 'review' | 'done'
export interface BoardCard {
  id: string
  kind: 'demand' | 'feature'
  name: string
  feature?: FeatureSnapshot
}

const stageColumns: Record<RoleId, ColumnId> = {
  research: 'research',
  planner: 'plan',
  implementer: 'implement',
  tester: 'testing',
  reviewer: 'review',
}
const order: ColumnId[] = ['backlog', 'research', 'plan', 'implement', 'testing', 'review', 'done']

/**
 * RPI columns derived from the snapshot: demands in Backlog, features by stage, integrated
 * features in Done. Archived and abandoned features and Ferreiro chats stay off the board.
 */
export function boardColumns(snapshot: ProjectSnapshot): { id: ColumnId; cards: BoardCard[] }[] {
  const cards = new Map<ColumnId, BoardCard[]>(order.map((id) => [id, []]))
  for (const demand of snapshot.demands ?? [])
    cards.get('backlog')!.push({ id: demand.id, kind: 'demand', name: demand.title })
  for (const feature of snapshot.features) {
    if (feature.archived || feature.endState === 'abandoned' || feature.stage === 'smith') continue
    const column = feature.endState === 'integrated' ? 'done' : stageColumns[feature.stage]
    cards.get(column)!.push({ id: feature.id, kind: 'feature', name: feature.name, feature })
  }
  return order.map((id) => ({ id, cards: cards.get(id)! }))
}

/** Read-only RPI board; cards open their feature or the Backlog and are never dragged. */
export function BoardPage() {
  const state = useWorkbench((s) => s)
  const t = getDictionary(state.source.locale).app
  const heading = useId()
  if (!state.snapshot) return null
  const columns = boardColumns(state.snapshot)
  const stateLabel = (feature: FeatureSnapshot) =>
    feature.endState
      ? t.featureNavigator[feature.endState]
      : feature.stalled
        ? t.featureNavigator.stalled
        : (t.states[feature.state] ?? t.idle)
  return (
    <section aria-labelledby={heading} className="flex min-h-0 flex-1 flex-col gap-4 p-6">
      <h1 id={heading} className="text-lg font-semibold">
        {t.board.title}
      </h1>
      <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto pb-2">
        {columns.map((column) => {
          const label = t.board.columns[column.id]
          return (
            <section
              key={column.id}
              role="region"
              aria-label={`${label} ${column.cards.length}`}
              className="flex w-56 shrink-0 flex-col gap-2 rounded-md border border-border p-2"
            >
              <h2 className="flex items-center justify-between px-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                <span>{label}</span>
                <span className="font-normal tabular-nums">{column.cards.length}</span>
              </h2>
              {column.cards.map((card) => {
                const feature = card.feature
                const tool: ToolId | undefined = feature
                  ? (state.agentTools[feature.stage] ?? feature.tool)
                  : undefined
                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => (feature ? state.openFeature(feature.id) : state.openBacklog())}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-sm border border-border bg-card px-2 py-1.5 text-left text-[13px] hover:bg-accent',
                      'focus-visible:outline-2 focus-visible:outline-ring',
                    )}
                  >
                    {feature ? (
                      <FeatureStatus
                        state={
                          (feature.endState ??
                            (feature.stalled ? 'stalled' : feature.state)) as FeatureState
                        }
                        label={stateLabel(feature)}
                      />
                    ) : null}
                    <span className="min-w-0 flex-1 truncate">{card.name}</span>
                    {tool ? <ToolIcon tool={tool} /> : null}
                  </button>
                )
              })}
            </section>
          )
        })}
      </div>
    </section>
  )
}
