import { useCallback, useEffect, useState } from 'react'
import { Gauge } from 'lucide-react'
import { getDictionary } from '@/shared/i18n'
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/ui'
import { UsageLimits } from '@/widgets/usage'
import type { ToolUsage, WorkbenchSource } from '@/renderer/src/shared/api'
import { toUsageViews } from './usage-view'

/** Topbar dropdown with the plan usage of each tool, laid out like the AIBar. */
export function UsageMenu({
  source,
  onSettings,
}: {
  source: WorkbenchSource
  onSettings: () => void
}) {
  const t = getDictionary(source.locale).app.planUsage
  const [open, setOpen] = useState(false)
  const [usage, setUsage] = useState<ToolUsage[] | null>(null)
  const load = useCallback(() => {
    source.loadUsage().then(
      (items) => setUsage(items),
      () => setUsage([]),
    )
  }, [source])
  // Usage is fetched each time the panel opens, never in the background.
  useEffect(() => {
    if (open) load()
  }, [open, load])
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={t.title} className="size-7">
              <Gauge aria-hidden="true" className="size-4" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">{t.title}</TooltipContent>
      </Tooltip>
      <PopoverContent
        align="end"
        collisionPadding={8}
        // Focus the panel itself on open so the first action's tooltip does not pop up.
        tabIndex={-1}
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          ;(event.currentTarget as HTMLElement).focus()
        }}
        className="w-[min(340px,calc(100vw-1rem))] rounded-xl border-border p-0 shadow-2xl outline-none"
      >
        {usage ? (
          <UsageLimits
            title={t.title}
            usage={toUsageViews(usage, source.locale)}
            unavailableLabel={t.toolUnavailable}
            emptyLabel={t.unavailable}
            onRefresh={load}
            onSettings={() => {
              setOpen(false)
              onSettings()
            }}
            onClose={() => setOpen(false)}
            refreshLabel={t.refresh}
            settingsLabel={t.settings}
            closeLabel={t.close}
          />
        ) : null}
      </PopoverContent>
    </Popover>
  )
}
