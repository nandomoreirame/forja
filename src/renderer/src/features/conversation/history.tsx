import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Messages } from '@/widgets/conversation'
import {
  formatDuration,
  formatMessageTime,
  formatTokens,
  getDictionary,
  type Locale,
} from '@/shared/i18n'
import type { ChatMessage, RoleId } from '@/renderer/src/shared/api'
import { toolNames, type ToolId } from '@/shared/ui'
import { HandoffLink } from './handoff-link'

const highlightMs = 2000

function responseMeta(message: ChatMessage, tool: ToolId, locale: Locale) {
  const { usage, durationMs } = message
  if (!usage || durationMs === undefined) return undefined
  const r = getDictionary(locale).app.response
  const model = message.model ?? r.defaultModel
  const rows: [string, string][] = [
    [r.engine, toolNames[tool]],
    [r.model, model],
    [r.input, formatTokens(usage.input, locale)],
    [r.cached, formatTokens(usage.cached, locale)],
    [r.output, formatTokens(usage.output, locale)],
    [r.duration, formatDuration(durationMs)],
  ]
  const tokens = formatTokens(usage.input + usage.output, locale)
  return {
    label: r.details,
    summary: `${model} · ${tokens} tokens · ${formatDuration(durationMs)}`,
    rows,
  }
}

export function History({
  messages,
  locale,
  stage,
  toolFor,
  onViewRequest,
}: {
  messages: ChatMessage[]
  locale: Locale
  stage: RoleId
  /** Configured tool of a role, used when a reply has no stamped tool. */
  toolFor?: (role: RoleId) => ToolId | undefined
  onViewRequest?: (id: string) => void
}) {
  const viewport = useRef<HTMLDivElement>(null)
  const nearEnd = useRef(true)
  const [highlight, setHighlight] = useState<{ id: string; at: number } | null>(null)
  const highlightedId = highlight?.id ?? null
  useEffect(() => {
    if (!highlight) return
    const timer = setTimeout(() => setHighlight(null), highlightMs)
    return () => clearTimeout(timer)
  }, [highlight])
  const viewRequest = (id: string) => {
    const target = viewport.current?.querySelector<HTMLElement>(
      `[data-message-id="${CSS.escape(id)}"]`,
    )
    if (!target) return
    const reduced =
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
    nearEnd.current = false
    target.scrollIntoView?.({ block: 'center', behavior: reduced ? 'auto' : 'smooth' })
    setHighlight((current) => ({ id, at: (current?.at ?? 0) + 1 }))
    onViewRequest?.(id)
  }
  const d = getDictionary(locale)
  useLayoutEffect(() => {
    const node = viewport.current
    if (node && nearEnd.current) node.scrollTop = node.scrollHeight
  }, [messages])
  return (
    <div
      ref={viewport}
      className="min-h-0 flex-1 overflow-auto p-6"
      onScroll={() => {
        const node = viewport.current!
        nearEnd.current = node.scrollHeight - node.scrollTop - node.clientHeight <= 80
      }}
    >
      <Messages
        label={d.app.conversation}
        emptyLabel={d.product.empty}
        labels={{
          copyCode: d.app.copyCode,
          copied: d.app.copied,
          showAll: d.app.showAll,
          showLess: d.app.showLess,
          openImage: d.app.openImage,
          exit: d.app.exitCode,
        }}
        items={messages.map((m) => {
          const agent = m.role === 'agent' ? (m.author ?? stage) : undefined
          const tool = agent ? (m.tool ?? toolFor?.(agent)) : undefined
          return {
            id: m.id,
            agent,
            tool,
            toolLabel: tool ? toolNames[tool] : undefined,
            speaking: m.role === 'agent' && m.status === 'running',
            time: m.createdAt ? formatMessageTime(m.createdAt, locale) : undefined,
            dateTime: m.createdAt,
            response: tool ? responseMeta(m, tool, locale) : undefined,
            role: m.role,
            text: m.text,
            parts: m.parts,
            attachments: m.attachments,
            highlighted: m.id === highlightedId,
            author: m.role === 'user' ? d.app.you : d.product[m.author ?? stage],
            action:
              m.role === 'event' && m.linkTo ? (
                <HandoffLink
                  linkTo={m.linkTo}
                  label={d.app.viewRequest}
                  onViewRequest={viewRequest}
                />
              ) : undefined,
          }
        })}
      />
    </div>
  )
}
