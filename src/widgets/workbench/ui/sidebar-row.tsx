import type { ReactNode } from 'react'
import { statusTone, type UiState } from '@/shared/ui'
import { cn } from '@/shared/ui/utils'

export interface SidebarRowProps {
  icon: ReactNode
  title: string
  detail?: string
  state?: UiState
  stateLabel?: string
  selected?: boolean
}

export function SidebarRow({
  icon,
  title,
  detail,
  state,
  stateLabel,
  selected = false,
}: SidebarRowProps) {
  const tone = state ? statusTone(state) : 'muted'

  return (
    <div
      data-selected={selected || undefined}
      className={cn(
        'flex h-8 items-center gap-2 rounded-[3px] border border-border bg-background px-2.5 text-[12px] text-foreground',
        selected && 'bg-secondary font-medium text-primary',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'shrink-0 [&_svg]:size-3.5',
          selected ? 'text-primary' : 'text-muted-foreground',
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate">
        {title}
        {detail ? <span className="ml-1.5 text-[11px] text-muted-foreground">{detail}</span> : null}
      </span>
      {stateLabel ? (
        <span
          className={cn(
            'shrink-0 text-[11px]',
            tone === 'accent' && 'text-primary',
            tone === 'danger' && 'text-destructive',
            tone === 'muted' && 'text-muted-foreground',
            !state && 'font-mono text-[10px] text-muted-foreground/60',
          )}
        >
          {stateLabel}
        </span>
      ) : null}
    </div>
  )
}
