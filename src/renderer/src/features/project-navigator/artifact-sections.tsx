import { useId } from 'react'
import { ClipboardList } from 'lucide-react'
import { getDictionary, type Locale } from '@/shared/i18n'
import { StatusBadge, Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui'
import { useWorkbench } from '@/renderer/src/entities/feature'
import type { ProjectSnapshot } from '@/renderer/src/shared/api'

const focus = 'focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-2'
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
  const headingId = useId()
  const items = snapshot.artifacts.filter((item) => item.kind === kind && !item.archived)
  const selectedFeatureId = state.view.kind === 'conversation' ? state.view.featureId : undefined
  const title = kind === 'spec' ? a.specs : kind === 'plan' ? a.plans : a.reviews
  return (
    <section
      aria-labelledby={headingId}
      className="mx-3 flex min-h-0 shrink flex-col border-t border-border pt-3"
    >
      <h2 id={headingId} className="flex justify-between pb-1 text-[11px] uppercase tracking-wider">
        <span>{title}</span> <span>{items.length}</span>
      </h2>
      <div
        data-testid="section-scroll"
        className={`max-h-[16.5rem] shrink overflow-y-auto ${items.length ? 'min-h-16' : 'min-h-0'}`}
      >
        {items.map((item) => {
          const slug = item.name.split('/')[0]
          const feature = snapshot.features.find((feature) => feature.id === item.featureId)
          const spec = item.specId
            ? snapshot.artifacts.find(
                (artifact) => artifact.kind === 'spec' && artifact.id === item.specId,
              )
            : snapshot.artifacts.find(
                (artifact) => artifact.kind === 'spec' && artifact.name === `${slug}/SPEC.md`,
              )
          const subtitle = kind === 'plan' ? (spec?.name ?? slug) : (feature?.name ?? slug)
          const current = Boolean(item.featureId && item.featureId === selectedFeatureId)
          const dimmed = Boolean(item.featureId && selectedFeatureId && !current)
          return (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  data-current={current ? 'true' : undefined}
                  className={`flex w-full items-start gap-2 px-2 py-1.5 text-left hover:bg-accent ${dimmed ? 'text-muted-foreground' : 'text-foreground'} ${focus}`}
                  onClick={() => void state.openDocument(item.id)}
                >
                  <ClipboardList aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{item.name}</span>
                    <span className="mt-0.5 flex min-w-0 items-center gap-1.5">
                      <span className="truncate">{subtitle}</span>
                      <StatusBadge size="sm" state={item.state}>
                        {a.states[item.state]}
                      </StatusBadge>
                    </span>
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {item.name} · {subtitle}
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
      {kind === 'spec' && (
        <button
          type="button"
          className={`w-full py-1 text-left text-muted-foreground hover:text-primary ${focus}`}
          onClick={() => state.startCompose('research')}
        >
          {a.newSpec}
        </button>
      )}
    </section>
  )
}
