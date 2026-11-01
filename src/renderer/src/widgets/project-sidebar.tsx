import { ClipboardList, Brain, Plug, Settings } from 'lucide-react'
import type { ReactNode } from 'react'
import { getDictionary, type Locale } from '@/shared/i18n'
import { StatusBadge, type UiState } from '@/shared/ui'
import { SidebarRow } from '@/widgets/workbench'
import { useWorkbench } from '@/renderer/src/entities/feature'
import { FeaturesSection } from '@/renderer/src/features/project-navigator'
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
      <div className="min-h-0 flex-1 overflow-y-auto py-2">
        <div className="space-y-3">
          <FeaturesSection locale={locale} />
          {(['spec', 'plan', 'review', 'skill'] as const).map((kind) => {
            const items: { id: string; name: string; state?: UiState }[] =
              kind === 'skill' ? snapshot.skills : snapshot.artifacts.filter((x) => x.kind === kind)
            return (
              <section key={kind} className="mx-3 border-t border-border pt-3">
                <h2 className="flex justify-between pb-1 text-[11px] uppercase tracking-wider">
                  <span>
                    {kind === 'spec'
                      ? a.specs
                      : kind === 'plan'
                        ? a.plans
                        : kind === 'review'
                          ? locale === 'en'
                            ? 'Reviews'
                            : 'Revisões'
                          : a.skills}
                  </span>
                  <span>{items.length}</span>
                </h2>
                {items.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    className="block w-full text-left focus-visible:outline-2 focus-visible:outline-ring"
                    onClick={() =>
                      kind === 'skill'
                        ? state.openSettings({ tab: 'agents' })
                        : void state.openDocument(item.id)
                    }
                  >
                    <SidebarRow
                      icon={<ClipboardList />}
                      title={item.name}
                      stateLabel={
                        item.state ? (
                          <StatusBadge size="sm" state={item.state}>
                            {a.states[item.state]}
                          </StatusBadge>
                        ) : undefined
                      }
                    />
                  </button>
                ))}
                {kind !== 'review' && (
                  <button
                    type="button"
                    className="focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-2 w-full py-1 text-left text-muted-foreground hover:text-primary"
                    onClick={() =>
                      kind === 'skill'
                        ? state.openSettings({ tab: 'agents' })
                        : state.startCompose(kind === 'plan' ? 'planner' : 'research')
                    }
                  >
                    {kind === 'spec' ? a.addSpec : kind === 'plan' ? a.addPlan : a.addSkill}
                  </button>
                )}
              </section>
            )
          })}
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
