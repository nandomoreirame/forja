import { cn } from '@/shared/ui/utils'
import { Square } from 'lucide-react'
import { TerminalPreview } from '@/widgets/terminal'
import { Button } from '@/shared/ui'
import { getDictionary } from '@/shared/i18n'
import { useWorkbench } from '@/renderer/src/entities/feature'
import type { FeatureSnapshot } from '@/renderer/src/shared/api'
import { selectedTerminal, terminalStateLabel, terminalTabState } from './model'

export function TerminalPanel({ feature }: { feature?: FeatureSnapshot }) {
  const state = useWorkbench((s) => s)
  const d = getDictionary(state.source.locale)
  const a = d.app
  const active = selectedTerminal(feature, state.terminalTabs)
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
      className={state.panels.terminalMaximized ? 'flex min-h-0 flex-1 flex-col' : undefined}
    >
      <TerminalPreview
        className={cn(
          'rounded-none border-0',
          state.panels.terminalMaximized && 'flex min-h-0 flex-1 flex-col',
        )}
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
        emptyOutputLabel={feature?.terminals.length ? a.waitingOutput : a.noTerminals}
        addLabel={a.newTerminal}
        collapseLabel={a.collapseTerminals}
        tabsLabel={a.terminalTabs}
        header={header}
        cwd={active?.cwd}
        cwdLabel={a.workingDirectory}
        onAdd={feature ? () => state.addShell(feature.id) : undefined}
        onCollapse={() => {
          state.setPanel('terminalMaximized', false)
          state.setPanel('terminal', false)
        }}
        onMaximize={() => state.togglePanel('terminalMaximized')}
        maximized={state.panels.terminalMaximized}
        maximizeLabel={a.maximizePanel}
        restoreLabel={a.restorePanel}
        onClose={(id) => feature && state.closeTerminal(feature.id, id)}
        closeLabel={a.close}
      />
    </section>
  )
}
