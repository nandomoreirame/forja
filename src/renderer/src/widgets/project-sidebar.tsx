import {
  Folder,
  Search,
  ClipboardList,
  Code,
  FlaskConical,
  GitPullRequest,
  ChevronLeft,
  Ellipsis,
} from 'lucide-react'
import { getDictionary, type Locale } from '@/shared/i18n'
import { StatusBadge, type UiState } from '@/shared/ui'
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
        <button
          type="button"
          aria-label={`${snapshot.project.name}, ${a.switchProject}`}
          onClick={() => state.openPalette('recent')}
          className="flex min-w-0 items-center gap-2 rounded-sm focus-visible:outline-2 focus-visible:outline-ring"
        >
          <Folder className="size-3.5 text-primary" />
          <span className="truncate font-semibold">{snapshot.project.name}</span>
        </button>
        <IconButton label={a.projectActions} onClick={() => state.openPalette('recent')}>
          <Ellipsis className="size-3" />
        </IconButton>
        <IconButton label={a.collapseLeft} onClick={() => state.togglePanel('left')}>
          <ChevronLeft className="size-3" />
        </IconButton>
      </div>
      <div className="space-y-3 py-2">
        <section>
          <h2 className="flex justify-between px-3 pb-1 text-[11px] uppercase tracking-wider">
            <span>{a.agents}</span>
            <span>{snapshot.agents.length}</span>
          </h2>
          {snapshot.agents.map((agent) => {
            const Icon = icons[agent.id]
            return (
              <button
                type="button"
                key={agent.id}
                className="block w-full text-left focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-2"
                onClick={() => {
                  if (state.openFeatureIds.length === 0) state.startCompose(agent.id)
                  else {
                    const id =
                      state.view.kind === 'conversation'
                        ? state.view.featureId
                        : state.openFeatureIds[state.openFeatureIds.length - 1]
                    state.setRecipient(id, agent.id)
                    state.selectFeature(id)
                    state.focusComposer()
                  }
                }}
              >
                <SidebarRow
                  className="h-7 rounded-none border-0 bg-transparent px-3 hover:bg-accent"
                  icon={<Icon />}
                  title={d.product[agent.id]}
                  stateLabel={
                    <StatusBadge state={agent.state}>{a.states[agent.state]}</StatusBadge>
                  }
                />
              </button>
            )
          })}
          <button
            type="button"
            className="focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-2 w-full px-3 py-1 text-left text-muted-foreground hover:bg-accent hover:text-primary"
            onClick={() => state.navigate({ kind: 'settings' })}
          >
            {a.editAgents}
          </button>
        </section>
        {(['spec', 'plan', 'skill'] as const).map((kind) => {
          const items: { id: string; name: string; state?: UiState }[] =
            kind === 'skill' ? snapshot.skills : snapshot.artifacts.filter((x) => x.kind === kind)
          return (
            <section key={kind} className="mx-3 border-t border-border pt-3">
              <h2 className="flex justify-between pb-1 text-[11px] uppercase tracking-wider">
                <span>{kind === 'spec' ? a.specs : kind === 'plan' ? a.plans : a.skills}</span>
                <span>{items.length}</span>
              </h2>
              {items.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className="block w-full text-left focus-visible:outline-2 focus-visible:outline-ring"
                  onClick={() =>
                    kind === 'skill'
                      ? state.navigate({ kind: 'settings' })
                      : state.navigate({ kind: 'document', artifactId: item.id })
                  }
                >
                  <SidebarRow
                    icon={<ClipboardList />}
                    title={item.name}
                    stateLabel={
                      item.state ? (
                        <StatusBadge state={item.state}>{a.states[item.state]}</StatusBadge>
                      ) : undefined
                    }
                  />
                </button>
              ))}
              <button
                type="button"
                className="focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-2 w-full py-1 text-left text-muted-foreground hover:text-primary"
                onClick={() =>
                  kind === 'skill'
                    ? state.navigate({ kind: 'settings' })
                    : state.startCompose(kind === 'plan' ? 'planner' : 'research')
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
