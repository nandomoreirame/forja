import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
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
// a 120 px body, VS Code's default minimumBodySize for vertical panes.
export const paneHeaderSize = 22
const paneMinSize = paneHeaderSize + 120

// VS Code paneview.ts: the view is "animated" for 200 ms after a toggle (CSS eases the height
// over 150 ms), and a closing pane keeps its body until then.
const animationMs = 200
const animationTimers = new WeakMap<Element, number>()

function animatePanes(group: Element | null | undefined) {
  if (!group) return
  window.clearTimeout(animationTimers.get(group))
  group.setAttribute('data-animated', '')
  animationTimers.set(
    group,
    window.setTimeout(() => group.removeAttribute('data-animated'), animationMs),
  )
}

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
  defaultOpen = true,
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
  /** Open state before the viewer chooses one; like VS Code, secondary panes start collapsed. */
  defaultOpen?: boolean
}) {
  const id = useId()
  const heading = useId()
  const key = `forja.sidebar.${section}`
  const panel = usePanelRef()
  const [open, setOpen] = useState(() => {
    const stored = layoutStorage.getItem(key)
    return stored === null ? defaultOpen : stored !== 'false'
  })
  const element = useRef<HTMLElement>(null)
  const [bodyHidden, setBodyHidden] = useState(!open)
  const toggle = (next: boolean) => {
    layoutStorage.setItem(key, String(next))
    animatePanes(element.current?.closest('[data-slot="resizable-panel-group"]'))
    setOpen(next)
  }
  useEffect(() => {
    if (open) {
      setBodyHidden(false)
      return
    }
    const timer = window.setTimeout(() => setBodyHidden(true), animationMs)
    return () => window.clearTimeout(timer)
  }, [open])
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
        // Follow collapses made by the group (a drag to the header, or too little height for
        // every pane) without storing them as the viewer's choice.
        const collapsed = panel.current?.isCollapsed() ?? !open
        if (collapsed === open) setOpen(!collapsed)
      }}
    >
      <section
        ref={element}
        data-slot="sidebar-pane"
        aria-labelledby={heading}
        className="group/pane flex h-full min-h-0 flex-col"
      >
        <div
          data-slot="pane-header"
          className="relative flex h-[22px] shrink-0 items-center pr-2 text-muted-foreground"
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
              <span
                data-slot="pane-count"
                className="ml-auto min-w-6 pl-2 text-right font-normal tabular-nums"
              >
                {count}
              </span>
            </button>
          </h2>
          {actions ? (
            // Actions sit left of the count on hover, covering the end of the title only.
            <div
              data-slot="pane-actions"
              className="invisible absolute inset-y-0 right-8 flex items-center gap-0.5 bg-sidebar pl-1 group-focus-within/pane:visible group-hover/pane:visible"
            >
              {actions}
            </div>
          ) : null}
        </div>
        <div id={id} data-slot="pane-body" hidden={bodyHidden} className="min-h-0 flex-1">
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
        'group/row relative flex h-[22px] items-center hover:bg-accent focus-within:bg-accent',
        current && 'bg-accent',
      )}
    >
      {children}
      {hover ? (
        <span
          data-slot="row-hover"
          className="pointer-events-none absolute inset-y-0 right-0 hidden items-center gap-1 bg-accent pl-1.5 pr-2 group-focus-within/row:flex group-hover/row:flex [&_button]:pointer-events-auto [&_[tabindex]]:pointer-events-auto"
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
