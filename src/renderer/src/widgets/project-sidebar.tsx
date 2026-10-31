import {
  Folder,
  Search,
  ClipboardList,
  Code,
  FlaskConical,
  GitPullRequest,
  ChevronLeft,
} from 'lucide-react'
import { getDictionary, type Locale } from '@/shared/i18n'
import { StatusBadge } from '@/shared/ui'
import { SidebarRow } from '@/widgets/workbench'
import { useWorkbench } from '@/renderer/src/entities/feature'
import { IconButton } from '@/renderer/src/shared/ui/icon-button'
const icons = {
  research: Search,
  planner: ClipboardList,
  implementer: Code,
  tester: FlaskConical,
  reviewer: GitPullRequest,
}
export function ProjectSidebar({ locale }: { locale: Locale }) {
  const state = useWorkbench((s) => s)
  const snapshot = state.snapshot!
  const d = getDictionary(locale)
  const a = d.app
  return (
    <aside
      aria-label={snapshot.project.name}
      className="w-[240px] shrink-0 overflow-y-auto border-r border-border bg-sidebar text-xs"
    >
      <div className="flex h-9 items-center justify-between border-b border-border px-3">
        <span className="flex min-w-0 items-center gap-2">
          <Folder className="size-3.5 text-primary" />
          <span className="truncate font-semibold">{snapshot.project.name}</span>
        </span>
        <IconButton label={a.collapseLeft} onClick={() => state.togglePanel('left')}>
          <ChevronLeft className="size-3" />
        </IconButton>
      </div>
      <div className="space-y-3 py-2">
        <section>
          <h2 className="flex justify-between px-3 pb-1 text-[11px] uppercase tracking-wider">
            <span>{a.agents}</span>
            <span>5</span>
          </h2>
          {snapshot.agents.map((agent) => {
            const Icon = icons[agent.id]
            return (
              <button
                key={agent.id}
                className="block w-full text-left"
                onClick={() => state.navigate({ kind: 'compose', role: agent.id })}
              >
                <SidebarRow
                  className="h-6 rounded-none border-0 bg-transparent px-3 hover:bg-accent"
                  icon={<Icon />}
                  title={d.product[agent.id]}
                  stateLabel={
                    <StatusBadge className="border-0 bg-transparent p-0" state={agent.state}>
                      {a.ready}
                    </StatusBadge>
                  }
                />
              </button>
            )
          })}
          <button
            className="w-full px-3 py-1 text-left text-muted-foreground hover:bg-accent hover:text-primary"
            onClick={() => state.navigate({ kind: 'settings' })}
          >
            {a.editAgents}
          </button>
        </section>
        {(['spec', 'plan', 'skill'] as const).map((kind) => {
          const items =
            kind === 'skill' ? snapshot.skills : snapshot.artifacts.filter((x) => x.kind === kind)
          return (
            <section key={kind} className="mx-3 border-t border-border pt-3">
              <h2 className="flex justify-between pb-1 text-[11px] uppercase tracking-wider">
                <span>{kind === 'spec' ? a.specs : kind === 'plan' ? a.plans : a.skills}</span>
                <span>{items.length}</span>
              </h2>
              {items.map((item) => (
                <div key={item.id} className="py-1">
                  {item.name}
                </div>
              ))}
              <button
                className="w-full py-1 text-left text-muted-foreground hover:text-primary"
                onClick={() =>
                  kind === 'skill'
                    ? state.navigate({ kind: 'settings' })
                    : state.navigate({
                        kind: 'compose',
                        role: kind === 'plan' ? 'planner' : 'research',
                      })
                }
              >
                {kind === 'spec' ? a.addSpec : kind === 'plan' ? a.addPlan : a.addSkill}
              </button>
            </section>
          )
        })}
      </div>
    </aside>
  )
}
