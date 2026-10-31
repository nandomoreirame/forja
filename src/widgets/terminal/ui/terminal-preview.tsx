import { Maximize2, Minimize2, Plus, SquareTerminal, X } from 'lucide-react'
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
  closable?: boolean
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
  onClose?: (id: string) => void
  closeLabel?: string
  className?: string
  onMaximize?: () => void
  maximized?: boolean
  maximizeLabel?: string
  restoreLabel?: string
  body?: React.ReactNode
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
  collapseLabel = 'Close panel',
  tabsLabel = 'Terminals',
  header,
  cwd,
  cwdLabel = 'Working directory',
  onAdd,
  onCollapse,
  onClose,
  closeLabel = 'Close',
  className,
  onMaximize,
  maximized = false,
  maximizeLabel = 'Maximize panel',
  restoreLabel = 'Restore panel',
  body,
}: TerminalPreviewProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <section
        className={cn('overflow-hidden rounded-[3px] border border-border bg-card', className)}
      >
        <div
          role="tablist"
          aria-label={tabsLabel}
          className="flex h-9 items-end justify-between gap-2 border-b border-border bg-secondary px-3"
        >
          <div className="flex min-w-0 items-end">
            {tabs.map((tab) => {
              const active = tab.id === activeId
              const tip = [tab.label, tab.stateLabel, tab.detail].filter(Boolean).join(' · ')
              return (
                <div
                  key={tab.id}
                  role="presentation"
                  className={cn(
                    'group/tab -mb-px flex h-7 min-w-0 items-center whitespace-nowrap rounded-t-[2px] border-t border-r border-border text-[11px] first:border-l',
                    active
                      ? 'border-t-2 border-t-primary bg-background font-medium text-foreground'
                      : 'bg-card text-muted-foreground hover:text-foreground',
                    tab.hovered && !active && 'text-foreground',
                  )}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => onSelect?.(tab.id)}
                        className={cn(
                          'flex h-full min-w-0 items-center gap-2 px-2.5 outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring',
                          tab.focused && 'ring-1 ring-inset ring-ring',
                          tab.closable && onClose && 'pr-1',
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
                  {tab.closable && onClose ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          aria-label={`${closeLabel} ${tab.label}`}
                          onClick={() => onClose(tab.id)}
                          className={cn(
                            'mr-1 size-5 opacity-0 group-hover/tab:opacity-100 focus-visible:opacity-100',
                            active && 'opacity-100',
                          )}
                        >
                          <X className="size-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        {closeLabel} {tab.label}
                      </TooltipContent>
                    </Tooltip>
                  ) : null}
                </div>
              )
            })}
          </div>
          <div className="flex shrink-0 items-center gap-1 self-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon-xs" aria-label={addLabel} onClick={onAdd}>
                  <Plus />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{addLabel}</TooltipContent>
            </Tooltip>
            {onMaximize ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={maximized ? restoreLabel : maximizeLabel}
                    aria-pressed={maximized}
                    onClick={onMaximize}
                  >
                    {maximized ? <Minimize2 /> : <Maximize2 />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {maximized ? restoreLabel : maximizeLabel}
                </TooltipContent>
              </Tooltip>
            ) : null}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={collapseLabel}
                  onClick={onCollapse}
                >
                  <X />
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
        {body ?? (
          <pre className="min-h-20 whitespace-pre-wrap px-3 py-3 font-mono text-[12px] leading-5 text-foreground">
            {output.length > 0 ? output.join('\n') : emptyOutputLabel}
          </pre>
        )}
      </section>
    </TooltipProvider>
  )
}
