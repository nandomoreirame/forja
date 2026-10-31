import { useState } from 'react'
import { History } from '@/renderer/src/features/conversation'
import { CloseFeatureDialog } from '@/renderer/src/features/feature-tabs'
import { roleIds } from '@/renderer/src/shared/api'
import { FeatureContext, FeatureTabs } from '@/widgets/workbench'
import { getDictionary } from '@/shared/i18n'
import { useWorkbench } from '@/renderer/src/entities/feature'
import { ComposerController } from '@/renderer/src/features/composer'
export function ConversationPage() {
  const [closingId, setClosingId] = useState<string | null>(null)
  const state = useWorkbench((s) => s)
  const d = getDictionary(state.source.locale),
    a = d.app
  const feature = state.snapshot?.features.find(
    (f) => state.view.kind === 'conversation' && f.id === state.view.featureId,
  )
  if (!feature) return null
  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <FeatureTabs
        selectedId={feature.id}
        panelId={`feature-panel-${feature.id}`}
        items={state
          .snapshot!.features.filter((f) => state.openFeatureIds.includes(f.id))
          .map((f) => ({
            id: f.id,
            label: f.name,
            state: f.state === 'running' ? 'running' : f.state === 'waiting' ? 'waiting' : 'idle',
          }))}
        onSelect={state.selectFeature}
        onClose={(id) => {
          if (state.snapshot?.features.find((f) => f.id === id)?.state === 'running')
            setClosingId(id)
          else state.closeFeature(id)
        }}
        closeLabel={a.close}
        label={a.features}
        stateLabels={{ running: a.states.running, waiting: a.states.waiting, idle: a.idle }}
      />
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
        />
        <div className="p-4">
          <ComposerController key={feature.id} featureId={feature.id} />
        </div>
      </div>
      <CloseFeatureDialog
        open={closingId !== null}
        locale={state.source.locale}
        onOpenChange={(open) => {
          if (!open) setClosingId(null)
        }}
        onConfirm={() => {
          if (closingId) state.closeFeature(closingId)
          setClosingId(null)
        }}
      />
    </section>
  )
}
