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
  cwd?: string
  cwdLabel?: string
  onAdd?: () => void
  onCollapse?: () => void
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
  cwd,
  cwdLabel = 'Working directory',
  onAdd,
  onCollapse,
}: TerminalPreviewProps) {
  return (
    <section className="flex min-w-0 flex-col rounded-md border border-border bg-background">
      <div
        className="flex h-8 items-center border-b border-border"
        role="tablist"
        aria-label={tabsLabel}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={tab.id === activeId}
            onClick={() => onSelect?.(tab.id)}
            className={cn(
              'flex h-full items-center gap-1.5 border-r border-border px-3 text-[12px] text-muted-foreground',
              tab.id === activeId && 'bg-muted text-foreground',
            )}
          >
            <SquareTerminal aria-hidden="true" className="size-3.5 shrink-0" />
            <span>{tab.label}</span>
            <span className="text-[11px] text-muted-foreground">{tab.stateLabel}</span>
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1 px-1">
          <Button variant="ghost" size="icon-xs" aria-label={addLabel} onClick={onAdd}>
            <Plus />
          </Button>
          <Button variant="ghost" size="icon-xs" aria-label={collapseLabel} onClick={onCollapse}>
            <ChevronDown />
          </Button>
        </div>
      </div>
      {cwd ? (
        <p className="border-b border-border px-3 py-1 text-[11px] text-muted-foreground">
          <span className="mr-2">{cwdLabel}</span>
          <span className="break-all text-foreground/80">{cwd}</span>
        </p>
      ) : null}
      <pre className="min-h-20 whitespace-pre-wrap px-3 py-2 font-mono text-[12px] leading-5 text-foreground/90">
        {output.length > 0 ? output.join('\n') : emptyOutputLabel}
      </pre>
    </section>
  )
}
