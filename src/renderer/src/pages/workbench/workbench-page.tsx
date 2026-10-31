import { HomePage } from '@/renderer/src/pages/home'
import { useShortcuts } from '@/renderer/src/shared/lib/shortcuts'
import { useEffect, useState } from 'react'
import type { WorkbenchSource } from '@/renderer/src/shared/api'
import {
  createWorkbenchStore,
  WorkbenchProvider,
  useWorkbench,
} from '@/renderer/src/entities/feature'
import { AppTopbar, AppStatusbar } from '@/widgets/workbench'
import { TooltipProvider } from '@/shared/ui'
import { getDictionary } from '@/shared/i18n'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ProjectSidebar } from '@/renderer/src/widgets/project-sidebar'
import { GitContext } from '@/renderer/src/widgets/git-context'
import { IconButton } from '@/renderer/src/shared/ui/icon-button'
export function WorkbenchPage({
  source,
  initialProjectId,
}: {
  source: WorkbenchSource
  initialProjectId: string
}) {
  const [store] = useState(() => createWorkbenchStore(source))
  useEffect(() => {
    void store.getState().openProject(initialProjectId)
  }, [store, initialProjectId])
  return (
    <WorkbenchProvider store={store}>
      <TooltipProvider>
        <WorkbenchShell />
      </TooltipProvider>
    </WorkbenchProvider>
  )
}
function WorkbenchShell() {
  const s = useWorkbench((s) => s)
  const a = getDictionary(s.source.locale).app
  useShortcuts({
    'ctrl+n': () => s.navigate({ kind: 'compose', role: 'research' }),
    'ctrl+r': () => s.openPalette('recent'),
    'ctrl+shift+p': () => s.openPalette('all'),
    'alt+arrowleft': s.back,
    'alt+arrowright': s.forward,
  })
  if (!s.snapshot)
    return (
      <main aria-busy={s.loading}>
        {s.error ? (
          <div role="alert">
            {a.error}
            <button onClick={() => void s.openProject('acme-api')}>{a.retry}</button>
          </div>
        ) : (
          <p role="status">{a.loading}</p>
        )}
      </main>
    )
  return (
    <div
      className="flex h-full min-h-0 flex-col bg-background text-foreground"
      lang={s.source.locale === 'pt-br' ? 'pt-BR' : 'en'}
    >
      <AppTopbar
        brand="FORJA"
        commandText={s.snapshot.project.name}
        onCommand={() => s.openPalette('all')}
        settingsLabel={a.settings}
        onSettings={() => s.navigate({ kind: 'settings' })}
        onBack={s.back}
        onForward={s.forward}
        canBack={s.historyIndex > 0}
        canForward={s.historyIndex < s.history.length - 1}
        onTerminal={() => s.togglePanel('terminal')}
        terminalOpen={s.panels.terminal}
        terminalLabel={a.terminals}
        backLabel={a.back}
        forwardLabel={a.forward}
      />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {s.panels.left ? (
          <ProjectSidebar locale={s.source.locale} />
        ) : (
          <div className="border-r border-border bg-sidebar">
            <IconButton label={a.expandLeft} onClick={() => s.togglePanel('left')}>
              <ChevronRight />
            </IconButton>
          </div>
        )}
        <main className="flex min-w-0 flex-1 flex-col overflow-auto">
          {s.view.kind === 'home' ? (
            <HomePage />
          ) : (
            <section className="flex-1 p-6 text-muted-foreground">
              {s.view.kind === 'compose'
                ? a.newConversation
                : s.view.kind === 'settings'
                  ? a.settings
                  : s.view.kind === 'conversation'
                    ? s.snapshot.features.find(
                        (f) => s.view.kind === 'conversation' && f.id === s.view.featureId,
                      )?.name
                    : ''}
            </section>
          )}
          {s.panels.terminal ? (
            <section
              aria-label={a.terminals}
              className="border-t border-border p-3 text-xs text-muted-foreground"
            >
              {a.mockTerminal}
            </section>
          ) : null}
        </main>
        {s.panels.right ? (
          <GitContext locale={s.source.locale} />
        ) : (
          <div className="border-l border-border bg-sidebar">
            <IconButton label={a.expandRight} onClick={() => s.togglePanel('right')}>
              <ChevronLeft />
            </IconButton>
          </div>
        )}
      </div>
      <AppStatusbar items={[s.snapshot.project.path, 'UTF-8']} />
    </div>
  )
}
