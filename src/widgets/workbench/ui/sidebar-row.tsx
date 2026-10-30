import type { ReactNode } from 'react'
import { Badge, statusTone, type UiState } from '@/shared/ui'
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
        'flex h-8 items-center gap-2 rounded-md px-2 text-[13px] text-foreground/80',
        selected && 'bg-muted text-foreground',
      )}
    >
      <span aria-hidden="true" className="shrink-0 text-muted-foreground [&_svg]:size-4">
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate">
        {title}
        {detail ? <span className="ml-1.5 text-[11px] text-muted-foreground">{detail}</span> : null}
      </span>
      {state && stateLabel ? (
        <Badge variant={tone === 'danger' ? 'destructive' : 'outline'} className="text-[11px]">
          {stateLabel}
        </Badge>
      ) : null}
    </div>
  )
}
