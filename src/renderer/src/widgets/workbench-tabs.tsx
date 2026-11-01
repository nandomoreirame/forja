import { useState } from 'react'
import { FileText } from 'lucide-react'
import { StatusBadge } from '@/shared/ui'
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
      tool: state.agentTools[feature.stage] ?? feature.tool,
      state:
        feature.state === 'running' ? 'running' : feature.state === 'waiting' ? 'waiting' : 'idle',
    }))
  for (const id of state.openDocumentIds) {
    const artifact = state.snapshot?.artifacts.find((item) => item.id === id)
    const library = state.libraryDocuments[id]
    if (library)
      items.push({
        id,
        label: library.name,
        state: 'idle',
        icon: <FileText aria-hidden="true" className="size-3" />,
      })
    if (artifact)
      items.push({
        id,
        label: artifact.name,
        state: 'idle',
        icon: <FileText aria-hidden="true" className="size-3" />,
        badge: (
          <StatusBadge size="sm" state={artifact.state}>
            {a.states[artifact.state]}
          </StatusBadge>
        ),
      })
  }
  if (state.settingsOpen) items.push({ id: 'settings', label: a.settings, state: 'idle' })
  const selectedId =
    state.view.kind === 'settings'
      ? 'settings'
      : state.view.kind === 'conversation'
        ? state.view.featureId
        : state.view.kind === 'document'
          ? state.view.documentId
          : ''
  return (
    <>
      <FeatureTabs
        selectedId={selectedId}
        panelId={
          state.view.kind === 'conversation'
            ? `feature-panel-${state.view.featureId}`
            : state.view.kind === 'document'
              ? `document-panel-${state.view.documentId}`
              : undefined
        }
        items={items}
        onSelect={(id) => {
          if (state.openDocumentIds.includes(id)) void state.openDocument(id)
          else if (id === 'settings') state.openSettings()
          else state.selectFeature(id)
        }}
        onClose={(id) => {
          if (state.openDocumentIds.includes(id)) {
            state.closeDocument(id)
            return
          }
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
