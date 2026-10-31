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
  selectedId,
  items,
  onSelect,
  label = 'Features',
  stateLabels = defaultStateLabels,
}: FeatureTabsProps) {
  const select = (id: string) => {
    if (id !== selectedId) onSelect(id)
  }

  return (
    <TooltipProvider>
      <Tabs value={selectedId} onValueChange={select}>
        <TabsList aria-label={label} className="h-8">
          {items.map((item) => (
            <div key={item.id} className="flex items-center">
              <TabsTrigger
                id={`feature-tab-${item.id}`}
                aria-controls={`feature-panel-${item.id}`}
                value={item.id}
                onClick={() => select(item.id)}
                className="text-xs"
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
              {onClose ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
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
              ) : null}
            </div>
          ))}
        </TabsList>
      </Tabs>
    </TooltipProvider>
  )
}
