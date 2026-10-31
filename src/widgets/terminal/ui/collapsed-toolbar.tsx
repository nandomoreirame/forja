import { ChevronUp, SquareTerminal } from 'lucide-react'
import { Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui'

export interface ToolbarItem {
  id: string
  label: string
  detail: { agent?: string; command?: string; dir: string }
  state: 'done' | 'running' | 'idle'
  stateLabel: string
}

export interface ToolbarDetailLabels {
  agent: string
  command: string
  directory: string
  hint: string
}

export function ToolbarDetail({
  item,
  labels,
}: {
  item: ToolbarItem
  labels: ToolbarDetailLabels
}) {
  return (
    <div className="grid gap-1 text-[11px]">
      {item.detail.agent ? (
        <div className="flex items-center justify-between gap-6">
          <span className="text-muted-foreground">
            {labels.agent}: <span className="text-foreground">{item.detail.agent}</span>
          </span>
          <span className={item.state === 'running' ? 'text-primary' : 'text-muted-foreground'}>
            ● {item.stateLabel}
          </span>
        </div>
      ) : null}
      {item.detail.command ? (
        <span className="text-muted-foreground">
          {labels.command}: <span className="font-mono text-primary">{item.detail.command}</span>
        </span>
      ) : null}
      <span className="font-mono text-muted-foreground">
        {labels.directory}: {item.detail.dir}
      </span>
      <span className="text-[10px] text-muted-foreground/70">{labels.hint}</span>
    </div>
  )
}

export interface CollapsedToolbarProps {
  items: ToolbarItem[]
  label: string
  expandLabel: string
  detailLabels: ToolbarDetailLabels
  onExpand?: (id?: string) => void
  className?: string
}

export function CollapsedToolbar({
  items,
  label,
  expandLabel,
  detailLabels,
  onExpand,
  className = 'rounded-[3px] border',
}: CollapsedToolbarProps) {
  return (
    <TooltipProvider>
      <div
        role="toolbar"
        aria-label={label}
        className={`flex min-w-0 items-center gap-3 whitespace-nowrap border-border bg-secondary px-3 py-2 text-[12px] ${className}`}
      >
        <span className="hidden shrink-0 text-[11px] uppercase tracking-wider text-muted-foreground lg:inline">
          {label}:
        </span>
        <div className="flex min-w-0 flex-1 items-center gap-4 overflow-x-auto">
          {items.map((item) => (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onExpand?.(item.id)}
                  className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded px-1.5 py-0.5 hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <SquareTerminal className="size-3.5 text-muted-foreground" aria-hidden="true" />
                  <span>{item.label}</span>
                  <span
                    className={
                      item.state === 'done'
                        ? 'text-success'
                        : item.state === 'running'
                          ? 'text-primary'
                          : 'text-muted-foreground'
                    }
                  >
                    <span aria-hidden="true">
                      {item.state === 'done' ? '✓' : item.state === 'running' ? '◌' : '○'}{' '}
                    </span>
                    <span className="sr-only xl:not-sr-only">{item.stateLabel}</span>
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <ToolbarDetail item={item} labels={detailLabels} />
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 gap-1"
              aria-label={expandLabel}
              onClick={() => onExpand?.()}
            >
              <ChevronUp />
              <span className="hidden xl:inline">{expandLabel}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>{expandLabel}</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}
