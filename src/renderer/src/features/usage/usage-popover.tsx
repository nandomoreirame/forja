import { useEffect, useState } from 'react'
import { BarChart3 } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui'
import { UsageLimits, type ToolUsageView } from '@/widgets/usage'
import type { WorkbenchSource } from '@/renderer/src/shared/api'

export function UsagePopover({ source, label, unavailableLabel }: { source: WorkbenchSource; label: string; unavailableLabel: string }) {
  const [open, setOpen] = useState(false)
  const [usage, setUsage] = useState<ToolUsageView[]>([])
  const load = () => void source.loadUsage().then((items) => setUsage(items))
  useEffect(() => { if (open) load() }, [open])
  return <Popover open={open} onOpenChange={setOpen}><PopoverTrigger asChild><button type="button" className="flex h-7 w-full items-center gap-2 rounded-sm px-2 text-left text-xs text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"><BarChart3 className="size-3.5" aria-hidden="true" /><span>{label}</span></button></PopoverTrigger><PopoverContent side="right" align="end" className="p-0"><UsageLimits title={label} usage={usage} unavailableLabel={unavailableLabel} onRefresh={load} onClose={() => setOpen(false)} refreshLabel="Refresh" closeLabel="Close" /></PopoverContent></Popover>
}
