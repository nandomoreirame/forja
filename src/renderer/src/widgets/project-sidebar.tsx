import { Plug, Settings } from 'lucide-react'
import type { ReactNode } from 'react'
import { getDictionary, type Locale } from '@/shared/i18n'
import { useWorkbench } from '@/renderer/src/entities/feature'
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
  return (
    <aside
      aria-label={snapshot.project.name}
      className="flex h-full w-full flex-col border-r border-border bg-sidebar text-xs"
    >
      {/* Sections scroll on their own (up to 8 rows each) and shrink when the sidebar is short. */}
      <div
        data-slot="sidebar-sections"
        className="flex min-h-0 flex-1 flex-col overflow-hidden py-2"
      >
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <FeaturesSection locale={locale} />
          <SpecsSection locale={locale} />
          <PlansSection locale={locale} />
          <ReviewsSection locale={locale} />
          <SkillsSection locale={locale} />
          <MemoriesSection locale={locale} />
        </div>
      </div>
      <nav aria-label={a.workspace} className="shrink-0 border-t border-border p-2">
        <div className="space-y-0.5">
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
