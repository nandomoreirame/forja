import { useState } from 'react'
import { X } from 'lucide-react'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
  Button,
  Tabs,
  TabsList,
  TabsTrigger,
  ToolIcon,
  type ToolId,
} from '@/shared/ui'
import { cn } from '@/shared/ui/utils'

export interface FeatureTabItem {
  id: string
  label: string
  state: 'running' | 'waiting' | 'idle'
  tool?: ToolId
}

export interface FeatureTabsProps {
  selectedId: string
  items: FeatureTabItem[]
  onSelect: (id: string) => void
  onClose?: (id: string) => void
  closeLabel?: string
  panelId?: string
  label?: string
  stateLabels?: Record<FeatureTabItem['state'], string>
}

const defaultStateLabels: Record<FeatureTabItem['state'], string> = {
  running: 'Running',
  waiting: 'Waiting',
  idle: 'Idle',
}

export function FeatureTabs({
  onClose,
  closeLabel = 'Close',
  panelId,
  selectedId,
  items,
  onSelect,
  label = 'Features',
  stateLabels = defaultStateLabels,
}: FeatureTabsProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const select = (id: string) => {
    if (id !== selectedId) onSelect(id)
  }
  return (
    <TooltipProvider>
      <Tabs value={selectedId} onValueChange={select}>
        <div className="grid h-9 auto-cols-max grid-flow-col items-end justify-start border-b border-border bg-secondary px-3">
          <TabsList aria-label={label} className="contents">
            {items.map((item, index) => (
              <TabsTrigger
                key={item.id}
                style={{ gridColumn: index + 1, gridRow: 1 }}
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId(null)}
                id={`feature-tab-${item.id}`}
                aria-controls={item.id === selectedId ? panelId : undefined}
                value={item.id}
                onClick={() => select(item.id)}
                className={cn(
                  '-mb-px h-7 flex-none gap-2 rounded-none rounded-t-[2px] border-t border-r border-b-0 border-l-0 border-border first:border-l px-2.5 text-[11px] font-normal shadow-none after:hidden focus-visible:ring-1 focus-visible:ring-inset',
                  'bg-card text-muted-foreground hover:text-foreground',
                  'data-active:border-r-border data-active:border-t-2 data-active:border-t-primary data-active:bg-background data-active:font-medium data-active:text-foreground dark:data-active:border-r-border dark:data-active:border-t-primary dark:data-active:bg-background',
                  onClose && 'pr-8',
                )}
              >
                {item.tool ? <ToolIcon tool={item.tool} /> : null}
                <span
                  aria-hidden="true"
                  data-slot="feature-tab-status"
                  className={
                    item.state === 'running'
                      ? 'size-1.5 rounded-full bg-primary motion-safe:animate-pulse'
                      : item.state === 'waiting'
                        ? 'size-1.5 rounded-full border border-primary'
                        : 'size-1.5 rounded-full bg-muted-foreground/40'
                  }
                />
                {item.label}
                <span className="sr-only">, {stateLabels[item.state]}</span>
              </TabsTrigger>
            ))}
          </TabsList>
          {onClose
            ? items.map((item, index) => (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      style={{ gridColumn: index + 1, gridRow: 1 }}
                      onMouseEnter={() => setHoveredId(item.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      className={`z-10 mr-1 mb-1 size-5 self-end justify-self-end hover:opacity-100 focus-visible:opacity-100 ${item.id === selectedId || item.id === hoveredId ? 'opacity-100' : 'opacity-0'}`}
                      aria-label={`${closeLabel} ${item.label}`}
                      onClick={() => onClose(item.id)}
                    >
                      <X className="size-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {closeLabel} {item.label}
                  </TooltipContent>
                </Tooltip>
              ))
            : null}
        </div>
      </Tabs>
    </TooltipProvider>
  )
}
