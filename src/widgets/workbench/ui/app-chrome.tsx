import type { ReactNode } from 'react'
import {
  Button,
  ForjaMark,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
  ToolIcon,
  toolNames,
  type ToolId,
} from '@/shared/ui'
import { Search, Terminal, ChevronLeft, ChevronRight } from 'lucide-react'
export interface AppTopbarProps {
  brand: string
  /** Project switcher shown next to the brand. */
  project?: ReactNode
  usage?: ReactNode
  commandText: string
  onBack?: () => void
  onForward?: () => void
  canBack?: boolean
  canForward?: boolean
  onCommand?: () => void
  onTerminal?: () => void
  terminalOpen?: boolean
  backLabel?: string
  forwardLabel?: string
  terminalLabel?: string
}
export function AppTopbar({
  brand,
  project,
  usage,
  commandText,
  onBack,
  onForward,
  canBack,
  canForward,
  onCommand,
  onTerminal,
  terminalOpen,
  backLabel = 'Back',
  forwardLabel = 'Forward',
  terminalLabel = 'Toggle terminals',
}: AppTopbarProps) {
  const icon = (
    label: string,
    child: ReactNode,
    action?: () => void,
    disabled?: boolean,
    pressed?: boolean,
  ) => (
    <Tooltip key={label}>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          disabled={disabled}
          onClick={action}
          aria-pressed={pressed}
        >
          {child}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
  return (
    <TooltipProvider>
      <header className="flex h-10 shrink-0 items-center justify-between border-b border-border bg-sidebar px-3">
        <div className="flex min-w-0 items-center gap-2">
          <ForjaMark className="size-2.5 shrink-0 text-primary" />
          <span className="text-xs font-bold tracking-wider">{brand}</span>
          <span className="text-[10px] text-muted-foreground">v2.0</span>
          {project ? (
            <div className="ml-2 flex min-w-0 items-center gap-1 border-l border-border pl-3">
              {project}
            </div>
          ) : null}
        </div>
        <div className="mx-4 flex min-w-0 max-w-[460px] flex-1 items-center gap-1.5">
          {onBack ? icon(backLabel, <ChevronLeft className="size-3.5" />, onBack, !canBack) : null}
          {onForward
            ? icon(forwardLabel, <ChevronRight className="size-3.5" />, onForward, !canForward)
            : null}
          <button
            type="button"
            onClick={onCommand}
            className="flex h-7 min-w-0 flex-1 items-center gap-2 rounded-sm border border-border bg-background px-2.5 text-xs hover:border-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            <Search className="size-3.5 text-muted-foreground" aria-hidden="true" />
            <span className="flex-1 truncate text-left">{commandText}</span>
            <kbd className="hidden rounded-sm border border-border bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline-flex">
              Ctrl+Shift+P
            </kbd>
          </button>
        </div>
        <div className="flex items-center gap-2">
          {usage}
          {onTerminal
            ? icon(
                terminalLabel,
                <Terminal className="size-4 text-primary" />,
                onTerminal,
                false,
                terminalOpen,
              )
            : null}
        </div>
      </header>
    </TooltipProvider>
  )
}

export interface AppStatusbarProps {
  items: string[]
  end?: ReactNode
}

export function AppStatusbar({ items, end }: AppStatusbarProps) {
  return (
    <footer className="flex h-8 shrink-0 items-center gap-4 border-t border-border bg-secondary px-3 text-[11px] text-muted-foreground">
      {items.map((item) => (
        <span key={item} className="shrink-0">
          {item}
        </span>
      ))}
      {end ? <div className="flex min-w-0 flex-1 items-center justify-end gap-2">{end}</div> : null}
    </footer>
  )
}

export interface FeatureCycleStage {
  label: string
  state: 'done' | 'current' | 'pending'
  tool?: ToolId
  toolLabel?: string
}

export interface FeatureContextProps {
  title: string
  rows: Array<{ label: string; value: ReactNode }>
  mode?: string
  cycle?: FeatureCycleStage[]
  cycleLabel?: string
  /** Extra controls at the end of the header, such as the summary toggle. */
  actions?: ReactNode
}

export function FeatureContext({
  title,
  rows,
  mode,
  cycle,
  cycleLabel = 'Cycle',
  actions,
}: FeatureContextProps) {
  return (
    <section aria-label={title} className="grid gap-2.5 text-[12px]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-[14px] font-bold text-foreground">{title}</h2>
          {mode ? (
            <span className="rounded-[2px] border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] uppercase text-primary">
              {mode}
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 text-[11px] text-muted-foreground">
          {rows.map((row) => (
            <span key={row.label} className="min-w-0 break-all">
              {row.label}: <span className="text-foreground/90">{row.value}</span>
            </span>
          ))}
          {actions}
        </div>
      </div>
      {cycle?.length ? (
        <div className="flex items-center gap-2 border-t border-border pt-1.5 text-[11px]">
          <TooltipProvider>
            <ol aria-label={cycleLabel} className="flex flex-wrap items-center gap-2">
              {cycle.map((stage, index) => (
                <li
                  key={stage.label}
                  aria-current={stage.state === 'current' ? 'step' : undefined}
                  className={
                    stage.state === 'current'
                      ? 'flex items-center gap-1 font-medium text-primary'
                      : stage.state === 'done'
                        ? 'flex items-center gap-1 text-foreground'
                        : 'flex items-center gap-1 text-muted-foreground'
                  }
                >
                  {index > 0 ? (
                    <span aria-hidden="true" className="mr-2 font-normal text-muted-foreground">
                      →
                    </span>
                  ) : null}
                  {stage.state === 'current' ? (
                    <span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />
                  ) : null}
                  {stage.tool ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          tabIndex={0}
                          className="inline-flex rounded-sm focus-visible:outline-2 focus-visible:outline-ring"
                        >
                          <ToolIcon tool={stage.tool} />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        {stage.label} · {stage.toolLabel ?? toolNames[stage.tool]}
                      </TooltipContent>
                    </Tooltip>
                  ) : null}
                  {stage.label}
                  {stage.state === 'done' ? <span aria-hidden="true"> ✓</span> : null}
                </li>
              ))}
            </ol>
          </TooltipProvider>
        </div>
      ) : null}
    </section>
  )
}
