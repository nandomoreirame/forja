import { ComposePage } from '@/renderer/src/pages/compose'
import { ConversationPage } from '@/renderer/src/pages/conversation'
import { CommandPalette, type CommandId } from '@/renderer/src/features/command-palette'
import { HomePage } from '@/renderer/src/pages/home'
import { useShortcuts } from '@/renderer/src/shared/lib/shortcuts'
import { useEffect, useState, useRef } from 'react'
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
import { TerminalFooterToolbar, TerminalPanel } from '@/renderer/src/features/terminal'
export function WorkbenchPage({
  source,
  initialProjectId,
}: {
  source: WorkbenchSource
  initialProjectId?: string
}) {
  const [store] = useState(() => createWorkbenchStore(source))
  useEffect(() => {
    if (initialProjectId) void store.getState().openProject(initialProjectId)
    else void store.getState().loadProjects()
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
  const focusComposer = useRef(false)
  const opener = useRef<HTMLElement | null>(null)
  const a = getDictionary(s.source.locale).app
  const selectedFeature =
    s.view.kind === 'conversation'
      ? s.snapshot?.features.find(
          (f) => s.view.kind === 'conversation' && f.id === s.view.featureId,
        )
      : undefined
  useShortcuts({
    'ctrl+n': () => {
      if (s.snapshot) s.startCompose()
    },
    'ctrl+o': () => void s.openDirectory(),
    'ctrl+r': () => s.openPalette('recent'),
    'ctrl+,': () => {
      s.closePalette()
      s.navigate({ kind: 'settings' })
    },
    'ctrl+shift+p': () => s.openPalette('all'),
    'alt+arrowleft': s.back,
    'alt+arrowright': s.forward,
  })
  const runCommand = (id: CommandId) => {
    if (id === 'new-conversation' && s.snapshot) {
      focusComposer.current = true
      s.startCompose()
    }
    if (id === 'open-project') void s.openDirectory()
    if (id === 'recent-projects') s.openPalette('recent')
    if (id === 'settings') s.navigate({ kind: 'settings' })
    if (id === 'toggle-terminals' && s.snapshot) s.togglePanel('terminal')
  }
  return (
    <div
      className="flex h-full min-h-0 flex-col bg-background text-foreground"
      lang={s.source.locale === 'pt-br' ? 'pt-BR' : 'en'}
    >
      <AppTopbar
        brand="FORJA"
        commandText={s.snapshot?.project.name ?? 'Forja'}
        onCommand={() => s.openPalette('all')}
        settingsLabel={a.settings}
        onSettings={() => s.navigate({ kind: 'settings' })}
        onBack={s.back}
        onForward={s.forward}
        canBack={s.historyIndex > 0}
        canForward={s.historyIndex < s.history.length - 1}
        backLabel={a.back}
        forwardLabel={a.forward}
      />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {s.snapshot ? (
          s.panels.left ? (
            <ProjectSidebar locale={s.source.locale} />
          ) : (
            <div className="border-r border-border bg-sidebar">
              <IconButton label={a.expandLeft} onClick={() => s.togglePanel('left')}>
                <ChevronRight />
              </IconButton>
            </div>
          )
        ) : null}
        <main className="flex min-w-0 flex-1 flex-col overflow-auto">
          {s.loading ? <p role="status">{a.loading}</p> : null}
          {s.error ? (
            <div role="alert">
              {s.error === 'Directory picker unavailable' ? a.pickerUnavailable : a.error}
              <button type="button" onClick={() => void s.retryLoad()}>
                {a.retry}
              </button>
            </div>
          ) : null}
          {s.snapshot && s.panels.terminal && s.panels.terminalMaximized ? null : s.view.kind ===
            'home' ? (
            <HomePage />
          ) : s.view.kind === 'compose' ? (
            <ComposePage />
          ) : s.view.kind === 'conversation' ? (
            <ConversationPage />
          ) : (
            <section className="flex-1 p-6 text-muted-foreground">
              {s.view.kind === 'settings' ? a.settings : ''}
            </section>
          )}
          {s.snapshot && s.panels.terminal ? <TerminalPanel feature={selectedFeature} /> : null}
        </main>
        {s.snapshot ? (
          s.panels.right ? (
            <GitContext locale={s.source.locale} />
          ) : (
            <div className="border-l border-border bg-sidebar">
              <IconButton label={a.expandRight} onClick={() => s.togglePanel('right')}>
                <ChevronLeft />
              </IconButton>
            </div>
          )
        ) : null}
      </div>
      <CommandPalette
        open={s.palette.open}
        scope={s.palette.scope}
        locale={s.source.locale}
        projects={s.projects}
        currentProjectId={s.snapshot?.project.id ?? ''}
        onOpenChange={(open) => {
          if (!open) s.closePalette()
        }}
        onSelectProject={(id) => void s.openProject(id)}
        onCommand={runCommand}
        onOpenAutoFocus={() => {
          opener.current =
            document.activeElement instanceof HTMLElement ? document.activeElement : null
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          if (focusComposer.current) {
            focusComposer.current = false
            document.querySelector<HTMLTextAreaElement>('textarea')?.focus()
          } else if (opener.current?.isConnected) opener.current.focus()
        }}
      />
      <AppStatusbar
        items={[s.snapshot?.project.path ?? a.noProject]}
        end={s.snapshot ? <TerminalFooterToolbar feature={selectedFeature} /> : undefined}
      />
    </div>
  )
}
