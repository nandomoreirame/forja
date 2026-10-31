import { ChevronDown, Plus, SquareTerminal } from 'lucide-react'
import { Button } from '@/shared/ui'
import { cn } from '@/shared/ui/utils'

export interface TerminalTab {
  id: string
  label: string
  state: 'running' | 'done' | 'idle'
  stateLabel: string
}

export interface TerminalPreviewProps {
  tabs: TerminalTab[]
  activeId: string
  onSelect?: (id: string) => void
  output: string[]
  emptyOutputLabel?: string
  addLabel?: string
  collapseLabel?: string
  tabsLabel?: string
  header?: React.ReactNode
  cwd?: string
  cwdLabel?: string
  onAdd?: () => void
  onCollapse?: () => void
}

const stateClass: Record<TerminalTab['state'], string> = {
  running: 'text-primary',
  done: 'text-emerald-400',
  idle: 'text-muted-foreground',
}

export function TerminalPreview({
  tabs,
  activeId,
  onSelect,
  output,
  emptyOutputLabel = 'Waiting for output...',
  addLabel = 'New terminal',
  collapseLabel = 'Collapse terminals',
  tabsLabel = 'Terminals',
  header,
  cwd,
  cwdLabel = 'Working directory',
  onAdd,
  onCollapse,
}: TerminalPreviewProps) {
  return (
    <section className="flex min-w-0 flex-col overflow-hidden rounded-md border border-border bg-background">
      <div
        className="flex h-9 items-stretch border-b border-border bg-secondary"
        role="tablist"
        aria-label={tabsLabel}
      >
        {tabs.map((tab) => {
          const active = tab.id === activeId
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onSelect?.(tab.id)}
              className={cn(
                'relative flex items-center gap-2 border-r border-border px-3 text-[12px] text-foreground/80',
                active &&
                  'bg-background text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-primary',
              )}
            >
              <SquareTerminal
                aria-hidden="true"
                className="size-3.5 shrink-0 text-muted-foreground"
              />
              <span>{tab.label}</span>
              {tab.stateLabel ? (
                <span className={cn('flex items-center gap-1 text-[11px]', stateClass[tab.state])}>
                  {tab.state === 'running' ? (
                    <span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />
                  ) : null}
                  {tab.stateLabel}
                </span>
              ) : null}
            </button>
          )
        })}
        <div className="ml-auto flex items-center gap-1 px-2">
          <Button variant="ghost" size="icon-xs" aria-label={addLabel} onClick={onAdd}>
            <Plus />
          </Button>
          <Button variant="ghost" size="icon-xs" aria-label={collapseLabel} onClick={onCollapse}>
            <ChevronDown />
          </Button>
        </div>
      </div>
      {header}
      {cwd ? (
        <p className="border-b border-border px-3 py-1.5 font-mono text-[11px] text-muted-foreground">
          <span className="mr-2">{cwdLabel}</span>
          <span className="break-all text-foreground/80">{cwd}</span>
        </p>
      ) : null}
      <pre className="min-h-20 whitespace-pre-wrap px-3 py-2.5 font-mono text-[12px] leading-5 text-foreground/90">
        {output.length > 0 ? output.join('\n') : emptyOutputLabel}
      </pre>
    </section>
  )
}
