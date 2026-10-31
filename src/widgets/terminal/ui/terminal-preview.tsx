import { ChevronDown, Plus, SquareTerminal } from 'lucide-react'
import { Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui'
import { cn } from '@/shared/ui/utils'

export interface TerminalTab {
  id: string
  label: string
  state: 'running' | 'done' | 'idle'
  stateLabel: string
  hovered?: boolean
  focused?: boolean
  detail?: string
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
  done: 'text-success',
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
    <TooltipProvider delayDuration={300}>
      <section className="overflow-hidden rounded-[3px] border border-border bg-card">
        <div
          role="tablist"
          aria-label={tabsLabel}
          className="flex h-9 items-center justify-between border-b border-border bg-secondary px-3"
        >
          <div className="flex items-center gap-1">
            {tabs.map((tab) => {
              const active = tab.id === activeId
              const tip = [tab.label, tab.stateLabel, tab.detail].filter(Boolean).join(' · ')
              return (
                <Tooltip key={tab.id}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => onSelect?.(tab.id)}
                      className={cn(
                        'flex h-7 items-center gap-2 rounded-t-[2px] border-x border-t border-border px-2.5 text-[11px]',
                        active
                          ? 'border-t-2 border-t-primary bg-background font-medium text-foreground'
                          : 'bg-card text-muted-foreground hover:text-foreground',
                        tab.hovered && !active && 'text-foreground',
                        tab.focused && 'outline-none ring-1 ring-inset ring-ring',
                      )}
                    >
                      <SquareTerminal aria-hidden="true" className="size-3.5 shrink-0" />
                      <span className="flex items-center gap-1.5">
                        {tab.state === 'running' ? (
                          <span
                            aria-hidden="true"
                            className="size-1.5 animate-pulse rounded-full bg-primary"
                          />
                        ) : null}
                        {tab.label}
                      </span>
                      {tab.stateLabel ? (
                        <span className={cn('text-[10px]', stateClass[tab.state])}>
                          {tab.stateLabel}
                        </span>
                      ) : null}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{tip}</TooltipContent>
                </Tooltip>
              )
            })}
          </div>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon-xs" aria-label={addLabel} onClick={onAdd}>
                  <Plus />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{addLabel}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={collapseLabel}
                  onClick={onCollapse}
                >
                  <ChevronDown />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{collapseLabel}</TooltipContent>
            </Tooltip>
          </div>
        </div>
        {header}
        {cwd ? (
          <p className="border-b border-border px-3 py-2 font-mono text-[11px] text-muted-foreground">
            <span className="mr-2">{cwdLabel}</span>
            <span className="break-all text-foreground">{cwd}</span>
          </p>
        ) : null}
        <pre className="min-h-20 whitespace-pre-wrap px-3 py-3 font-mono text-[12px] leading-5 text-foreground">
          {output.length > 0 ? output.join('\n') : emptyOutputLabel}
        </pre>
      </section>
    </TooltipProvider>
  )
}
