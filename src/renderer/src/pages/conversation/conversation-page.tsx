import { History } from '@/renderer/src/features/conversation'
import { roleIds } from '@/renderer/src/shared/api'
import { FeatureContext } from '@/widgets/workbench'
import { getDictionary } from '@/shared/i18n'
import { useWorkbench } from '@/renderer/src/entities/feature'
import { ComposerController } from '@/renderer/src/features/composer'
import { WorkbenchTabs } from '@/renderer/src/widgets/workbench-tabs'
export function ConversationPage() {
  const state = useWorkbench((s) => s)
  const d = getDictionary(state.source.locale),
    a = d.app
  const feature = state.snapshot?.features.find(
    (f) => state.view.kind === 'conversation' && f.id === state.view.featureId,
  )
  if (!feature) return null
  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <WorkbenchTabs />
      <div
        role="tabpanel"
        id={`feature-panel-${feature.id}`}
        aria-labelledby={`feature-tab-${feature.id}`}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="border-b border-border p-4">
          <FeatureContext
            title={feature.name}
            mode={a.guided}
            rows={[
              { label: a.destination, value: feature.destination },
              { label: d.product.branch, value: feature.branch },
            ]}
            cycleLabel={a.cycle}
            cycle={roleIds.map((role, index) => ({
              label: d.product[role],
              tool: state.agentTools[role],
              state:
                index === roleIds.indexOf(feature.stage)
                  ? 'current'
                  : index < roleIds.indexOf(feature.stage)
                    ? 'done'
                    : 'pending',
            }))}
          />
        </div>
        <History
          key={feature.id}
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
