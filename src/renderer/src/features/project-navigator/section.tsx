import { useEffect, useId, useState, type ReactNode } from 'react'
import { Archive, ChevronDown, ChevronRight } from 'lucide-react'
import { layoutStorage } from '@/renderer/src/shared/lib/layout-storage'
import {
  Button,
  ResizablePanel,
  ScrollArea,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  usePanelRef,
} from '@/shared/ui'
import { getDictionary, type Locale } from '@/shared/i18n'
import { cn } from '@/shared/ui/utils'

// VS Code pane metrics: 22 px headers and rows (paneview.ts DEFAULT_PANE_HEADER_SIZE,
// TreeRenderer.ITEM_HEIGHT). A collapsed pane keeps only its header; an expanded one keeps
// at least one row.
export const paneHeaderSize = 22
const paneMinSize = paneHeaderSize * 2

export const rowFocus =
  'focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-ring'

/**
 * One collapsible, resizable sidebar pane, like a VS Code view. Must be rendered inside a
 * vertical ResizablePanelGroup; the open state is remembered per viewer.
 */
export function NavigatorSection({
  section,
  title,
  count,
  children,
  actions,
  empty,
  defaultSize,
}: {
  section: string
  title: string
  count: number
  children: ReactNode
  /** Header actions, shown while the pointer or focus is inside the pane. */
  actions?: ReactNode
  /** Message shown when the pane has no items. */
  empty?: string
  defaultSize?: number | string
}) {
  const id = useId()
  const heading = useId()
  const key = `forja.sidebar.${section}`
  const panel = usePanelRef()
  const [open, setOpen] = useState(() => layoutStorage.getItem(key) !== 'false')
  const toggle = (next: boolean) => {
    layoutStorage.setItem(key, String(next))
    setOpen(next)
  }
  useEffect(() => {
    const handle = panel.current
    if (!handle) return
    try {
      if (open && handle.isCollapsed()) handle.expand()
      if (!open && !handle.isCollapsed()) handle.collapse()
    } catch {
      // The group may not be measured yet (first paint, tests); the panel follows on resize.
    }
  }, [open, panel])
  return (
    <ResizablePanel
      id={section}
      panelRef={panel}
      collapsible
      collapsedSize={paneHeaderSize}
      minSize={paneMinSize}
      defaultSize={open ? defaultSize : paneHeaderSize}
      onResize={() => {
        // Dragging a pane down to its header collapses it, as in VS Code.
        const collapsed = panel.current?.isCollapsed() ?? !open
        if (collapsed === open) toggle(!collapsed)
      }}
    >
      <section
        data-slot="sidebar-pane"
        aria-labelledby={heading}
        className="group/pane flex h-full min-h-0 flex-col"
      >
        <div
          data-slot="pane-header"
          className="flex h-[22px] shrink-0 items-center pr-2 text-muted-foreground"
        >
          <h2 id={heading} className="min-w-0 flex-1">
            <button
              type="button"
              aria-expanded={open}
              aria-controls={id}
              className={cn(
                'flex h-[22px] w-full items-center gap-0.5 pl-0.5 text-[11px] font-bold uppercase tracking-wide',
                rowFocus,
              )}
              onClick={() => toggle(!open)}
            >
              {open ? (
                <ChevronDown aria-hidden="true" className="size-4 shrink-0" />
              ) : (
                <ChevronRight aria-hidden="true" className="size-4 shrink-0" />
              )}
              <span className="truncate">{title}</span>{' '}
              <span className="ml-auto pl-2 font-normal tabular-nums">{count}</span>
            </button>
          </h2>
          {actions ? (
            <div
              data-slot="pane-actions"
              className="flex items-center gap-0.5 pl-1 opacity-0 group-focus-within/pane:opacity-100 group-hover/pane:opacity-100"
            >
              {actions}
            </div>
          ) : null}
        </div>
        <div id={id} data-slot="pane-body" hidden={!open} className="min-h-0 flex-1">
          <ScrollArea className="h-full">
            {children}
            {count === 0 && empty ? (
              <p className="flex h-[22px] items-center pl-5 text-[13px] text-muted-foreground">
                {empty}
              </p>
            ) : null}
          </ScrollArea>
        </div>
      </section>
    </ResizablePanel>
  )
}

/** A 22 px tree row whose `hover` content (badges, actions) shows on hover or focus. */
export function PaneRow({
  children,
  hover,
  current,
}: {
  children: ReactNode
  hover?: ReactNode
  current?: boolean
}) {
  return (
    <div
      data-slot="pane-row"
      className={cn(
        'group/row flex h-[22px] items-center hover:bg-accent focus-within:bg-accent',
        current && 'bg-accent',
      )}
    >
      {children}
      {hover ? (
        <span
          data-slot="row-hover"
          className="hidden shrink-0 items-center gap-1 pr-2 group-focus-within/row:flex group-hover/row:flex"
        >
          {hover}
        </span>
      ) : null}
    </div>
  )
}

export const rowButton = cn(
  'flex h-[22px] min-w-0 flex-1 items-center gap-1.5 pr-1 text-left text-[13px]',
  rowFocus,
)

/** Icon button for pane headers, with a dark tooltip and an accessible name. */
export function PaneAction({
  label,
  onClick,
  children,
}: {
  label: string
  onClick?: () => void
  children: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          onClick={onClick}
          className="size-5 [&_svg]:size-4"
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

export function ArchiveAction({
  name,
  disabled = false,
  locale,
  onClick,
}: {
  name: string
  disabled?: boolean
  locale: Locale
  onClick: () => void
}) {
  const a = getDictionary(locale).app
  const label = `${a.archive} ${name}`
  const hint = useId()
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={disabled ? 0 : undefined}
          aria-describedby={disabled ? hint : undefined}
          className={cn('inline-flex shrink-0', rowFocus)}
        >
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            aria-describedby={disabled ? hint : undefined}
            disabled={disabled}
            onClick={onClick}
            className="size-5 [&_svg]:size-4"
          >
            <Archive aria-hidden="true" />
          </Button>
        </span>
      </TooltipTrigger>
      {disabled && (
        <span id={hint} className="sr-only">
          {a.interruptBeforeArchive}
        </span>
      )}
      <TooltipContent>{disabled ? a.interruptBeforeArchive : label}</TooltipContent>
    </Tooltip>
  )
}
