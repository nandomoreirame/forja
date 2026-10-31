import { Square } from 'lucide-react'
import { TerminalPreview } from '@/widgets/terminal'
import { Button } from '@/shared/ui'
import { getDictionary } from '@/shared/i18n'
import { useWorkbench } from '@/renderer/src/entities/feature'
import type { FeatureSnapshot } from '@/renderer/src/shared/api'
import { useEffect } from 'react'
import { selectedTerminal, terminalStateLabel, terminalTabState } from './model'
import { getPtyRuntime } from './pty-runtime'
import { XtermView } from './xterm-view'

export function TerminalPanel({ feature }: { feature?: FeatureSnapshot }) {
  const state = useWorkbench((s) => s)
  const d = getDictionary(state.source.locale)
  const a = d.app
  const active = selectedTerminal(feature, state.terminalTabs)
  const runtime = getPtyRuntime()
  const markExited = state.markTerminalExited
  const setShell = state.setTerminalShell
  const setProcess = state.setTerminalProcess
  const closeTerminal = state.closeTerminal
  useEffect(() => {
    if (!runtime) return
    // A shell that exits on its own (exit, Ctrl+D) closes its tab like VS Code;
    // a shell that never started stays visible as failed.
    const onExit = (featureId: string, terminalId: string, exitCode: number) => {
      if (exitCode === -1) return markExited(featureId, terminalId, exitCode)
      runtime.sessions.close(terminalId)
      closeTerminal(featureId, terminalId)
    }
    runtime.listeners.add(onExit)
    runtime.startListeners.add(setShell)
    runtime.processListeners.add(setProcess)
    return () => {
      runtime.listeners.delete(onExit)
      runtime.startListeners.delete(setShell)
      runtime.processListeners.delete(setProcess)
    }
  }, [runtime, markExited, closeTerminal, setShell, setProcess])
  const liveShell =
    runtime && feature && active?.kind === 'shell' ? (
      <XtermView
        key={active.id}
        terminalId={active.id}
        featureId={feature.id}
        cwd={active.cwd ?? feature.worktree ?? feature.destination}
        sessions={runtime.sessions}
        label={active.label}
      />
    ) : undefined
  const header =
    active?.kind === 'agent' ? (
      <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2 text-[11px]">
        <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
          <span className="font-medium text-foreground">
            {active.agent ? d.product[active.agent] : active.label}
          </span>
          <span>{a.viaMcp}</span>
          <span className={active.state === 'running' ? 'text-primary' : undefined}>
            {terminalStateLabel(active, d)}
          </span>
          {active.command ? (
            <span className="truncate font-mono text-foreground">
              {a.terminalCommand}: {active.command}
            </span>
          ) : null}
        </span>
        {active.state === 'running' && feature ? (
          <Button
            variant="outline"
            size="sm"
            className="h-6 gap-1 text-[11px]"
            onClick={() => state.stopTerminal(feature.id, active.id)}
          >
            <Square className="size-3" aria-hidden="true" />
            {a.stopProcess}
          </Button>
        ) : null}
      </div>
    ) : null
  return (
    <section
      aria-label={a.terminalPanel}
      data-maximized={state.panels.terminalMaximized ? 'true' : undefined}
      className="flex h-full min-h-0 flex-col"
    >
      <TerminalPreview
        className="flex min-h-0 flex-1 flex-col rounded-none border-0"
        tabs={(feature?.terminals ?? []).map((terminal) => ({
          id: terminal.id,
          label: terminal.label,
          state: terminalTabState(terminal),
          stateLabel: terminalStateLabel(terminal, d),
          detail: terminal.command ?? terminal.cwd,
          closable: !(terminal.kind === 'agent' && terminal.state === 'running'),
        }))}
        activeId={active?.id ?? ''}
        onSelect={(id) => feature && state.selectTerminal(feature.id, id)}
        output={active ? active.output.split('\n') : []}
        emptyOutputLabel={feature?.terminals.length ? a.waitingOutput : ''}
        addLabel={a.newTerminal}
        collapseLabel={a.collapseTerminals}
        tabsLabel={a.terminalTabs}
        header={header}
        body={liveShell}
        onAdd={feature ? () => state.addShell(feature.id) : undefined}
        onCollapse={() => {
          state.setPanel('terminalMaximized', false)
          state.setPanel('terminal', false)
        }}
        onMaximize={() => state.togglePanel('terminalMaximized')}
        maximized={state.panels.terminalMaximized}
        maximizeLabel={a.maximizePanel}
        restoreLabel={a.restorePanel}
        onClose={(id) => {
          if (!feature) return
          runtime?.sessions.close(id)
          state.closeTerminal(feature.id, id)
        }}
        closeLabel={a.close}
      />
    </section>
  )
}
