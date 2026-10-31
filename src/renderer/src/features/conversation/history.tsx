import { useLayoutEffect, useRef } from 'react'
import { Messages } from '@/widgets/conversation'
import { getDictionary, type Locale } from '@/shared/i18n'
import type { ChatMessage, RoleId } from '@/renderer/src/shared/api'
import { HandoffLink } from './handoff-link'

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
        items={messages.map((m) => ({
          id: m.id,
          role: m.role,
          text: m.text,
          author: m.role === 'user' ? d.app.you : d.product[m.author ?? stage],
          action:
            m.role === 'event' && m.linkTo ? (
              <HandoffLink
                linkTo={m.linkTo}
                label={d.app.viewRequest}
                onViewRequest={onViewRequest}
              />
            ) : undefined,
        }))}
      />
    </div>
  )
}
