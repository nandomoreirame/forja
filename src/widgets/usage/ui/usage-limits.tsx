import { useState } from 'react'
import { BarChart3, RefreshCw, X } from 'lucide-react'
import {
  Button,
  Tabs,
  TabsList,
  TabsTrigger,
  ToolIcon,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  toolNames,
  type ToolId,
} from '@/shared/ui'
import { cn } from '@/shared/ui/utils'

export interface UsageWindowView {
  id: string
  label: string
  usedPercent: number
  pacePercent: number
  resetLabel: string
  paceLabel: string
}

export interface ToolUsageView {
  tool: ToolId
  plan?: string
  account?: string
  updatedLabel?: string
  /** An empty list means the tool reports no usage; it is shown as unavailable, never estimated. */
  windows: readonly UsageWindowView[]
}

export interface UsageLimitsProps {
  title: string
  usage: ToolUsageView[]
  unavailableLabel: string
  onRefresh?: () => void
  onClose?: () => void
  refreshLabel?: string
  closeLabel?: string
  className?: string
}

const dangerAt = 80
const clamp = (value: number) => Math.round(Math.min(100, Math.max(0, value)))

function UsageCard({ window }: { window: UsageWindowView }) {
  const used = clamp(window.usedPercent)
  const pace = clamp(window.pacePercent)
  const danger = used >= dangerAt
  const labelId = `usage-${window.id}-label`
  return (
    <section className="grid gap-2 rounded-md border border-border bg-card p-3">
      <div className="flex items-center justify-between text-[12px]">
        <span id={labelId} className="font-medium text-foreground">
          {window.label}
        </span>
        <span
          data-tone={danger ? 'danger' : 'accent'}
          className={cn('font-semibold', danger ? 'text-destructive' : 'text-primary')}
        >
          {used}%
        </span>
      </div>
      <div
        role="meter"
        aria-labelledby={labelId}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={used}
        aria-valuetext={`${used}%, ${window.paceLabel}`}
        className="grid gap-1"
      >
        <div className="h-2 overflow-hidden rounded-full bg-secondary">
          <div
            className={cn('h-full rounded-full', danger ? 'bg-destructive' : 'bg-primary')}
            style={{ width: `${used}%` }}
          />
        </div>
        <div className="h-0.5 overflow-hidden rounded-full bg-secondary/60">
          <div className="h-full bg-muted-foreground/70" style={{ width: `${pace}%` }} />
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">
        {window.resetLabel} · {window.paceLabel}
      </p>
    </section>
  )
}

export function UsageLimits({
  title,
  usage,
  unavailableLabel,
  onRefresh,
  onClose,
  refreshLabel = 'Refresh',
  closeLabel = 'Close',
  className,
}: UsageLimitsProps) {
  const [selected, setSelected] = useState(usage[0]?.tool)
  const current = usage.find((item) => item.tool === selected) ?? usage[0]
  const action = (label: string, icon: React.ReactNode, onClick?: () => void) =>
    onClick ? (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon-xs" aria-label={label} onClick={onClick}>
            {icon}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    ) : null
  return (
    <TooltipProvider delayDuration={300}>
      <div className={cn('grid w-[340px] gap-3 p-3 text-foreground', className)}>
        <header className="flex items-center gap-2">
          <BarChart3 className="size-4 text-primary" aria-hidden="true" />
          <h2 className="flex-1 text-sm font-semibold">{title}</h2>
          {action(refreshLabel, <RefreshCw />, onRefresh)}
          {action(closeLabel, <X />, onClose)}
        </header>
        <Tabs value={current?.tool} onValueChange={(value) => setSelected(value as ToolId)}>
          <TabsList
            aria-label={title}
            className="flex h-auto w-full flex-wrap gap-1 bg-transparent p-0"
          >
            {usage.map((item) => (
              <TabsTrigger
                key={item.tool}
                value={item.tool}
                onClick={() => setSelected(item.tool)}
                className="h-7 flex-none rounded-md border-0 px-2.5 text-[12px] text-muted-foreground data-active:bg-primary data-active:font-semibold data-active:text-primary-foreground dark:data-active:bg-primary dark:data-active:text-primary-foreground"
              >
                {toolNames[item.tool]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {current ? (
          <div className="grid gap-3">
            <div className="grid gap-0.5">
              <div className="flex items-center gap-2 text-[13px]">
                <ToolIcon tool={current.tool} className="size-3.5" />
                <span className="font-semibold">{toolNames[current.tool]}</span>
                {current.plan ? (
                  <span className="text-[11px] text-muted-foreground">{current.plan}</span>
                ) : null}
                {current.updatedLabel ? (
                  <span className="ml-auto text-[11px] text-muted-foreground">
                    {current.updatedLabel}
                  </span>
                ) : null}
              </div>
              {current.account ? (
                <span className="text-[11px] text-muted-foreground">{current.account}</span>
              ) : null}
            </div>
            {current.windows.length ? (
              current.windows.map((window) => <UsageCard key={window.id} window={window} />)
            ) : (
              <p className="rounded-md border border-border bg-card p-3 text-[12px] text-muted-foreground">
                {unavailableLabel}
              </p>
            )}
          </div>
        ) : null}
      </div>
    </TooltipProvider>
  )
}
