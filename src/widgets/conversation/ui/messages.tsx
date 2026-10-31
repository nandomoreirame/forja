import type { ReactNode } from 'react'
import { TriangleAlert } from 'lucide-react'

export interface ConversationMessage {
  id: string
  author: string
  role: 'user' | 'agent' | 'event'
  text: string
  status?: string
  action?: ReactNode
  onAction?: () => void
}

export interface MessagesProps {
  items: ConversationMessage[]
  emptyLabel?: string
  label?: string
}

export function Messages({
  items,
  emptyLabel = 'No conversation in this feature.',
  label = 'Conversation',
}: MessagesProps) {
  if (items.length === 0) {
    return (
      <p className="rounded-[3px] border border-border bg-card p-3 text-[12px] text-muted-foreground">
        {emptyLabel}
      </p>
    )
  }

  return (
    <ol aria-label={label} className="space-y-3">
      {items.map((item) =>
        item.role === 'event' ? (
          <li
            key={item.id}
            className="flex items-center justify-between gap-3 rounded-[3px] border border-border bg-background p-2.5 text-[12px]"
          >
            <span className="flex items-center gap-2 text-muted-foreground">
              <TriangleAlert className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
              {item.text}
            </span>
            {item.action ? (
              typeof item.action !== 'string' ? (
                item.action
              ) : (
                <button
                  type="button"
                  onClick={item.onAction}
                  className="shrink-0 text-[12px] font-medium text-primary hover:underline"
                >
                  {item.action}
                </button>
              )
            ) : null}
          </li>
        ) : item.role === 'user' ? (
          <li
            key={item.id}
            className="space-y-1 rounded-[3px] border border-border bg-secondary p-3"
          >
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="font-medium text-foreground">{item.author}</span>
            </div>
            <p className="text-[13px] text-foreground">{item.text}</p>
          </li>
        ) : (
          <li
            key={item.id}
            className="space-y-1 rounded-[3px] border border-border bg-background p-3"
          >
            <div className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2">
                <span className="font-medium text-primary">{item.author}</span>
                {item.status ? (
                  <span className="rounded-[2px] border border-primary/30 bg-primary/10 px-1.5 py-px text-[10px] text-primary">
                    {item.status}
                  </span>
                ) : null}
              </div>
              {item.action ? (
                typeof item.action !== 'string' ? (
                  item.action
                ) : (
                  <button
                    type="button"
                    onClick={item.onAction}
                    className="text-[11px] text-muted-foreground hover:text-[#ff4d4f]"
                  >
                    {item.action}
                  </button>
                )
              ) : null}
            </div>
            <p className="text-[13px] text-foreground">{item.text}</p>
          </li>
        ),
      )}
    </ol>
  )
}
