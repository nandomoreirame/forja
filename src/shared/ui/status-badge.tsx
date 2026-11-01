import type { ReactNode } from 'react'
import { Check, X } from 'lucide-react'
import { cn } from '@/shared/ui/utils'
import { statusTone, type UiState } from './status'

type Marker = 'dot' | 'check' | 'cross' | 'square'

const markers: Record<UiState, Marker> = {
  approved: 'dot',
  draft: 'dot',
  stale: 'dot',
  waiting: 'dot',
  running: 'dot',
  completed: 'check',
  failed: 'cross',
  interrupted: 'square',
}

const dotColor: Partial<Record<UiState, string>> = {
  approved: 'bg-success',
  stale: 'bg-destructive',
  running: 'bg-primary motion-safe:animate-pulse',
}

export interface StatusBadgeProps {
  state: UiState
  children: ReactNode
  /** `sm` fits dense sidebar rows and tab triggers. */
  size?: 'default' | 'sm'
  className?: string
}

export function StatusBadge({ state, children, size = 'default', className }: StatusBadgeProps) {
  const marker = markers[state]
  const tone = statusTone(state)
  const filled = state === 'running' || state === 'failed'

  return (
    <span
      data-slot="status-badge"
      data-state={state}
      data-tone={tone}
      data-marker={marker}
      data-size={size}
      className={cn(
        'inline-flex min-w-0 items-center rounded-[2px] border',
        size === 'sm' ? 'gap-1 px-1 py-0 text-[10px] leading-4' : 'gap-1.5 px-2 py-1 text-[11px]',
        filled && tone === 'accent' && 'border-primary/30 bg-primary/10 font-medium text-primary',
        filled && tone === 'danger' && 'border-destructive/30 bg-destructive/10 text-destructive',
        !filled && 'border-border bg-secondary text-muted-foreground',
        state === 'stale' && 'text-destructive',
        state === 'approved' && 'text-foreground',
        className,
      )}
    >
      {marker === 'check' ? (
        <Check className="size-3 shrink-0 text-success" aria-hidden="true" />
      ) : marker === 'cross' ? (
        <X className="size-3 shrink-0" aria-hidden="true" />
      ) : (
        <span
          aria-hidden="true"
          className={cn(
            'size-1.5 shrink-0',
            marker === 'square' ? 'rounded-none' : 'rounded-full',
            dotColor[state] ?? 'bg-muted-foreground',
          )}
        />
      )}
      <span className="truncate" title={typeof children === 'string' ? children : undefined}>
        {children}
      </span>
    </span>
  )
}
