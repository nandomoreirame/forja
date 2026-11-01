import { Archive, Plug, Settings } from 'lucide-react'
import type { ReactNode } from 'react'
import { getDictionary, type Locale } from '@/shared/i18n'
import { useWorkbench } from '@/renderer/src/entities/feature'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup, useDefaultLayout } from '@/shared/ui'
import { layoutStorage } from '@/renderer/src/shared/lib/layout-storage'
import {
  FeaturesSection,
  SpecsSection,
  PlansSection,
  ReviewsSection,
  SkillsSection,
  MemoriesSection,
} from '@/renderer/src/features/project-navigator'
export function ProjectSidebar({ locale }: { locale: Locale }) {
  const state = useWorkbench((s) => s)
  const snapshot = state.snapshot!
  const d = getDictionary(locale)
  const a = d.app
  const paneLayout = useDefaultLayout({
    id: 'forja-sidebar-panes',
    storage: layoutStorage,
    panelIds: ['features', 'specs', 'plans', 'reviews', 'skills', 'memories', 'pane-filler'],
  })
  return (
    <aside
      aria-label={snapshot.project.name}
      className="flex h-full w-full flex-col border-r border-border bg-sidebar text-xs"
    >
      {/* VS Code style panes: each one resizes from the sash above it and collapses to its header. */}
      <ResizablePanelGroup orientation="vertical" className="min-h-0 flex-1" {...paneLayout}>
        <FeaturesSection locale={locale} />
        <ResizableHandle className="bg-border" />
        <SpecsSection locale={locale} />
        <ResizableHandle className="bg-border" />
        <PlansSection locale={locale} />
        <ResizableHandle className="bg-border" />
        <ReviewsSection locale={locale} />
        <ResizableHandle className="bg-border" />
        <SkillsSection locale={locale} />
        <ResizableHandle className="bg-border" />
        <MemoriesSection locale={locale} />
        {/* Absorbs the free height so collapsed panes stack at the top, as in VS Code. */}
        <ResizablePanel id="pane-filler" minSize={0} defaultSize={0} data-slot="pane-filler" />
      </ResizablePanelGroup>
      <nav aria-label={a.workspace} className="shrink-0 border-t border-border p-2">
        <div className="space-y-0.5">
          <WorkspaceButton
            icon={<Archive />}
            label={a.archived}
            onClick={() => state.navigate({ kind: 'archived' })}
          />
          <WorkspaceButton
            icon={<Plug />}
            label="Connectors"
            onClick={() => state.openSettings({ tab: 'connectors' })}
          />
          <WorkspaceButton
            icon={<Settings />}
            label={a.settings}
            onClick={() => state.openSettings({ tab: 'agents' })}
          />
        </div>
      </nav>
    </aside>
  )
}

function WorkspaceButton({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className="flex h-7 w-full items-center gap-2 rounded-sm px-2 text-left text-xs text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring [&_svg]:size-3.5 [&_svg]:shrink-0"
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}
