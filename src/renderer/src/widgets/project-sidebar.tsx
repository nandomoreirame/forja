import { Archive, Plug, Settings } from 'lucide-react'
import { useRef, type ReactNode } from 'react'
import { getDictionary, type Locale } from '@/shared/i18n'
import { useWorkbench } from '@/renderer/src/entities/feature'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  useDefaultLayout,
  useGroupRef,
} from '@/shared/ui'
import { layoutStorage } from '@/renderer/src/shared/lib/layout-storage'
import {
  FeaturesSection,
  SpecsSection,
  PlansSection,
  ReviewsSection,
  SkillsSection,
  MemoriesSection,
} from '@/renderer/src/features/project-navigator'
import { stackPanes } from '@/renderer/src/features/project-navigator/stack-panes'
import { paneHeaderSize } from '@/renderer/src/features/project-navigator/section'
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
  const group = useGroupRef()
  const groupElement = useRef<HTMLDivElement | null>(null)
  const onLayoutChanged: typeof paneLayout.onLayoutChanged = (layout, meta) => {
    paneLayout.onLayoutChanged(layout, meta)
    const height = groupElement.current?.clientHeight
    if (!height) return
    const next = stackPanes(layout, (paneHeaderSize / height) * 100, 'pane-filler')
    if (next) group.current?.setLayout(next)
  }
  return (
    <aside
      aria-label={snapshot.project.name}
      data-slot="workbench-part"
      data-part="sidebar"
      className="flex h-full w-full flex-col overflow-hidden rounded-part border border-border text-xs"
    >
      {/* VS Code style panes: each one resizes from the sash above it and collapses to its header. */}
      <ResizablePanelGroup
        orientation="vertical"
        className="min-h-0 flex-1"
        {...paneLayout}
        groupRef={group}
        elementRef={groupElement}
        onLayoutChanged={onLayoutChanged}
      >
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
        {/* Holds the free height only while every pane is collapsed (see stackPanes). */}
        <ResizablePanel id="pane-filler" minSize={0} defaultSize={0} data-slot="pane-filler" />
      </ResizablePanelGroup>
      <nav aria-label={a.workspace} className="shrink-0 border-t border-border p-2">
        <div className="space-y-0.5">
          <WorkspaceButton
            icon={<Archive />}
            label={a.archived}
            onClick={() => state.openArchived()}
          />
          <WorkspaceButton
            icon={<Plug />}
            label="Connectors"
            onClick={() => state.openSettings({ tab: 'connectors' })}
          />
          <WorkspaceButton
            icon={<Settings />}
            label={a.settings}
            onClick={() => state.openSettings({ tab: 'general' })}
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
