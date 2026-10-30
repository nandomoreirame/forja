import type { ReactNode } from 'react'
import { Badge, Button, statusTone, type UiState } from '@/shared/ui'

export interface DocumentPreviewProps {
  name: string
  state: UiState
  stateLabel: string
  actionLabel?: string
  onAction?: () => void
  notice?: string
  children: ReactNode
}

export function DocumentPreview({
  name,
  state,
  stateLabel,
  actionLabel,
  onAction,
  notice,
  children,
}: DocumentPreviewProps) {
  return (
    <article
      aria-label={name}
      className="grid gap-3 rounded-md border border-border bg-background p-3"
    >
      <header className="flex items-center gap-2">
        <h3 className="font-mono text-[13px] text-foreground">{name}</h3>
        <Badge
          variant={statusTone(state) === 'danger' ? 'destructive' : 'outline'}
          className="text-[11px]"
        >
          {stateLabel}
        </Badge>
        {actionLabel ? (
          <Button size="sm" variant="outline" className="ml-auto" onClick={onAction}>
            {actionLabel}
          </Button>
        ) : null}
      </header>
      <div className="text-[13px] leading-6 text-foreground/90">{children}</div>
      {notice ? (
        <p
          role="status"
          className="rounded-md border border-border bg-muted px-3 py-2 text-[12px] text-muted-foreground"
        >
          {notice}
        </p>
      ) : null}
    </article>
  )
}
