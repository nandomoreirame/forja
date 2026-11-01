import { Archive, KanbanSquare, ListTodo, Plug, Settings } from 'lucide-react'
import { isEnabled } from '@/renderer/src/shared/lib/feature-flags'
import type { ReactNode } from 'react'
import { getDictionary, type Locale } from '@/shared/i18n'
import { useWorkbench } from '@/renderer/src/entities/feature'
import { ResizableHandle } from '@/shared/ui'
import {
  FeaturesSection,
  SpecsSection,
  PlansSection,
  ReviewsSection,
  SkillsSection,
  MemoriesSection,
} from '@/renderer/src/features/project-navigator'
import { PaneStack } from '@/renderer/src/features/project-navigator/pane-stack'
export function ProjectSidebar({ locale }: { locale: Locale }) {
  const state = useWorkbench((s) => s)
  const snapshot = state.snapshot!
  const d = getDictionary(locale)
  const a = d.app
  return (
    <aside
      aria-label={snapshot.project.name}
      data-slot="workbench-part"
      data-part="sidebar"
      className="flex h-full w-full flex-col overflow-hidden rounded-part border border-border text-xs"
    >
      {/* VS Code style panes: each one resizes from the sash above it and collapses to its header. */}
      <PaneStack
        id="forja-sidebar-panes"
        panes={['features', 'specs', 'plans', 'reviews', 'skills', 'memories']}
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
      </PaneStack>
      {/* The footer never takes more than 45% of the height, so the panes keep room. */}
      <div className="flex max-h-[45%] min-h-0 shrink-0 flex-col border-t border-border">
        <nav aria-label={a.workspace} className="shrink-0 border-t border-border p-2">
          <div className="space-y-0.5">
            {isEnabled('backlog-board') ? (
              <>
                <WorkspaceButton
                  icon={<ListTodo />}
                  label={a.backlog.title}
                  onClick={() => state.openBacklog()}
                />
                <WorkspaceButton
                  icon={<KanbanSquare />}
                  label={a.board.title}
                  onClick={() => state.openBoard()}
                />
              </>
            ) : null}
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
      </div>
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
