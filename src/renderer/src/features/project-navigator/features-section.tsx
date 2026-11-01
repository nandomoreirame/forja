import { Hammer } from 'lucide-react'
import { FeatureStatus } from '@/shared/ui/feature-status'
import { NavigatorSection, ArchiveAction, PaneRow, rowButton } from './section'
import { getDictionary, type Locale } from '@/shared/i18n'
import { StatusBadge, ToolIcon, toolNames, type UiState } from '@/shared/ui'
import { agentName, useWorkbench } from '@/renderer/src/entities/feature'
import type { FeatureSnapshot } from '@/renderer/src/shared/api'
import { cn } from '@/shared/ui/utils'
import { groupFeatures } from './model'

export function FeaturesSection({ locale }: { locale: Locale }) {
  const state = useWorkbench((s) => s)
  const d = getDictionary(locale)
  const a = d.app
  const copy = a.featureNavigator
  const groups = groupFeatures(state.snapshot!.features)
  const active = [...groups.attention, ...groups.running, ...groups.idle]
  const row = (feature: FeatureSnapshot) => {
    // The AI tool of the agent working on the feature now, as configured in Settings.
    const tool = state.agentTools[feature.stage] ?? feature.tool
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
    const current = state.view.kind === 'conversation' && state.view.featureId === feature.id
    const badges = (
      <>
        <ToolIcon tool={tool} />
        <StatusBadge size="sm" state={badgeState}>
          {label}
        </StatusBadge>
      </>
    )
    return (
      <PaneRow
        key={feature.id}
        current={current}
        trailing={badges}
        hover={
          <>
            {badges}
            <ArchiveAction
              name={feature.name}
              locale={locale}
              disabled={feature.state === 'running'}
              onClick={() => state.archiveItem({ kind: 'feature', id: feature.id })}
            />
          </>
        }
      >
        <button
          type="button"
          aria-label={`${feature.name} · ${agentName(feature.stage, locale, state.agentNames)}, ${d.product[feature.stage]} · ${toolNames[tool]} · ${label}`}
          aria-current={current ? 'true' : undefined}
          className={cn(rowButton, 'pl-5 text-foreground')}
          onClick={() => state.openFeature(feature.id)}
        >
          <FeatureStatus
            state={feature.endState ?? (feature.stalled ? 'stalled' : feature.state)}
            label={
              feature.endState
                ? copy[feature.endState]
                : feature.stalled
                  ? copy.stalled
                  : (a.states[feature.state] ?? a.idle)
            }
          />
          {feature.stage === 'smith' ? (
            <Hammer
              aria-hidden="true"
              data-slot="smith-mark"
              className="size-3.5 shrink-0 text-primary"
            />
          ) : null}
          <span className="min-w-0 truncate">{feature.name}</span>
        </button>
      </PaneRow>
    )
  }
  return (
    <NavigatorSection
      section="features"
      title={a.chats}
      count={active.length + groups.finished.length}
      defaultSize="25%"
      empty={copy.empty}
    >
      {[...active, ...groups.finished].map(row)}
    </NavigatorSection>
  )
}
