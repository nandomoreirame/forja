import { useState } from 'react'
import { NotebookText, Workflow, X } from 'lucide-react'
import { ConversationSummary, History } from '@/renderer/src/features/conversation'
import { Button } from '@/shared/ui'
import { roleIds } from '@/renderer/src/shared/api'
import { FeatureContext, FeatureCycle } from '@/widgets/workbench'
import { getDictionary } from '@/shared/i18n'
import { agentName, useWorkbench } from '@/renderer/src/entities/feature'
import { ComposerController } from '@/renderer/src/features/composer'
export function ConversationPage() {
  const state = useWorkbench((s) => s)
  const [summaryFor, setSummaryFor] = useState<string | null>(null)
  const [flowFor, setFlowFor] = useState<string | null>(null)
  const d = getDictionary(state.source.locale),
    a = d.app
  const feature = state.snapshot?.features.find(
    (f) => state.view.kind === 'conversation' && f.id === state.view.featureId,
  )
  if (!feature) return null
  const summaryOpen = summaryFor === feature.id
  const flowOpen = flowFor === feature.id
  const headerButton = 'h-5 gap-1 px-1.5 text-[11px] [&_svg]:size-3.5'
  const cycle = roleIds.map((role, index) => ({
    label: agentName(role, state.source.locale, state.agentNames),
    roleLabel: d.product[role],
    tool: state.agentTools[role],
    state:
      index === roleIds.indexOf(feature.stage)
        ? ('current' as const)
        : index < roleIds.indexOf(feature.stage)
          ? ('done' as const)
          : ('pending' as const),
  }))
  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div
        role="tabpanel"
        id={`feature-panel-${feature.id}`}
        aria-labelledby={`feature-tab-${feature.id}`}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="border-b border-border p-4">
          <FeatureContext
            title={feature.name}
            // Destination and branch live in the right panel (GitContext).
            rows={[]}
            actions={
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className={headerButton}
                  aria-expanded={summaryOpen}
                  onClick={() => setSummaryFor(summaryOpen ? null : feature.id)}
                >
                  <NotebookText aria-hidden="true" />
                  {a.summary.toggle}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={headerButton}
                  aria-expanded={flowOpen}
                  onClick={() => setFlowFor(flowOpen ? null : feature.id)}
                >
                  <Workflow aria-hidden="true" />
                  {a.flow.toggle}
                </Button>
              </>
            }
          />
          {flowOpen ? (
            <section
              aria-label={a.flow.title}
              className="relative mt-3 rounded-md border border-border bg-card px-10 py-3"
            >
              <FeatureCycle cycle={cycle} label={a.cycle} centered />
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={a.flow.close}
                className="absolute top-1/2 right-2 -translate-y-1/2"
                onClick={() => setFlowFor(null)}
              >
                <X />
              </Button>
            </section>
          ) : null}
          {summaryOpen ? (
            <div className="mt-3">
              <ConversationSummary
                key={feature.id}
                locale={state.source.locale}
                messageCount={feature.messages.length}
                summary={state.summaries[feature.id]}
                onSummarize={() => state.summarize(feature.id)}
                onClose={() => setSummaryFor(null)}
              />
            </div>
          ) : null}
        </div>
        <History
          key={feature.id}
          agentNames={state.agentNames}
          messages={feature.messages}
          locale={state.source.locale}
          stage={feature.stage}
          toolFor={(role) => state.agentTools[role] ?? feature.tool}
          onViewRequest={state.focusComposer}
        />
        <div className="p-4">
          <ComposerController key={feature.id} featureId={feature.id} />
        </div>
      </div>
    </section>
  )
}
