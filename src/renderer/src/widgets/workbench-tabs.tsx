import type { ReactNode } from 'react'
import { Archive, BookOpen, FileDiff, FileText, MessageSquarePlus, Settings } from 'lucide-react'
import { StatusBadge } from '@/shared/ui'
import { fileTabId, useWorkbench } from '@/renderer/src/entities/feature'
import { getDictionary } from '@/shared/i18n'
import { FeatureTabs, type FeatureTabItem } from '@/widgets/workbench'

/**
 * Tab strip above every page of the editor area.
 *
 * Features and documents are tabs, and so is every other page (Settings, Archived, New
 * conversation, skill or memory authoring). Page tabs live in the store instead of the page
 * that renders them, so navigating elsewhere keeps them open; only their close button removes
 * them. Closing a feature tab never stops its agent.
 */
type PageId = 'settings' | 'archived' | 'authoring'

export function WorkbenchTabs() {
  const state = useWorkbench((s) => s)
  const a = getDictionary(state.source.locale).app
  const items: FeatureTabItem[] = (state.snapshot?.features ?? [])
    .filter((feature) => state.openFeatureIds.includes(feature.id))
    .map((feature) => ({
      id: feature.id,
      label: feature.name,
      tool: state.agentTools[feature.stage] ?? feature.tool,
      state: feature.endState ?? (feature.stalled ? 'stalled' : feature.state),
      stateLabel: feature.endState
        ? a.featureNavigator[feature.endState]
        : feature.stalled
          ? a.featureNavigator.stalled
          : a.states[feature.state],
    }))
  for (const id of state.openDocumentIds) {
    const artifact = state.snapshot?.artifacts.find((item) => item.id === id)
    const library = state.libraryDocuments[id]
    if (library)
      items.push({
        id,
        label: library.name,
        icon: <FileText aria-hidden="true" className="size-3" />,
      })
    if (artifact)
      items.push({
        id,
        label: artifact.name,
        icon: <FileText aria-hidden="true" className="size-3" />,
        badge: (
          <StatusBadge size="sm" state={artifact.state}>
            {a.states[artifact.state]}
          </StatusBadge>
        ),
      })
  }
  const icon = 'size-3'
  const fileTabs = new Map(state.fileTabs.map((tab) => [fileTabId(tab.path, tab.mode), tab]))
  for (const [id, tab] of fileTabs) {
    const name = tab.path.split('/').at(-1) ?? tab.path
    items.push({
      id,
      label: tab.mode === 'diff' ? a.fileView.diffTab.replace('{name}', name) : name,
      icon:
        tab.mode === 'diff' ? (
          <FileDiff aria-hidden="true" className={icon} />
        ) : (
          <FileText aria-hidden="true" className={icon} />
        ),
    })
  }
  const pages: { id: PageId; label: string; open: boolean; icon: ReactNode }[] = [
    {
      id: 'settings',
      label: a.settings,
      open: state.settingsOpen,
      icon: <Settings aria-hidden="true" className={icon} />,
    },
    {
      id: 'archived',
      label: a.archived,
      open: state.archivedOpen,
      icon: <Archive aria-hidden="true" className={icon} />,
    },
    {
      id: 'authoring',
      icon: <BookOpen aria-hidden="true" className={icon} />,
      label:
        state.authoring?.name ?? (state.authoring?.kind === 'memory' ? a.newMemory : a.newSkill),
      open: state.authoring !== null,
    },
  ]
  for (const page of pages)
    if (page.open) items.push({ id: page.id, label: page.label, icon: page.icon })
  const composeIds = state.composeTabs.map((tab) => tab.id)
  for (const id of composeIds)
    items.push({
      id,
      label: a.newConversation,
      icon: <MessageSquarePlus aria-hidden="true" className={icon} />,
    })
  if (!items.length) return null
  const isPage = (id: string): id is PageId => pages.some((page) => page.id === id)
  const selectedId =
    state.view.kind === 'conversation'
      ? state.view.featureId
      : state.view.kind === 'document'
        ? state.view.documentId
        : state.view.kind === 'compose'
          ? state.view.id
          : state.view.kind === 'file'
            ? fileTabId(state.view.path, state.view.mode)
            : isPage(state.view.kind)
              ? state.view.kind
              : ''
  return (
    <FeatureTabs
      selectedId={selectedId}
      panelId={
        state.view.kind === 'conversation'
          ? `feature-panel-${state.view.featureId}`
          : state.view.kind === 'document'
            ? `document-panel-${state.view.documentId}`
            : state.view.kind === 'file'
              ? `document-panel-${fileTabId(state.view.path, state.view.mode)}`
              : undefined
      }
      items={items}
      onSelect={(id) => {
        const file = fileTabs.get(id)
        if (file) void state.openFile(file.path, file.mode)
        else if (state.openDocumentIds.includes(id)) void state.openDocument(id)
        else if (id === 'settings') state.openSettings()
        else if (id === 'archived') state.openArchived()
        else if (composeIds.includes(id)) state.selectCompose(id)
        else if (id === 'authoring') state.navigate({ kind: 'authoring' })
        else state.selectFeature(id)
      }}
      onClose={(id) => {
        const file = fileTabs.get(id)
        if (file) state.closeFile(file.path, file.mode)
        else if (state.openDocumentIds.includes(id)) state.closeDocument(id)
        else if (id === 'settings') state.closeSettings()
        else if (id === 'archived') state.closeArchived()
        else if (composeIds.includes(id)) state.closeCompose(id)
        else if (id === 'authoring') state.closeAuthoring()
        else state.closeFeature(id)
      }}
      closeLabel={a.close}
      onAdd={() => state.startCompose()}
      addLabel={a.newConversation}
      label={a.features}
      stateLabels={{ running: a.states.running, waiting: a.states.waiting, idle: a.idle }}
    />
  )
}
