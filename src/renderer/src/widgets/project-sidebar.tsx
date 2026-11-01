import { ClipboardList, Brain, Plug, Settings } from 'lucide-react'
import type { ReactNode } from 'react'
import { getDictionary, type Locale } from '@/shared/i18n'
import { SidebarRow } from '@/widgets/workbench'
import { useWorkbench } from '@/renderer/src/entities/feature'
import {
  FeaturesSection,
  SpecsSection,
  PlansSection,
  ReviewsSection,
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
          <section className="mx-3 flex min-h-0 shrink flex-col border-t border-border pt-3">
            <h2 className="flex justify-between pb-1 text-[11px] uppercase tracking-wider">
              <span>{a.skills}</span>
              <span>{snapshot.skills.length}</span>
            </h2>
            <div
              data-testid="section-scroll"
              className={`max-h-[16.5rem] shrink overflow-y-auto ${snapshot.skills.length ? 'min-h-16' : 'min-h-0'}`}
            >
              {snapshot.skills.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className="block w-full text-left focus-visible:outline-2 focus-visible:outline-ring"
                  onClick={() => state.openSettings({ tab: 'agents' })}
                >
                  <SidebarRow icon={<ClipboardList />} title={item.name} />
                </button>
              ))}
            </div>
            <button
              type="button"
              className="focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-2 w-full py-1 text-left text-muted-foreground hover:text-primary"
              onClick={() => state.openSettings({ tab: 'agents' })}
            >
              {a.addSkill}
            </button>
          </section>
        </div>
      </div>
      <nav
        aria-label={locale === 'pt-br' ? 'Espaço de trabalho' : 'Workspace'}
        className="shrink-0 border-t border-border p-2"
      >
        <div className="space-y-0.5">
          <WorkspaceButton
            icon={<Brain />}
            label="Memory"
            onClick={() => state.openSettings({ tab: 'memory' })}
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
