import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Messages } from '@/widgets/conversation'
import { getDictionary, type Locale } from '@/shared/i18n'
import type { ChatMessage, RoleId } from '@/renderer/src/shared/api'
import { HandoffLink } from './handoff-link'

const highlightMs = 2000

export function History({
  messages,
  locale,
  stage,
  onViewRequest,
}: {
  messages: ChatMessage[]
  locale: Locale
  stage: RoleId
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
        items={messages.map((m) => ({
          id: m.id,
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
        }))}
      />
    </div>
  )
}
