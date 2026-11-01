import type { ReactNode } from 'react'
import { cn } from '@/shared/ui/utils'
import {
  AgentMascot,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
  type AgentRole,
  type ToolId,
} from '@/shared/ui'
import {
  defaultMessageLabels,
  MessageBody,
  type ImageAttachment,
  type MessageLabels,
  type MessagePart,
} from './message-parts'
import { TriangleAlert } from 'lucide-react'

export interface ConversationMessage {
  id: string
  author: string
  authorLabel?: string
  role: 'user' | 'agent' | 'event'
  text: string
  status?: string
  action?: ReactNode
  onAction?: () => void
  highlighted?: boolean
  parts?: MessagePart[]
  attachments?: ImageAttachment[]
  /** Agent replies only: the role drawn as a mascot and the tool that answered. */
  agent?: AgentRole
  tool?: ToolId
  toolLabel?: string
  speaking?: boolean
  /** Preformatted time label and its machine-readable value. */
  time?: string
  dateTime?: string
  /** Completed agent replies: compact summary and the detail rows behind it. */
  response?: { summary: string; label: string; rows: [string, string][] }
}

export interface MessagesProps {
  items: ConversationMessage[]
  emptyLabel?: string
  label?: string
  labels?: Partial<MessageLabels>
}

const rowProps = (item: ConversationMessage) => ({
  'data-message-id': item.id,
  'data-highlighted': item.highlighted ? 'true' : undefined,
})

function MessageTime({ item }: { item: ConversationMessage }) {
  return item.time ? (
    <time dateTime={item.dateTime} className="text-[11px] text-muted-foreground">
      {item.time}
    </time>
  ) : null
}

function ResponseMeta({ response }: { response: NonNullable<ConversationMessage['response']> }) {
  return (
    <Popover>
      <PopoverTrigger
        aria-label={`${response.label}: ${response.summary}`}
        className="rounded-sm text-[11px] text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
      >
        {response.summary}
      </PopoverTrigger>
      <PopoverContent align="start" aria-label={response.label} className="w-60 gap-1 text-[12px]">
        {response.rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-mono">{value}</span>
          </div>
        ))}
      </PopoverContent>
    </Popover>
  )
}

const highlightClass = 'ring-2 ring-primary/70 ring-offset-2 ring-offset-background'

export function Messages({
  items,
  emptyLabel = 'No conversation in this feature.',
  label = 'Conversation',
  labels,
}: MessagesProps) {
  const messageLabels = { ...defaultMessageLabels, ...labels }
  if (items.length === 0) {
    return (
      <p className="rounded-[3px] border border-border bg-card p-3 text-[12px] text-muted-foreground">
        {emptyLabel}
      </p>
    )
  }

  return (
    <TooltipProvider>
      <ol aria-label={label} className="space-y-3">
        {items.map((item) =>
          item.role === 'event' ? (
            <li
              key={item.id}
              {...rowProps(item)}
              className={cn(
                'flex items-center justify-between gap-3 rounded-[3px] border border-border bg-background p-2.5 text-[12px]',
                item.highlighted && highlightClass,
              )}
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
              {...rowProps(item)}
              className={cn(
                'space-y-1 rounded-[3px] border border-border bg-card p-3',
                item.highlighted && highlightClass,
              )}
            >
              <div className="flex items-baseline gap-2">
                <span
                  data-slot="message-author"
                  className="text-[13px] font-semibold text-foreground"
                >
                  {item.author}
                </span>
                <MessageTime item={item} />
              </div>
              <MessageBody
                text={item.text}
                parts={item.parts}
                attachments={item.attachments}
                labels={messageLabels}
              />
            </li>
          ) : (
            <li key={item.id} {...rowProps(item)} className="flex items-start gap-3">
              {item.agent && item.tool ? (
                <AgentMascot
                  role={item.agent}
                  tool={item.tool}
                  size={56}
                  speaking={item.speaking}
                />
              ) : null}
              {/* Speech bubble: the tail points at the mascot on the left. */}
              <div
                data-surface="reply"
                className={cn(
                  'relative min-w-0 flex-1 space-y-1 rounded-md bg-secondary p-3',
                  item.highlighted && highlightClass,
                )}
              >
                {item.agent && item.tool ? (
                  <span
                    aria-hidden="true"
                    data-slot="reply-tail"
                    className="absolute top-5 -left-1.5 size-3 rotate-45 bg-secondary"
                  />
                ) : null}
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-baseline gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          tabIndex={0}
                          aria-label={item.authorLabel}
                          data-slot="message-author"
                          className="rounded-sm text-[13px] font-semibold text-primary focus-visible:outline-2 focus-visible:outline-ring"
                        >
                          {item.author}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>{item.authorLabel ?? item.author}</TooltipContent>
                    </Tooltip>
                    {item.toolLabel ? <span className="sr-only"> ({item.toolLabel})</span> : null}
                    <MessageTime item={item} />
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
                        className="text-[11px] text-muted-foreground hover:text-destructive"
                      >
                        {item.action}
                      </button>
                    )
                  ) : null}
                </div>
                <MessageBody
                  text={item.text}
                  parts={item.parts}
                  attachments={item.attachments}
                  labels={messageLabels}
                />
                {item.response ? <ResponseMeta response={item.response} /> : null}
              </div>
            </li>
          ),
        )}
      </ol>
    </TooltipProvider>
  )
}
