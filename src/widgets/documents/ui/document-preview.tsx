import type { ReactNode } from 'react'
import { CircleCheck, Lock } from 'lucide-react'
import { Badge, Button, type UiState } from '@/shared/ui'

export interface DocumentPreviewProps {
  name: string
  stateLabel: string
  state?: UiState
  actionLabel?: string
  onAction?: () => void
  notice?: string
  noticeStatus?: string
  children?: ReactNode
}

export function DocumentPreview({
  name,
  stateLabel,
  actionLabel,
  onAction,
  notice,
  noticeStatus,
  children,
}: DocumentPreviewProps) {
  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-3 rounded-md border border-border bg-background px-4 py-3">
        <h3 className="font-mono text-[13px] text-foreground">{name}</h3>
        <Badge variant="outline" className="rounded-md text-[11px] text-muted-foreground">
          {stateLabel}
        </Badge>
        {actionLabel ? (
          <Button size="sm" className="ml-auto gap-1.5 rounded-md" onClick={onAction}>
            <CircleCheck />
            {actionLabel}
          </Button>
        ) : null}
      </div>
      {notice ? (
        <div
          role="status"
          className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-4 py-2.5 text-[12px] text-primary"
        >
          <Lock className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="flex-1">{notice}</span>
          {noticeStatus ? (
            <span className="text-[11px] text-muted-foreground">{noticeStatus}</span>
          ) : null}
        </div>
      ) : null}
      {children ? <div className="grid gap-3">{children}</div> : null}
    </div>
  )
}
