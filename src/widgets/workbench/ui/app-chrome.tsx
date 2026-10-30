import type { ReactNode } from 'react'
import { Button } from '@/shared/ui'
import { Settings } from 'lucide-react'

export interface AppTopbarProps {
  brand: string
  commandText: string
  settingsLabel: string
  onSettings?: () => void
}

export function AppTopbar({ brand, commandText, settingsLabel, onSettings }: AppTopbarProps) {
  return (
    <header className="flex h-10 items-center gap-3 border-b border-border bg-secondary px-3">
      <span className="text-xs font-medium tracking-wide text-foreground">{brand}</span>
      <div className="mx-auto flex h-6 min-w-56 items-center rounded-md border border-border bg-background px-2 text-xs text-muted-foreground">
        {commandText}
      </div>
      <Button variant="ghost" size="icon-sm" aria-label={settingsLabel} onClick={onSettings}>
        <Settings />
      </Button>
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
