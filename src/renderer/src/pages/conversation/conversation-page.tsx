import { FeatureTabs } from '@/widgets/workbench'
import { Messages } from '@/widgets/conversation'
import { getDictionary } from '@/shared/i18n'
import { useWorkbench } from '@/renderer/src/entities/feature'
import { FeatureComposer } from '@/renderer/src/widgets/feature-composer'
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
      <FeatureTabs
        selectedId={feature.id}
        items={state
          .snapshot!.features.filter((f) => state.openFeatureIds.includes(f.id))
          .map((f) => ({
            id: f.id,
            label: f.name,
            state: f.state === 'running' ? 'running' : f.state === 'waiting' ? 'waiting' : 'idle',
          }))}
        onSelect={state.selectFeature}
        onClose={state.closeFeature}
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
        <div className="flex-1 overflow-auto p-6">
          <Messages
            label={a.conversation}
            emptyLabel={d.product.empty}
            items={feature.messages.map((m) => ({
              id: m.id,
              role: m.role === 'user' ? 'user' : 'agent',
              author: m.role === 'user' ? a.you : d.product[m.author ?? feature.stage],
              text: m.text,
            }))}
          />
        </div>
        <div className="p-4">
          <FeatureComposer
            key={feature.id}
            featureId={feature.id}
            role={state.recipients[feature.id] ?? feature.stage}
          />
        </div>
      </div>
    </section>
  )
}
