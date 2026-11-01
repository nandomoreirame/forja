import { useState } from 'react'
import { CloseFeatureDialog } from '@/renderer/src/features/feature-tabs'
import { useWorkbench } from '@/renderer/src/entities/feature'
import { getDictionary } from '@/shared/i18n'
import { FeatureTabs, type FeatureTabItem } from '@/widgets/workbench'

/**
 * Tab strip shared by every view that can host feature tabs.
 *
 * The Settings tab lives in the store (`settingsOpen`) instead of the page that
 * renders it, so navigating to a feature keeps it open. Only its own close
 * button removes it.
 */
export function WorkbenchTabs() {
  const state = useWorkbench((s) => s)
  const a = getDictionary(state.source.locale).app
  const [closingId, setClosingId] = useState<string | null>(null)
  const items: FeatureTabItem[] = (state.snapshot?.features ?? [])
    .filter((feature) => state.openFeatureIds.includes(feature.id))
    .map((feature) => ({
      id: feature.id,
      label: feature.name,
      tool: feature.tool,
      state:
        feature.state === 'running' ? 'running' : feature.state === 'waiting' ? 'waiting' : 'idle',
    }))
  if (state.settingsOpen) items.push({ id: 'settings', label: a.settings, state: 'idle' })
  const selectedId =
    state.view.kind === 'settings'
      ? 'settings'
      : state.view.kind === 'conversation'
        ? state.view.featureId
        : ''
  return (
    <>
      <FeatureTabs
        selectedId={selectedId}
        panelId={
          state.view.kind === 'conversation' ? `feature-panel-${state.view.featureId}` : undefined
        }
        items={items}
        onSelect={(id) => (id === 'settings' ? state.openSettings() : state.selectFeature(id))}
        onClose={(id) => {
          if (id === 'settings') {
            state.closeSettings()
            return
          }
          if (state.snapshot?.features.find((feature) => feature.id === id)?.state === 'running')
            setClosingId(id)
          else state.closeFeature(id)
        }}
        closeLabel={a.close}
        label={a.features}
        stateLabels={{ running: a.states.running, waiting: a.states.waiting, idle: a.idle }}
      />
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
    </>
  )
}
