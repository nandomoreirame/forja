import type { ReactNode } from 'react'
import { Button } from '@/shared/ui'
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
        <span aria-hidden="true" className="size-2.5 rounded-sm bg-primary" />
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

export interface FeatureContextProps {
  title: string
  rows: Array<{ label: string; value: ReactNode }>
}

export function FeatureContext({ title, rows }: FeatureContextProps) {
  return (
    <section aria-label={title} className="grid gap-1 border-b border-border px-3 py-2 text-[12px]">
      <h2 className="text-[13px] font-medium text-foreground">{title}</h2>
      {rows.map((row) => (
        <p key={row.label} className="flex gap-2 text-muted-foreground">
          <span className="w-20 shrink-0">{row.label}</span>
          <span className="min-w-0 break-all text-foreground/90">{row.value}</span>
        </p>
      ))}
    </section>
  )
}
