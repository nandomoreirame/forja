import { useId, useState } from 'react'
import {
  Search,
  ClipboardList,
  Code,
  FlaskConical,
  GitPullRequest,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from 'lucide-react'
import { getDictionary, type Locale } from '@/shared/i18n'
import { StatusBadge, Tooltip, TooltipContent, TooltipTrigger, type UiState } from '@/shared/ui'
import { useWorkbench } from '@/renderer/src/entities/feature'
import type { FeatureSnapshot } from '@/renderer/src/shared/api'
import { IconButton } from '@/renderer/src/shared/ui/icon-button'
import { groupFeatures } from './model'

const icons = {
  research: Search,
  planner: ClipboardList,
  implementer: Code,
  tester: FlaskConical,
  reviewer: GitPullRequest,
}
const focus = 'focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-2'

export function FeaturesSection({ locale }: { locale: Locale }) {
  const state = useWorkbench((s) => s)
  const d = getDictionary(locale)
  const a = d.app
  const copy = a.featureNavigator
  const headingId = useId()
  const finishedId = useId()
  const [finishedOpen, setFinishedOpen] = useState(false)
  const groups = groupFeatures(state.snapshot!.features)
  const active = [...groups.attention, ...groups.running, ...groups.idle]
  const row = (feature: FeatureSnapshot) => {
    const Icon = icons[feature.stage]
    const role = d.product[feature.stage]
    const badgeState: UiState = feature.endState
      ? feature.endState === 'integrated'
        ? 'completed'
        : 'interrupted'
      : feature.stalled
        ? 'waiting'
        : feature.state
    const label = feature.endState
      ? copy[feature.endState]
      : feature.stalled
        ? copy.stalled
        : feature.state === 'failed'
          ? copy.needsFix
          : feature.state === 'waiting' || feature.state === 'running'
            ? a.states[feature.state]
            : a.idle
    return (
      <Tooltip key={feature.id}>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={`${feature.name} · ${role} · ${label}`}
            aria-current={
              state.view.kind === 'conversation' && state.view.featureId === feature.id
                ? 'true'
                : undefined
            }
            className={`flex w-full items-start gap-2 px-3 py-1.5 text-left hover:bg-accent aria-current:bg-accent ${focus}`}
            onClick={() => state.openFeature(feature.id)}
          >
            <span
              aria-hidden="true"
              className={`mt-1.5 size-1.5 shrink-0 rounded-full ${badgeState === 'running' ? 'bg-primary motion-safe:animate-pulse' : badgeState === 'failed' ? 'bg-destructive' : badgeState === 'completed' ? 'bg-success' : 'bg-muted-foreground'}`}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate">{feature.name}</span>
              <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-muted-foreground">
                <Icon aria-hidden="true" className="size-3 shrink-0" />
                <span className="shrink-0 whitespace-nowrap">{role}</span>
                <StatusBadge size="sm" state={badgeState}>
                  {label}
                </StatusBadge>
              </span>
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent>{feature.name}</TooltipContent>
      </Tooltip>
    )
  }
  return (
    <section aria-labelledby={headingId}>
      <div className="flex items-center gap-2 px-3 pb-1">
        <h2
          id={headingId}
          className="flex flex-1 justify-between gap-2 text-[11px] uppercase tracking-wider"
        >
          <span>{a.features}</span> <span>{active.length + groups.finished.length}</span>
        </h2>
        <IconButton
          className="size-5"
          label={a.collapseLeft}
          onClick={() => state.togglePanel('left')}
        >
          <ChevronLeft className="size-3" />
        </IconButton>
      </div>
      {active.map(row)}
      {groups.finished.length > 0 && (
        <>
          <button
            type="button"
            aria-expanded={finishedOpen}
            aria-controls={finishedId}
            onClick={() => setFinishedOpen(!finishedOpen)}
            className={`flex w-full items-center gap-1 px-3 py-1 text-muted-foreground hover:bg-accent ${focus}`}
          >
            {finishedOpen ? (
              <ChevronDown aria-hidden="true" className="size-3" />
            ) : (
              <ChevronRight aria-hidden="true" className="size-3" />
            )}
            {copy.finished} <span className="ml-auto">{groups.finished.length}</span>
          </button>
          <div id={finishedId} hidden={!finishedOpen}>
            {groups.finished.map(row)}
          </div>
        </>
      )}
      <button
        type="button"
        onClick={() => state.startCompose()}
        className={`w-full px-3 py-1 text-left text-muted-foreground hover:bg-accent hover:text-primary ${focus}`}
      >
        + {a.newConversation}
      </button>
    </section>
  )
}
