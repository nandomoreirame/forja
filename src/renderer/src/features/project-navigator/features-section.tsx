import { NavigatorSection, ArchiveAction, PaneAction, PaneRow, rowButton } from './section'
import {
  Search,
  ClipboardList,
  Code,
  FlaskConical,
  GitPullRequest,
  ChevronLeft,
  Plus,
} from 'lucide-react'
import { getDictionary, type Locale } from '@/shared/i18n'
import { StatusBadge, type UiState } from '@/shared/ui'
import { useWorkbench } from '@/renderer/src/entities/feature'
import type { FeatureSnapshot } from '@/renderer/src/shared/api'
import { cn } from '@/shared/ui/utils'
import { groupFeatures } from './model'

const icons = {
  research: Search,
  planner: ClipboardList,
  implementer: Code,
  tester: FlaskConical,
  reviewer: GitPullRequest,
}

export function FeaturesSection({ locale }: { locale: Locale }) {
  const state = useWorkbench((s) => s)
  const d = getDictionary(locale)
  const a = d.app
  const copy = a.featureNavigator
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
    const current = state.view.kind === 'conversation' && state.view.featureId === feature.id
    return (
      <PaneRow
        key={feature.id}
        current={current}
        hover={
          <>
            <span className="flex items-center gap-1 text-[12px] text-muted-foreground">
              <Icon aria-hidden="true" className="size-3.5 shrink-0" />
              {role}
            </span>
            <StatusBadge size="sm" state={badgeState}>
              {label}
            </StatusBadge>
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
          aria-label={`${feature.name} · ${role} · ${label}`}
          aria-current={current ? 'true' : undefined}
          className={cn(rowButton, 'pl-5 text-foreground')}
          onClick={() => state.openFeature(feature.id)}
        >
          <span
            aria-hidden="true"
            className={`ml-1 mr-1 size-1.5 shrink-0 rounded-full ${badgeState === 'running' ? 'bg-primary motion-safe:animate-pulse' : badgeState === 'failed' ? 'bg-destructive' : badgeState === 'completed' ? 'bg-success' : 'bg-muted-foreground'}`}
          />
          <span className="min-w-0 truncate">{feature.name}</span>
        </button>
      </PaneRow>
    )
  }
  return (
    <NavigatorSection
      section="features"
      title={a.features}
      count={active.length + groups.finished.length}
      defaultSize="25%"
      empty={copy.empty}
      actions={
        <>
          <PaneAction label={a.newConversation} onClick={() => state.startCompose()}>
            <Plus aria-hidden="true" />
          </PaneAction>
          <PaneAction label={a.collapseLeft} onClick={() => state.togglePanel('left')}>
            <ChevronLeft aria-hidden="true" />
          </PaneAction>
        </>
      }
    >
      {[...active, ...groups.finished].map(row)}
    </NavigatorSection>
  )
}
