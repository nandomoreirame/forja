import { Tabs, TabsList, TabsTrigger } from '@/shared/ui'

export interface FeatureTabItem {
  id: string
  label: string
  state: 'running' | 'waiting' | 'idle'
}

export interface FeatureTabsProps {
  selectedId: string
  items: FeatureTabItem[]
  onSelect: (id: string) => void
  label?: string
  stateLabels?: Record<FeatureTabItem['state'], string>
}

const defaultStateLabels: Record<FeatureTabItem['state'], string> = {
  running: 'Running',
  waiting: 'Waiting',
  idle: 'Idle',
}

export function FeatureTabs({
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
    <Tabs value={selectedId} onValueChange={select}>
      <TabsList aria-label={label} className="h-8">
        {items.map((item) => (
          <TabsTrigger
            key={item.id}
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
        ))}
      </TabsList>
    </Tabs>
  )
}
