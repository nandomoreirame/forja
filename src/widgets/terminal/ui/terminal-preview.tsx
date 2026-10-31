import { ChevronDown, Plus, SquareTerminal } from 'lucide-react'
import { Button } from '@/shared/ui'
import { cn } from '@/shared/ui/utils'

export interface TerminalTab {
  id: string
  label: string
  state: 'running' | 'done' | 'idle'
  stateLabel: string
  hovered?: boolean
  focused?: boolean
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
  running: 'text-[#F5A623]',
  done: 'text-[#52c41a]',
  idle: 'text-[#979797]',
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
    <section className="overflow-hidden rounded-[3px] border border-[#2A2A2A] bg-[#121214]">
      <div
        role="tablist"
        aria-label={tabsLabel}
        className="flex h-9 items-center justify-between border-b border-[#2A2A2A] bg-[#1C1C1C] px-3"
      >
        <div className="flex items-center gap-1">
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
                  'flex h-7 items-center gap-2 rounded-t-[2px] border-x border-t border-[#2A2A2A] px-2.5 text-[11px]',
                  active
                    ? 'border-t-2 border-t-[#F5A623] bg-[#0E0E0E] font-medium text-[#E6E6E6]'
                    : 'bg-[#121214] text-[#979797] hover:text-[#E6E6E6]',
                  tab.hovered && !active && 'text-[#E6E6E6]',
                  tab.focused && 'outline-none ring-1 ring-inset ring-[#F5A623]',
                )}
              >
                <SquareTerminal aria-hidden="true" className="size-3.5 shrink-0" />
                <span className="flex items-center gap-1.5">
                  {tab.state === 'running' ? (
                    <span
                      aria-hidden="true"
                      className="size-1.5 animate-pulse rounded-full bg-[#F5A623]"
                    />
                  ) : null}
                  {tab.label}
                </span>
                {tab.stateLabel ? (
                  <span className={cn('text-[10px]', stateClass[tab.state])}>{tab.stateLabel}</span>
                ) : null}
              </button>
            )
          })}
        </div>
        <div className="flex items-center gap-1">
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
        <p className="border-b border-[#2A2A2A] px-3 py-2 font-mono text-[11px] text-[#979797]">
          <span className="mr-2">{cwdLabel}</span>
          <span className="break-all text-[#E6E6E6]">{cwd}</span>
        </p>
      ) : null}
      <pre className="min-h-20 whitespace-pre-wrap px-3 py-3 font-mono text-[12px] leading-5 text-[#E6E6E6]">
        {output.length > 0 ? output.join('\n') : emptyOutputLabel}
      </pre>
    </section>
  )
}
