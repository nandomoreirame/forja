import type { ReactNode } from 'react'
import { Button, ForjaMark } from '@/shared/ui'
import { Search, Settings } from 'lucide-react'

export interface AppTopbarProps {
  brand: string
  commandText: string
  settingsLabel: string
  onSettings?: () => void
}

export function AppTopbar({ brand, commandText, settingsLabel, onSettings }: AppTopbarProps) {
  return (
    <header className="grid h-10 grid-cols-[1fr_auto_1fr] items-center border-b border-border bg-secondary px-3">
      <div className="flex items-center gap-2">
        <ForjaMark className="size-4 text-primary" />
        <span className="text-[11px] font-bold tracking-wider text-foreground">{brand}</span>
        <span className="rounded-sm border border-border px-1.5 text-[10px] text-muted-foreground">
          v2.0
        </span>
      </div>
      <div className="flex h-7 w-[460px] items-center gap-2 rounded-sm border border-border bg-background px-3 text-[12px]">
        <Search className="size-3.5 text-muted-foreground" aria-hidden="true" />
        <span className="flex-1 text-foreground">{commandText}</span>
        <kbd className="rounded-sm border border-border px-1.5 font-sans text-[10px] text-muted-foreground">
          Ctrl+Shift+P
        </kbd>
      </div>
      <div className="flex justify-end">
        <Button variant="ghost" size="icon-sm" aria-label={settingsLabel} onClick={onSettings}>
          <Settings />
        </Button>
      </div>
    </header>
  )
}

export interface AppStatusbarProps {
  items: string[]
}

export function AppStatusbar({ items }: AppStatusbarProps) {
  return (
    <footer className="flex h-8 items-center gap-4 border-t border-border bg-secondary px-3 text-[11px] text-muted-foreground">
      {items.map((item) => (
        <span key={item}>{item}</span>
      ))}
    </footer>
  )
}

export interface FeatureCycleStage {
  label: string
  state: 'done' | 'current' | 'pending'
}

export interface FeatureContextProps {
  title: string
  rows: Array<{ label: string; value: ReactNode }>
  mode?: string
  cycle?: FeatureCycleStage[]
  cycleLabel?: string
}

export function FeatureContext({
  title,
  rows,
  mode,
  cycle,
  cycleLabel = 'Cycle',
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
        <div className="flex flex-wrap gap-x-3 text-[11px] text-muted-foreground">
          {rows.map((row) => (
            <span key={row.label} className="min-w-0 break-all">
              {row.label}: <span className="text-foreground/90">{row.value}</span>
            </span>
          ))}
        </div>
      </div>
      {cycle?.length ? (
        <div className="flex items-center gap-2 border-t border-border pt-1.5 text-[11px]">
          <span className="text-muted-foreground">{cycleLabel}:</span>
          <ol aria-label={cycleLabel} className="flex flex-wrap items-center gap-2">
            {cycle.map((stage, index) => (
              <li
                key={stage.label}
                aria-current={stage.state === 'current' ? 'step' : undefined}
                className={
                  stage.state === 'current'
                    ? 'flex items-center gap-1 font-medium text-primary'
                    : stage.state === 'done'
                      ? 'text-foreground'
                      : 'text-muted-foreground'
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
                {stage.label}
                {stage.state === 'done' ? <span aria-hidden="true"> ✓</span> : null}
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </section>
  )
}
