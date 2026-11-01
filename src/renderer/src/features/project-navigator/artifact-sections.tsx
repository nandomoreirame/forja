import { NavigatorSection, ArchiveAction, PaneAction, PaneRow, rowButton } from './section'
import { ClipboardList, Plus } from 'lucide-react'
import { getDictionary, type Locale } from '@/shared/i18n'
import { StatusBadge, Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui'
import { cn } from '@/shared/ui/utils'
import { useWorkbench } from '@/renderer/src/entities/feature'
import type { ProjectSnapshot } from '@/renderer/src/shared/api'

type Artifact = ProjectSnapshot['artifacts'][number]

export function SpecsSection({ locale }: { locale: Locale }) {
  return <ArtifactSection locale={locale} kind="spec" />
}

export function PlansSection({ locale }: { locale: Locale }) {
  return <ArtifactSection locale={locale} kind="plan" />
}

export function ReviewsSection({ locale }: { locale: Locale }) {
  return <ArtifactSection locale={locale} kind="review" />
}

function ArtifactSection({ locale, kind }: { locale: Locale; kind: Artifact['kind'] }) {
  const state = useWorkbench((s) => s)
  const snapshot = state.snapshot!
  const a = getDictionary(locale).app
  const items = snapshot.artifacts.filter((item) => item.kind === kind && !item.archived)
  const selectedFeatureId = state.view.kind === 'conversation' ? state.view.featureId : undefined
  const title = kind === 'spec' ? a.specs : kind === 'plan' ? a.plans : a.reviews
  return (
    <NavigatorSection
      section={kind === 'spec' ? 'specs' : kind === 'plan' ? 'plans' : 'reviews'}
      title={title}
      count={items.length}
      defaultSize={kind === 'review' ? '10%' : '20%'}
      empty={kind === 'spec' ? a.specsEmpty : kind === 'plan' ? a.plansEmpty : a.reviewsEmpty}
      actions={
        kind === 'spec' ? (
          <PaneAction label={a.newSpec} onClick={() => state.startCompose('research')}>
            <Plus aria-hidden="true" />
          </PaneAction>
        ) : undefined
      }
    >
      {items.map((item) => {
        // Only linked artifacts get a description; unlinked library files already carry the slug.
        const feature = snapshot.features.find((feature) => feature.id === item.featureId)
        const spec = item.specId
          ? snapshot.artifacts.find(
              (artifact) => artifact.kind === 'spec' && artifact.id === item.specId,
            )
          : undefined
        const subtitle = kind === 'plan' ? spec?.name : feature?.name
        const current = Boolean(item.featureId && item.featureId === selectedFeatureId)
        const dimmed = Boolean(item.featureId && selectedFeatureId && !current)
        return (
          <PaneRow
            key={item.id}
            hover={
              <>
                <StatusBadge size="sm" state={item.state}>
                  {a.states[item.state]}
                </StatusBadge>
                {kind !== 'review' && (
                  <ArchiveAction
                    name={item.name}
                    locale={locale}
                    onClick={() => state.archiveItem({ kind, id: item.id })}
                  />
                )}
              </>
            }
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={[item.name, subtitle, a.states[item.state]]
                    .filter(Boolean)
                    .join(' · ')}
                  data-current={current ? 'true' : undefined}
                  className={cn(
                    rowButton,
                    'pl-5',
                    dimmed ? 'text-muted-foreground' : 'text-foreground',
                  )}
                  onClick={() => void state.openDocument(item.id)}
                >
                  <ClipboardList aria-hidden="true" className="size-4 shrink-0" />
                  <span className="min-w-0 truncate">
                    {item.name}
                    {subtitle ? (
                      <span className="ml-1.5 text-[12px] text-muted-foreground">{subtitle}</span>
                    ) : null}
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent>{subtitle ? `${item.name} · ${subtitle}` : item.name}</TooltipContent>
            </Tooltip>
          </PaneRow>
        )
      })}
    </NavigatorSection>
  )
}
