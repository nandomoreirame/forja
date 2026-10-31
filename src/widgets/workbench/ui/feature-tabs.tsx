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
} from '@/shared/ui'

export interface FeatureTabItem {
  id: string
  label: string
  state: 'running' | 'waiting' | 'idle'
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
        <div className="grid auto-cols-max grid-flow-col items-center justify-start border-b border-border bg-sidebar">
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
                className={onClose ? 'h-9 pr-9 text-xs' : 'h-9 text-xs'}
              >
                <span
                  aria-hidden="true"
                  className={
                    item.state === 'running'
                      ? 'size-1.5 rounded-full bg-primary'
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
                      className={`z-10 mr-1 justify-self-end hover:opacity-100 focus-visible:opacity-100 ${item.id === selectedId || item.id === hoveredId ? 'opacity-100' : 'opacity-0'}`}
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
