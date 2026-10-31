import { useEffect, useState } from 'react'
import { BarChart3 } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui'
import { UsageLimits, type ToolUsageView } from '@/widgets/usage'
import type { WorkbenchSource } from '@/renderer/src/shared/api'

export function UsagePopover({ source, label, unavailableLabel, compact = false }: { source: WorkbenchSource; label: string; unavailableLabel: string; compact?: boolean }) {
  const [open, setOpen] = useState(false)
  const [usage, setUsage] = useState<ToolUsageView[]>([])
  const load = () => void source.loadUsage().then((items) => setUsage(items))
  useEffect(() => { load() }, [])
  useEffect(() => { if (open) load() }, [open])
  const firstWindow = usage[0]?.windows[0]
  const summary = firstWindow ? `${Math.round(Math.max(0, Math.min(100, firstWindow.usedPercent)))}% · ${firstWindow.resetLabel.replace(/^resets in\s*/i, '')}` : '—'
  return <Popover open={open} onOpenChange={setOpen}><PopoverTrigger asChild><button type="button" className={compact ? 'flex h-7 items-center gap-2 rounded-md border border-border bg-background px-2 text-[11px] text-foreground hover:border-muted-foreground focus-visible:outline-2 focus-visible:outline-ring' : 'flex h-7 w-full items-center gap-2 rounded-sm px-2 text-left text-xs text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring'}><BarChart3 aria-hidden="true" className="size-3.5 shrink-0 text-primary" /><span className={compact ? 'hidden sm:inline' : undefined}>{compact ? label : label}</span>{compact ? <strong className="font-mono text-primary">{summary}</strong> : null}</button></PopoverTrigger><PopoverContent side={compact ? 'bottom' : 'right'} align="end" collisionPadding={8} className="w-[min(360px,calc(100vw-1rem))] max-w-[calc(100vw-1rem)] rounded-xl border-border bg-popover p-0 shadow-2xl"><UsageLimits title={label} usage={usage} unavailableLabel={unavailableLabel} onRefresh={load} onClose={() => setOpen(false)} refreshLabel="Refresh" closeLabel="Close" /></PopoverContent></Popover>
}
