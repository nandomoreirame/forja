import { FeatureStatus, type FeatureState } from '@/shared/ui/feature-status'
import { getDictionary } from '@/shared/i18n'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
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
  tabClassName,
  tabStripClassName,
  type ToolId,
} from '@/shared/ui'
import { cn } from '@/shared/ui/utils'

export interface FeatureTabItem {
  id: string
  label: string
  /** Agent state of a feature tab; pages and documents have none. */
  state?: FeatureState
  stateLabel?: string
  tool?: ToolId
  closable?: boolean
  icon?: ReactNode
  badge?: ReactNode
}

export interface FeatureTabsProps {
  selectedId: string
  items: FeatureTabItem[]
  onSelect: (id: string) => void
  onClose?: (id: string) => void
  closeLabel?: string
  /** Opens a new tab from a + right of the tabs, like VS Code's new editor. */
  onAdd?: () => void
  addLabel?: string
  panelId?: string
  label?: string
  stateLabels?: Partial<Record<NonNullable<FeatureTabItem['state']>, string>>
}

const copy = getDictionary('en').app
const defaultStateLabels: Record<FeatureState, string> = {
  ...copy.states,
  working: copy.states.running,
  done: copy.states.completed,
  idle: copy.idle,
  stalled: copy.featureNavigator.stalled,
  integrated: copy.featureNavigator.integrated,
  abandoned: copy.featureNavigator.abandoned,
  ended: copy.featureNavigator.abandoned,
}

export function FeatureTabs({
  onClose,
  closeLabel = 'Close',
  onAdd,
  addLabel = 'New',
  panelId,
  selectedId,
  items,
  onSelect,
  label = 'Features',
  stateLabels = defaultStateLabels,
}: FeatureTabsProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const strip = useRef<HTMLDivElement>(null)
  // Keep the selected tab visible when the strip overflows horizontally.
  useEffect(() => {
    const tab = strip.current?.querySelector<HTMLElement>(
      `#${CSS.escape(`feature-tab-${selectedId}`)}`,
    )
    tab?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [selectedId])
  const select = (id: string) => {
    if (id !== selectedId) onSelect(id)
  }
  return (
    <TooltipProvider>
      <Tabs value={selectedId} onValueChange={select}>
        {/* Close buttons share each tab's grid cell but stay outside the tablist. */}
        <div
          ref={strip}
          data-slot="tab-strip"
          className={cn(
            tabStripClassName,
            'grid auto-cols-max grid-flow-col justify-start overflow-x-auto overflow-y-hidden [scrollbar-width:none]',
          )}
        >
          <TabsList aria-label={label} className="contents">
            {items.map((item, index) => (
              <div
                key={item.id}
                data-slot="tab"
                data-hovered={hoveredId === item.id && item.id !== selectedId ? 'true' : undefined}
                style={{ gridColumn: index + 1, gridRow: 1 }}
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId(null)}
                className={tabClassName(item.id === selectedId)}
              >
                <TabsTrigger
                  id={`feature-tab-${item.id}`}
                  aria-controls={item.id === selectedId ? panelId : undefined}
                  value={item.id}
                  onClick={() => select(item.id)}
                  className={cn(
                    'h-full flex-none gap-2 rounded-none border-0 bg-transparent px-2.5 text-[11px] font-[inherit] text-inherit shadow-none after:hidden hover:text-inherit focus-visible:ring-1 focus-visible:ring-inset data-active:bg-transparent data-active:text-inherit data-active:shadow-none dark:data-active:border-transparent dark:data-active:bg-transparent dark:data-active:text-inherit',
                    onClose && item.closable !== false && 'pr-8',
                  )}
                >
                  {item.icon}
                  {item.tool ? <ToolIcon tool={item.tool} /> : null}
                  {item.badge || !item.state ? null : (
                    <FeatureStatus
                      state={item.state}
                      label={
                        item.stateLabel ?? stateLabels[item.state] ?? defaultStateLabels[item.state]
                      }
                      slot="feature-tab-status"
                    />
                  )}
                  {item.label}
                  {item.badge ?? null}
                </TabsTrigger>
              </div>
            ))}
          </TabsList>
          {onClose
            ? items.map((item, index) =>
                item.closable === false ? null : (
                  <Tooltip key={item.id}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        style={{ gridColumn: index + 1, gridRow: 1 }}
                        onMouseEnter={() => setHoveredId(item.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        className={cn(
                          'z-10 mr-1.5 size-5 self-center justify-self-end opacity-0 hover:opacity-100 focus-visible:opacity-100',
                          (item.id === selectedId || item.id === hoveredId) && 'opacity-100',
                        )}
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
                ),
              )
            : null}
          {onAdd ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  style={{ gridColumn: items.length + 1, gridRow: 1 }}
                  className="mx-1 size-6 self-center"
                  aria-label={addLabel}
                  onClick={onAdd}
                >
                  <Plus className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{addLabel}</TooltipContent>
            </Tooltip>
          ) : null}
        </div>
      </Tabs>
    </TooltipProvider>
  )
}
