import { layoutStorage } from '@/renderer/src/shared/lib/layout-storage'
import { ArchivedPage } from '@/renderer/src/pages/archived'
import { DocumentPage, AuthoringPage } from '@/renderer/src/pages/document'
import { ComposePage } from '@/renderer/src/pages/compose'
import { ConversationPage } from '@/renderer/src/pages/conversation'
import { SettingsPage } from '@/renderer/src/pages/settings'
import { CommandPalette, type CommandId } from '@/renderer/src/features/command-palette'
import { HomePage } from '@/renderer/src/pages/home'
import { useShortcuts } from '@/renderer/src/shared/lib/shortcuts'
import { useEffect, useState, useRef } from 'react'
import type { WorkbenchSource } from '@/renderer/src/shared/api'
import {
  createWorkbenchStore,
  projectTerminalScope,
  WorkbenchProvider,
  useWorkbench,
} from '@/renderer/src/entities/feature'
import { AppTopbar, AppStatusbar } from '@/widgets/workbench'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  SidebarProvider,
  TooltipProvider,
  useDefaultLayout,
  useGroupRef,
} from '@/shared/ui'
import { getDictionary } from '@/shared/i18n'
import { ChevronLeft } from 'lucide-react'
import { ProjectSidebar } from '@/renderer/src/widgets/project-sidebar'
import { WorkbenchTabs } from '@/renderer/src/widgets/workbench-tabs'
import { SidebarRail, SidebarToggle } from '@/renderer/src/widgets/sidebar-rail'
import { GitContext } from '@/renderer/src/widgets/git-context'
import { GitStatus } from '@/renderer/src/widgets/git-status'
import { ProjectSwitcher } from '@/renderer/src/widgets/project-switcher'
import { IconButton } from '@/renderer/src/shared/ui/icon-button'
import { TerminalFooterToolbar, TerminalPanel } from '@/renderer/src/features/terminal'
import { UsagePopover } from '@/renderer/src/features/usage/usage-popover'
const mainLayoutKey = 'react-resizable-panels:forja-main:content:terminal'

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
  const terminalOpen = Boolean(s.snapshot && s.panels.terminal)
  const terminalMaximized = terminalOpen && s.panels.terminalMaximized
  const workbenchLayout = useDefaultLayout({
    id: 'forja-workbench',
    storage: layoutStorage,
    panelIds: s.snapshot && s.panels.left ? ['sidebar', 'main'] : ['main'],
  })
  const mainGroup = useGroupRef()
  const mainLayout = useDefaultLayout({
    id: 'forja-main',
    storage: layoutStorage,
    panelIds: terminalMaximized
      ? ['terminal']
      : terminalOpen
        ? ['content', 'terminal']
        : ['content'],
  })
  const selectedFeature =
    s.view.kind === 'conversation'
      ? s.snapshot?.features.find(
          (f) => s.view.kind === 'conversation' && f.id === s.view.featureId,
        )
      : undefined
  const terminalScope =
    selectedFeature ?? (s.snapshot ? projectTerminalScope(s.snapshot) : undefined)
  useShortcuts({
    'ctrl+n': () => {
      if (s.snapshot) s.startCompose()
    },
    'ctrl+o': () => void s.openDirectory(),
    'ctrl+r': () => s.openPalette('recent'),
    'ctrl+,': () => {
      s.closePalette()
      s.openSettings()
    },
    'ctrl+shift+p': () => s.openPalette('all'),
    'ctrl+w': () => s.closeActiveTab(),
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
    if (id === 'settings') s.openSettings()
    if (id === 'toggle-terminals' && s.snapshot) s.toggleTerminals(terminalScope?.id)
  }
  return (
    // shadcn's SidebarProvider owns the open state (mirrored in the store) and Ctrl+B.
    <SidebarProvider
      open={s.panels.left}
      onOpenChange={(open) => s.setPanel('left', open)}
      className="h-full min-h-0 flex-col bg-background text-foreground"
      lang={s.source.locale === 'pt-br' ? 'pt-BR' : 'en'}
    >
      <AppTopbar
        brand="FORJA"
        project={s.snapshot ? <SidebarToggle /> : undefined}
        usage={
          <UsagePopover
            source={s.source}
            compact
            label={s.source.locale === 'pt-br' ? 'Uso' : 'Usage'}
            unavailableLabel={
              s.source.locale === 'pt-br' ? 'Uso indisponível' : 'Usage unavailable'
            }
          />
        }
        commandText={s.snapshot?.project.name ?? 'Forja'}
        onCommand={() => s.openPalette('all')}
        backLabel={a.back}
        forwardLabel={a.forward}
      />
      {/* VS Code parts: each area has its own rounded frame, with a small gap around it. */}
      <div className="flex min-h-0 flex-1 overflow-hidden px-1">
        {s.snapshot && !s.panels.left ? (
          <div className="p-1">
            <SidebarRail />
          </div>
        ) : null}
        <ResizablePanelGroup
          orientation="horizontal"
          className="min-w-0 flex-1"
          {...workbenchLayout}
        >
          {s.snapshot && s.panels.left ? (
            <>
              <ResizablePanel
                id="sidebar"
                minSize={170}
                maxSize={480}
                defaultSize={240}
                groupResizeBehavior="preserve-pixel-size"
              >
                <div className="h-full p-1">
                  <ProjectSidebar locale={s.source.locale} />
                </div>
              </ResizablePanel>
              <ResizableHandle aria-label={a.resizeSidebar} />
            </>
          ) : null}
          <ResizablePanel id="main" minSize={320}>
            <main className="flex h-full min-w-0 flex-col overflow-hidden">
              {s.loading ? <p role="status">{a.loading}</p> : null}
              {s.error ? (
                <div role="alert">
                  {s.error === 'Directory picker unavailable' ? a.pickerUnavailable : a.error}
                  <button type="button" onClick={() => void s.retryLoad()}>
                    {a.retry}
                  </button>
                </div>
              ) : null}
              <ResizablePanelGroup
                orientation="vertical"
                groupRef={mainGroup}
                className="min-h-0 flex-1"
                {...mainLayout}
              >
                {terminalMaximized ? null : (
                  <ResizablePanel id="content" minSize={120}>
                    <div className="h-full p-1">
                      <div
                        data-slot="workbench-part"
                        data-part="editor"
                        className="flex h-full min-h-0 flex-col overflow-hidden rounded-part border border-border"
                      >
                        {s.snapshot ? <WorkbenchTabs /> : null}
                        <div className="flex min-h-0 flex-1 flex-col overflow-auto">
                          {s.view.kind === 'archived' ? (
                            <ArchivedPage />
                          ) : s.view.kind === 'authoring' ? (
                            <AuthoringPage />
                          ) : s.view.kind === 'home' ? (
                            <HomePage />
                          ) : s.view.kind === 'compose' ? (
                            <ComposePage />
                          ) : s.view.kind === 'conversation' ? (
                            <ConversationPage />
                          ) : s.view.kind === 'document' ? (
                            <DocumentPage />
                          ) : s.view.kind === 'settings' ? (
                            <SettingsPage />
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </ResizablePanel>
                )}
                {terminalOpen && !terminalMaximized ? (
                  <ResizableHandle aria-label={a.resizeTerminalPanel} />
                ) : null}
                {terminalOpen ? (
                  <ResizablePanel
                    id="terminal"
                    minSize={77}
                    defaultSize={300}
                    collapsible
                    collapsedSize={0}
                    onResize={(size, _id, previous) => {
                      if (size.inPixels === 0 && previous && previous.inPixels > 0) {
                        // Restore the last saved size in memory so reopening is not collapsed.
                        const saved = layoutStorage.getItem(mainLayoutKey)
                        try {
                          if (saved) mainGroup.current?.setLayout(JSON.parse(saved))
                        } catch {
                          // A corrupt saved layout just falls back to the default size.
                        }
                        s.setPanel('terminalMaximized', false)
                        s.setPanel('terminal', false)
                      }
                    }}
                    groupResizeBehavior={terminalMaximized ? undefined : 'preserve-pixel-size'}
                  >
                    <div className="h-full p-1">
                      <div
                        data-slot="workbench-part"
                        data-part="panel"
                        className="h-full overflow-hidden rounded-part border border-border"
                      >
                        <TerminalPanel feature={terminalScope} />
                      </div>
                    </div>
                  </ResizablePanel>
                ) : null}
              </ResizablePanelGroup>
            </main>
          </ResizablePanel>
        </ResizablePanelGroup>
        {s.snapshot ? (
          s.panels.right ? (
            <div className="flex shrink-0 p-1">
              <GitContext locale={s.source.locale} />
            </div>
          ) : (
            <div className="p-1">
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
        start={<ProjectSwitcher />}
        end={
          s.snapshot ? (
            <>
              <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
                <TerminalFooterToolbar feature={terminalScope} />
              </div>
              <span role="separator" aria-orientation="vertical" className="h-3.5 w-px bg-border" />
              <GitStatus />
            </>
          ) : undefined
        }
      />
    </SidebarProvider>
  )
}
