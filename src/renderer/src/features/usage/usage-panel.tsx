import { useEffect, useState } from 'react'
import { Gauge } from 'lucide-react'
import { getDictionary } from '@/shared/i18n'
import { Tooltip, TooltipContent, TooltipTrigger, toolNames } from '@/shared/ui'
import type { ToolUsage, WorkbenchSource } from '@/renderer/src/shared/api'

const toolColors = {
  claude: 'text-primary',
  codex: 'text-success',
  opencode: 'text-foreground',
  agy: 'text-info',
  grok: 'text-foreground',
}

export function UsagePanel({
  source,
  collapsed = false,
  onExpand,
}: {
  source: WorkbenchSource
  collapsed?: boolean
  onExpand?: () => void
}) {
  const [usage, setUsage] = useState<ToolUsage[]>([])
  const d = getDictionary(source.locale).app.planUsage
  useEffect(() => {
    let active = true
    void source.loadUsage().then(
      (items) => {
        if (active) setUsage(items.filter((item) => item.windows.length))
      },
      () => {
        if (active) setUsage([])
      },
    )
    return () => {
      active = false
    }
  }, [source])
  const windowLabel = (id: string) => (id === 'week' ? d.week : d.session)
  const updated = usage.find((item) => item.updatedLabel)?.updatedLabel
  const age = updated?.match(/(\d+) min ago/)?.[1]
  const updateLabel = updated
    ? d.updated.replace('{time}', age ? d.ago.replace('{time}', age) : d.now)
    : ''
  if (collapsed)
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={d.title}
            onClick={onExpand}
            className="mx-auto flex size-8 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
          >
            <Gauge aria-hidden="true" className="size-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>{d.title}</p>
          {usage.length ? (
            usage.map((item) => {
              const highest = item.windows.reduce((a, b) =>
                a.usedPercent >= b.usedPercent ? a : b,
              )
              return (
                <p key={item.tool}>
                  {toolNames[item.tool]} {windowLabel(highest.id)}: {highest.usedPercent}%
                </p>
              )
            })
          ) : (
            <p>{d.unavailable}</p>
          )}
        </TooltipContent>
      </Tooltip>
    )
  return (
    <section aria-label={d.title} className="min-h-0 overflow-y-auto p-2 text-xs">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-1">
        <h2 className="font-medium">{d.title}</h2>
        <span className="text-muted-foreground">{updateLabel}</span>
      </div>
      {usage.length ? (
        usage.map((item) => (
          <div key={item.tool} className="mb-2 space-y-1 last:mb-0">
            <p className={`font-medium ${toolColors[item.tool]}`}>{toolNames[item.tool]}</p>
            {item.windows.map((window) => {
              const value = Math.min(100, Math.max(0, window.usedPercent))
              const tone =
                value >= 90 ? 'bg-destructive' : value >= 70 ? 'bg-warning' : 'bg-success'
              const label = windowLabel(window.id)
              // The source still sends an English "resets in …" label; keep only the duration.
              const reset = window.resetLabel.replace(/^resets in\s*/i, '')
              return (
                <div key={window.id} className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="w-9 shrink-0">{label}</span>
                  <div
                    role="meter"
                    aria-label={`${item.tool} ${label}, ${value}%`}
                    aria-valuenow={value}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    className="h-1 min-w-4 flex-1 overflow-hidden rounded-full bg-secondary"
                  >
                    <div className={`h-full ${tone}`} style={{ width: `${value}%` }} />
                  </div>
                  <span className="font-mono text-foreground">{value}%</span>
                  <span aria-hidden="true">{reset}</span>
                  <span className="sr-only">{d.reset.replace('{time}', reset)}</span>
                </div>
              )
            })}
          </div>
        ))
      ) : (
        <p className="text-muted-foreground">{d.unavailable}</p>
      )}
    </section>
  )
}
