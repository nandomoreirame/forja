import { useId, useState, type ReactNode } from 'react'
import { Archive, ChevronDown, ChevronRight } from 'lucide-react'
import { layoutStorage } from '@/renderer/src/shared/lib/layout-storage'
import { Button, Tooltip, TooltipTrigger, TooltipContent } from '@/shared/ui'
import { getDictionary, type Locale } from '@/shared/i18n'

export function NavigatorSection({
  section,
  title,
  count,
  children,
  action,
  className = 'mx-3 flex min-h-0 shrink flex-col border-t border-border pt-3',
}: {
  section: string
  title: string
  count: number
  children: ReactNode
  action?: ReactNode
  className?: string
}) {
  const id = useId()
  const heading = useId()
  const key = `forja.sidebar.${section}`
  const [open, setOpen] = useState(() => layoutStorage.getItem(key) !== 'false')
  return (
    <section aria-labelledby={heading} className={className}>
      <div className="flex shrink-0 items-center gap-2">
        <h2 id={heading} className="min-w-0 flex-1">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={id}
            className="flex w-full items-center gap-1 pb-1 text-[11px] uppercase tracking-wider focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
            onClick={() => {
              layoutStorage.setItem(key, String(!open))
              setOpen(!open)
            }}
          >
            {open ? (
              <ChevronDown aria-hidden="true" className="size-3" />
            ) : (
              <ChevronRight aria-hidden="true" className="size-3" />
            )}
            {title} <span className="ml-auto">{count}</span>
          </button>
        </h2>
        {action}
      </div>
      <div id={id} hidden={!open} className={open ? 'flex min-h-0 flex-col' : undefined}>
        {children}
      </div>
    </section>
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
          className="shrink-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
        >
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            aria-describedby={disabled ? hint : undefined}
            disabled={disabled}
            onClick={onClick}
            className="size-6 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100"
          >
            <Archive aria-hidden="true" className="size-3" />
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
